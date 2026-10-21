/**
 * routes/events.js
 * ----------------------------------------------------------------------------
 * RESTful endpoints for the `events` resource.
 *
 *   GET    /api/events                     list (admin view, every status)
 *   GET    /api/events/home                public home-page list (non-suspended)
 *   GET    /api/events/search              public filtered search (date/location/category/keyword)
 *   GET    /api/events/:event_id           single event + its registrations (newest first)
 *   POST   /api/events                     create   (admin)
 *   PUT    /api/events/:event_id           update   (admin)
 *   DELETE /api/events/:event_id           delete   (admin, blocked when registrations exist)
 *
 * HTTP status codes follow REST conventions:
 *   200 read/update OK, 201 created, 400 validation error,
 *   404 unknown id, 409 integrity conflict (duplicate name / has registrations),
 *   500 unexpected server error.
 * ----------------------------------------------------------------------------
 */
'use strict';

const express = require('express');
const { pool } = require('../event_db');
const { ok, created, fail } = require('../utils/respond');
const { Validator, str, num, toMysqlDateTime } = require('../utils/validation');

const router = express.Router();

/** Columns shared by the list/detail queries. */
const EVENT_SELECT = `
  SELECT e.event_id, e.org_id, e.category_id, e.event_name, e.description,
         e.event_date, e.location, e.latitude, e.longitude, e.ticket_price,
         e.capacity, e.charity_goal, e.current_progress, e.is_suspended,
         e.event_image_url,
         c.category_name,
         o.org_name, o.contact_email AS org_email, o.mission AS org_mission
    FROM events e
    JOIN categories c            ON c.category_id = e.category_id
    JOIN charity_organisations o ON o.org_id      = e.org_id
`;

/** Add derived, presentation-only fields the client can use directly. */
function decorateEvent(row) {
  const now = new Date();
  const when = new Date(String(row.event_date).replace(' ', 'T'));
  const isPast = when.getTime() < now.getTime();
  const sold = Number(row.tickets_sold || 0);
  const capacity = Number(row.capacity || 0);
  const price = Number(row.ticket_price || 0);

  return {
    ...row,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    ticket_price: price,
    capacity,
    charity_goal: Number(row.charity_goal || 0),
    current_progress: Number(row.current_progress || 0),
    is_suspended: Boolean(row.is_suspended),
    tickets_sold: sold,
    seats_remaining: Math.max(capacity - sold, 0),
    progress_percent: Number(row.charity_goal) > 0
      ? Math.min(Math.round((Number(row.current_progress) / Number(row.charity_goal)) * 100), 100)
      : 0,
    status: row.is_suspended ? 'Suspended' : (isPast ? 'Past' : 'Active')
  };
}

/**
 * Aggregate the ticket sales of every event once, then join them in memory.
 * Keeps the query count at two instead of one sub-query per row.
 */
async function fetchTicketTotals() {
  const [rows] = await pool.query(`
    SELECT event_id,
           COUNT(*)                        AS registration_count,
           COALESCE(SUM(ticket_quantity),0) AS tickets_sold
      FROM registrations
     GROUP BY event_id
  `);
  const map = new Map();
  rows.forEach((r) => map.set(r.event_id, r));
  return map;
}

function attachTotals(rows, totals) {
  return rows.map((row) => {
    const t = totals.get(row.event_id) || { registration_count: 0, tickets_sold: 0 };
    return decorateEvent({ ...row, ...t });
  });
}

/* -------------------------------------------------------------------------- */
/* READ                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * GET /api/events/home
 * Public home page feed: every event that has not been suspended, ordered by
 * date. The client groups them into "Upcoming" and "Past" sections.
 */
router.get('/home', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `${EVENT_SELECT} WHERE e.is_suspended = 0 ORDER BY e.event_date ASC`
    );
    const totals = await fetchTicketTotals();
    ok(res, attachTotals(rows, totals),
      `${rows.length} non-suspended event(s) retrieved for the home page`, { count: rows.length });
  } catch (err) {
    console.error('[GET /api/events/home]', err);
    fail(res, 500, 'Server database error while loading the home page events.');
  }
});

/**
 * GET /api/events/search?date=&location=&category_id=&keyword=&include_past=
 * Public filtered search. Every filter is optional and combined with AND, which
 * is what the Search page relies on when the user narrows the results down.
 */
router.get('/search', async (req, res) => {
  try {
    const { date, location, category_id, keyword, include_past, sort } = req.query;
    let sql = `${EVENT_SELECT} WHERE e.is_suspended = 0 `;
    const params = [];

    if (str(date)) {
      sql += ' AND DATE(e.event_date) = ? ';
      params.push(str(date));
    }
    if (str(location)) {
      sql += ' AND (e.location LIKE ? OR o.org_name LIKE ?) ';
      params.push(`%${str(location)}%`, `%${str(location)}%`);
    }
    if (str(category_id)) {
      const catId = num(category_id);
      if (catId === null) return fail(res, 400, 'category_id must be a number.');
      sql += ' AND e.category_id = ? ';
      params.push(catId);
    }
    if (str(keyword)) {
      sql += ' AND (e.event_name LIKE ? OR e.description LIKE ?) ';
      params.push(`%${str(keyword)}%`, `%${str(keyword)}%`);
    }
    if (str(include_past) !== 'true') {
      sql += ' AND e.event_date >= NOW() ';
    }

    const orderBy = str(sort) === 'date_desc' ? 'DESC' : 'ASC';
    sql += ` ORDER BY e.event_date ${orderBy} `;

    const [rows] = await pool.query(sql, params);
    const totals = await fetchTicketTotals();
    ok(res, attachTotals(rows, totals),
      `${rows.length} matching event(s) found`, { count: rows.length });
  } catch (err) {
    console.error('[GET /api/events/search]', err);
    fail(res, 500, 'Search failed because of a server database error.');
  }
});

/**
 * GET /api/events
 * Admin listing: every event regardless of status (Active / Past / Suspended),
 * plus the registration totals the dashboard needs.
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`${EVENT_SELECT} ORDER BY e.event_date ASC`);
    const totals = await fetchTicketTotals();
    const data = attachTotals(rows, totals);

    // Optional convenience filters for the admin table.
    const status = str(req.query.status);
    const filtered = status && status !== 'All'
      ? data.filter((e) => e.status === status)
      : data;

    ok(res, filtered, `${filtered.length} event(s) retrieved for administration`, { count: filtered.length });
  } catch (err) {
    console.error('[GET /api/events]', err);
    fail(res, 500, 'Server database error while listing events.');
  }
});

/**
 * GET /api/events/:event_id
 * Improved single-event endpoint (Part 2 requirement): it returns the event
 * details AND the complete list of registrations for that event, sorted by the
 * latest purchase date first. The client Event Detail page renders both.
 */
router.get('/:event_id', async (req, res) => {
  const eventId = num(req.params.event_id);
  if (eventId === null) return fail(res, 400, 'Event id must be a number.');

  try {
    const [rows] = await pool.query(`${EVENT_SELECT} WHERE e.event_id = ?`, [eventId]);
    if (rows.length === 0) return fail(res, 404, `No event found with id ${eventId}.`);

    const [registrations] = await pool.query(
      `SELECT registration_id, event_id, user_name, user_email, user_phone,
              ticket_quantity, total_amount, registration_date, notes
         FROM registrations
        WHERE event_id = ?
        ORDER BY registration_date DESC, registration_id DESC`,
      [eventId]
    );

    const ticketsSold = registrations.reduce((sum, r) => sum + Number(r.ticket_quantity), 0);
    const event = decorateEvent({
      ...rows[0],
      registration_count: registrations.length,
      tickets_sold: ticketsSold
    });
    event.registrations = registrations;
    event.registration_count = registrations.length;

    ok(res, event, 'Event detail with its registrations retrieved', { count: registrations.length });
  } catch (err) {
    console.error('[GET /api/events/:event_id]', err);
    fail(res, 500, 'Server database error while loading the event detail.');
  }
});

/* -------------------------------------------------------------------------- */
/* CREATE / UPDATE / DELETE                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Shared validation for POST and PUT. `existing` lets PUT ignore a duplicate
 * name that belongs to the event being edited.
 */
async function validateEventPayload(body) {
  const v = new Validator()
    .required('event_name', body.event_name, 'Event name')
    .maxLength('event_name', body.event_name, 200, 'Event name')
    .required('description', body.description, 'Description')
    .minLength('description', body.description, 15, 'Description')
    .required('location', body.location, 'Location')
    .maxLength('location', body.location, 200, 'Location')
    .dateTime('event_date', body.event_date, 'Event date')
    .number('org_id', body.org_id, 'Organisation', { min: 1, integer: true })
    .number('category_id', body.category_id, 'Category', { min: 1, integer: true })
    .number('ticket_price', body.ticket_price, 'Ticket price', { min: 0, max: 100000 })
    .number('capacity', body.capacity, 'Capacity', { min: 1, max: 100000, integer: true })
    .number('charity_goal', body.charity_goal, 'Charity goal', { min: 0, max: 100000000 })
    .number('current_progress', body.current_progress, 'Current progress', { min: 0, max: 100000000, required: false })
    .number('latitude', body.latitude, 'Latitude', { min: -90, max: 90, required: false })
    .number('longitude', body.longitude, 'Longitude', { min: -180, max: 180, required: false });

  // Latitude and longitude must be supplied as a pair for the weather API.
  const hasLat = str(body.latitude) !== '';
  const hasLng = str(body.longitude) !== '';
  if (hasLat !== hasLng) {
    v.errors.latitude = 'Latitude and longitude must be provided together (used by the weather API).';
  }

  // Foreign keys must exist, otherwise MySQL would throw a raw FK error.
  if (!v.errors.org_id) {
    const [[org]] = await pool.query('SELECT org_id FROM charity_organisations WHERE org_id = ?', [num(body.org_id)]);
    if (!org) v.errors.org_id = 'Selected organisation does not exist.';
  }
  if (!v.errors.category_id) {
    const [[cat]] = await pool.query('SELECT category_id FROM categories WHERE category_id = ?', [num(body.category_id)]);
    if (!cat) v.errors.category_id = 'Selected category does not exist.';
  }

  return v;
}

/** Build the parameter array shared by INSERT and UPDATE. */
function eventParams(body) {
  return [
    num(body.org_id),
    num(body.category_id),
    str(body.event_name),
    str(body.description),
    toMysqlDateTime(body.event_date),
    str(body.location),
    str(body.latitude) === '' ? null : num(body.latitude),
    str(body.longitude) === '' ? null : num(body.longitude),
    num(body.ticket_price) || 0,
    num(body.capacity) || 1,
    num(body.charity_goal) || 0,
    num(body.current_progress) || 0,
    body.is_suspended === true || body.is_suspended === 'true' || body.is_suspended === 1 ? 1 : 0,
    str(body.event_image_url) || null
  ];
}

/**
 * POST /api/events
 * Insert a new charity event (admin "New event" form).
 */
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const v = await validateEventPayload(body);
    if (!v.valid) return fail(res, 400, 'Please correct the highlighted fields.', v.errors);

    // Friendly duplicate-name check instead of exposing a raw SQL error.
    const [[dupe]] = await pool.query(
      'SELECT event_id FROM events WHERE event_name = ?',
      [str(body.event_name)]
    );
    if (dupe) return fail(res, 409, `An event named "${str(body.event_name)}" already exists.`);

    const sql = `INSERT INTO events
        (org_id, category_id, event_name, description, event_date, location,
         latitude, longitude, ticket_price, capacity, charity_goal,
         current_progress, is_suspended, event_image_url)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
    const [result] = await pool.query(sql, eventParams(body));

    const [rows] = await pool.query(`${EVENT_SELECT} WHERE e.event_id = ?`, [result.insertId]);
    created(res, decorateEvent({ ...rows[0], registration_count: 0, tickets_sold: 0 }),
      `Event "${rows[0].event_name}" was created successfully.`);
  } catch (err) {
    console.error('[POST /api/events]', err);
    fail(res, 500, 'Server error while creating the event.');
  }
});

/**
 * PUT /api/events/:event_id
 * Update an existing event (admin "Edit event" form).
 */
router.put('/:event_id', async (req, res) => {
  const eventId = num(req.params.event_id);
  if (eventId === null) return fail(res, 400, 'Event id must be a number.');

  try {
    const [[existing]] = await pool.query('SELECT event_id, event_name FROM events WHERE event_id = ?', [eventId]);
    if (!existing) return fail(res, 404, `No event found with id ${eventId}.`);

    const body = req.body || {};
    const v = await validateEventPayload(body);
    if (!v.valid) return fail(res, 400, 'Please correct the highlighted fields.', v.errors);

    const [[dupe]] = await pool.query(
      'SELECT event_id FROM events WHERE event_name = ? AND event_id <> ?',
      [str(body.event_name), eventId]
    );
    if (dupe) return fail(res, 409, `Another event is already named "${str(body.event_name)}".`);

    // Capacity can never be reduced below the tickets already sold.
    const [[sold]] = await pool.query(
      'SELECT COALESCE(SUM(ticket_quantity),0) AS tickets FROM registrations WHERE event_id = ?',
      [eventId]
    );
    const capacity = num(body.capacity) || 1;
    if (capacity < Number(sold.tickets)) {
      return fail(res, 400, 'Please correct the highlighted fields.', {
        capacity: `Capacity cannot be lower than the ${sold.tickets} ticket(s) already sold for this event.`
      });
    }

    const sql = `UPDATE events SET
          org_id = ?, category_id = ?, event_name = ?, description = ?,
          event_date = ?, location = ?, latitude = ?, longitude = ?,
          ticket_price = ?, capacity = ?, charity_goal = ?, current_progress = ?,
          is_suspended = ?, event_image_url = ?
        WHERE event_id = ?`;
    await pool.query(sql, [...eventParams(body), eventId]);

    const [rows] = await pool.query(`${EVENT_SELECT} WHERE e.event_id = ?`, [eventId]);
    const totals = await fetchTicketTotals();
    ok(res, attachTotals(rows, totals)[0], `Event "${rows[0].event_name}" was updated successfully.`);
  } catch (err) {
    console.error('[PUT /api/events/:event_id]', err);
    fail(res, 500, 'Server error while updating the event.');
  }
});

/**
 * DELETE /api/events/:event_id
 * Data-integrity rule from the brief: an event may only be deleted when it has
 * not received any registrations. Otherwise the request is blocked with a 409
 * and a message the admin interface can display verbatim.
 */
router.delete('/:event_id', async (req, res) => {
  const eventId = num(req.params.event_id);
  if (eventId === null) return fail(res, 400, 'Event id must be a number.');

  try {
    const [[existing]] = await pool.query('SELECT event_id, event_name FROM events WHERE event_id = ?', [eventId]);
    if (!existing) return fail(res, 404, `No event found with id ${eventId}.`);

    const [[regs]] = await pool.query(
      'SELECT COUNT(*) AS total FROM registrations WHERE event_id = ?',
      [eventId]
    );

    if (Number(regs.total) > 0) {
      return fail(res, 409,
        `"${existing.event_name}" cannot be deleted because it already has ${regs.total} registration(s). ` +
        'Suspend the event instead, or remove the registrations first.',
        { registration_count: Number(regs.total) });
    }

    await pool.query('DELETE FROM events WHERE event_id = ?', [eventId]);
    ok(res, { event_id: eventId }, `Event "${existing.event_name}" was deleted successfully.`);
  } catch (err) {
    if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
      return fail(res, 409, 'This event still has registrations and cannot be deleted.');
    }
    console.error('[DELETE /api/events/:event_id]', err);
    fail(res, 500, 'Server error while deleting the event.');
  }
});

module.exports = router;
