/**
 * routes/registrations.js
 * ----------------------------------------------------------------------------
 * Endpoints for the `registrations` resource (new in Assessment 3).
 *
 *   GET    /api/events/:event_id/registrations   registrations of one event (newest first)
 *   POST   /api/registrations                    register a user for an event
 *   DELETE /api/registrations/:registration_id   remove a registration (admin)
 *   GET    /api/registrations                    every registration (admin overview)
 *
 * Business rules enforced here:
 *   - ticket_quantity between 1 and 10, never above the seats remaining
 *   - a user (unique email) may join many events but only once per event
 *   - suspended events cannot be registered for
 *   - total_amount is calculated on the server from the current ticket price
 * ----------------------------------------------------------------------------
 */
'use strict';

const express = require('express');
const { pool } = require('../event_db');
const { ok, created, fail } = require('../utils/respond');
const { Validator, str, num } = require('../utils/validation');

const router = express.Router();

const MAX_TICKETS_PER_REGISTRATION = 10;

/* -------------------------------------------------------------------------- */
/* LIST                                                                       */
/* -------------------------------------------------------------------------- */

/** GET /api/events/:event_id/registrations - newest purchase first. */
router.get('/events/:event_id/registrations', async (req, res) => {
  const eventId = num(req.params.event_id);
  if (eventId === null) return fail(res, 400, 'Event id must be a number.');

  try {
    const [[event]] = await pool.query('SELECT event_id FROM events WHERE event_id = ?', [eventId]);
    if (!event) return fail(res, 404, `No event found with id ${eventId}.`);

    const [rows] = await pool.query(
      `SELECT registration_id, event_id, user_name, user_email, user_phone,
              ticket_quantity, total_amount, registration_date, notes
         FROM registrations
        WHERE event_id = ?
        ORDER BY registration_date DESC, registration_id DESC`,
      [eventId]
    );
    ok(res, rows, `${rows.length} registration(s) retrieved`, { count: rows.length });
  } catch (err) {
    console.error('[GET /api/events/:event_id/registrations]', err);
    fail(res, 500, 'Server error while loading registrations.');
  }
});

/**
 * GET /api/registrations?event_id= - admin overview across all events.
 * The exact path is given explicitly because this router is mounted at /api
 * (it also serves /api/events/:event_id/registrations).
 */
router.get('/registrations', async (req, res) => {
  try {
    let sql = `SELECT r.*, e.event_name, e.event_date, e.ticket_price, c.category_name
                 FROM registrations r
                 JOIN events e     ON e.event_id = r.event_id
                 JOIN categories c ON c.category_id = e.category_id`;
    const params = [];
    if (str(req.query.event_id)) {
      sql += ' WHERE r.event_id = ?';
      params.push(num(req.query.event_id));
    }
    sql += ' ORDER BY r.registration_date DESC, r.registration_id DESC';

    const [rows] = await pool.query(sql, params);
    ok(res, rows, `${rows.length} registration(s) retrieved`, { count: rows.length });
  } catch (err) {
    console.error('[GET /api/registrations]', err);
    fail(res, 500, 'Server error while loading registrations.');
  }
});

/* -------------------------------------------------------------------------- */
/* CREATE                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * POST /api/registrations
 * Body: { event_id, user_name, user_email, user_phone, ticket_quantity, notes? }
 * Called by the client-side Registration page.
 */
router.post('/registrations', async (req, res) => {
  const body = req.body || {};

  const v = new Validator()
    .number('event_id', body.event_id, 'Event', { min: 1, integer: true })
    .required('user_name', body.user_name, 'Full name')
    .minLength('user_name', body.user_name, 2, 'Full name')
    .maxLength('user_name', body.user_name, 120, 'Full name')
    .email('user_email', body.user_email, 'Email address')
    .maxLength('user_email', body.user_email, 150, 'Email address')
    .phone('user_phone', body.user_phone, 'Contact number')
    .number('ticket_quantity', body.ticket_quantity, 'Number of tickets', {
      min: 1, max: MAX_TICKETS_PER_REGISTRATION, integer: true
    });

  if (!v.valid) return fail(res, 400, 'Please correct the highlighted fields.', v.errors);

  const eventId = num(body.event_id);
  const quantity = num(body.ticket_quantity);

  try {
    const [[event]] = await pool.query(
      `SELECT event_id, event_name, event_date, ticket_price, capacity, is_suspended
         FROM events WHERE event_id = ?`,
      [eventId]
    );
    if (!event) {
      return fail(res, 400, 'Please correct the highlighted fields.', { event_id: 'Selected event does not exist.' });
    }
    if (Number(event.is_suspended) === 1) {
      return fail(res, 409, `"${event.event_name}" has been suspended and is not accepting registrations.`);
    }
    if (new Date(String(event.event_date).replace(' ', 'T')).getTime() < Date.now()) {
      return fail(res, 409, `"${event.event_name}" has already taken place and can no longer be booked.`);
    }

    // Duplicate registration guard (also enforced by a UNIQUE key in MySQL).
    const [[dupe]] = await pool.query(
      'SELECT registration_id FROM registrations WHERE event_id = ? AND user_email = ?',
      [eventId, str(body.user_email).toLowerCase()]
    );
    if (dupe) {
      return fail(res, 409,
        'This email address has already registered for this event. Each person may register only once per event.',
        { user_email: 'You have already registered for this event with this email.' });
    }

    // Seat availability.
    const [[sold]] = await pool.query(
      'SELECT COALESCE(SUM(ticket_quantity),0) AS tickets FROM registrations WHERE event_id = ?',
      [eventId]
    );
    const remaining = Number(event.capacity) - Number(sold.tickets);
    if (remaining <= 0) {
      return fail(res, 409, `"${event.event_name}" is sold out.`);
    }
    if (quantity > remaining) {
      return fail(res, 400, 'Please correct the highlighted fields.', {
        ticket_quantity: `Only ${remaining} ticket(s) remain for this event.`
      });
    }

    const totalAmount = Number((Number(event.ticket_price) * quantity).toFixed(2));

    const [result] = await pool.query(
      `INSERT INTO registrations
         (event_id, user_name, user_email, user_phone, ticket_quantity, total_amount, notes)
       VALUES (?,?,?,?,?,?,?)`,
      [
        eventId,
        str(body.user_name),
        str(body.user_email).toLowerCase(),
        str(body.user_phone),
        quantity,
        totalAmount,
        str(body.notes) || null
      ]
    );

    const [[row]] = await pool.query(
      `SELECT r.*, e.event_name, e.event_date, e.location
         FROM registrations r JOIN events e ON e.event_id = r.event_id
        WHERE r.registration_id = ?`,
      [result.insertId]
    );

    created(res, row, `Thank you ${row.user_name}, your registration for "${row.event_name}" is confirmed.`);
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return fail(res, 409, 'This email address has already registered for this event.',
        { user_email: 'You have already registered for this event with this email.' });
    }
    console.error('[POST /api/registrations]', err);
    fail(res, 500, 'Server error while saving your registration.');
  }
});

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * DELETE /api/registrations/:registration_id
 * Optional admin capability (the brief says it is not required, but it keeps
 * the admin site able to clean up test data).
 */
router.delete('/registrations/:registration_id', async (req, res) => {
  const id = num(req.params.registration_id);
  if (id === null) return fail(res, 400, 'Registration id must be a number.');

  try {
    const [[row]] = await pool.query(
      'SELECT registration_id, user_name FROM registrations WHERE registration_id = ?', [id]
    );
    if (!row) return fail(res, 404, `No registration found with id ${id}.`);

    await pool.query('DELETE FROM registrations WHERE registration_id = ?', [id]);
    ok(res, { registration_id: id }, `Registration of "${row.user_name}" was removed.`);
  } catch (err) {
    console.error('[DELETE /api/registrations/:registration_id]', err);
    fail(res, 500, 'Server error while removing the registration.');
  }
});

module.exports = router;
