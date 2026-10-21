/**
 * routes/stats.js
 * ----------------------------------------------------------------------------
 * Aggregate figures powering the client Home page counters and the admin
 * dashboard. Keeping them in one endpoint avoids several round trips.
 *
 *   GET /api/stats
 * ----------------------------------------------------------------------------
 */
'use strict';

const express = require('express');
const { pool } = require('../event_db');
const { ok, fail } = require('../utils/respond');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [[events]] = await pool.query(`
      SELECT
        COUNT(*)                                                                  AS total_events,
        SUM(CASE WHEN is_suspended = 0 AND event_date >= NOW() THEN 1 ELSE 0 END)  AS active_events,
        SUM(CASE WHEN is_suspended = 0 AND event_date <  NOW() THEN 1 ELSE 0 END)  AS past_events,
        SUM(CASE WHEN is_suspended = 1 THEN 1 ELSE 0 END)                          AS suspended_events,
        COALESCE(SUM(charity_goal), 0)                                            AS total_goal,
        COALESCE(SUM(current_progress), 0)                                        AS total_raised
      FROM events
    `);

    const [[regs]] = await pool.query(`
      SELECT COUNT(*)                          AS total_registrations,
             COALESCE(SUM(ticket_quantity), 0) AS total_tickets,
             COALESCE(SUM(total_amount), 0)    AS total_ticket_value,
             COUNT(DISTINCT user_email)        AS unique_supporters
        FROM registrations
    `);

    const [perCategory] = await pool.query(`
      SELECT c.category_id, c.category_name,
             COUNT(e.event_id)                    AS event_count,
             COALESCE(SUM(e.current_progress), 0) AS raised
        FROM categories c
        LEFT JOIN events e ON e.category_id = c.category_id AND e.is_suspended = 0
       GROUP BY c.category_id, c.category_name
       ORDER BY raised DESC
    `);

    // Latest five registrations, used by the admin dashboard activity feed.
    const [recent] = await pool.query(`
      SELECT r.registration_id, r.user_name, r.ticket_quantity, r.total_amount,
             r.registration_date, e.event_name
        FROM registrations r
        JOIN events e ON e.event_id = r.event_id
       ORDER BY r.registration_date DESC, r.registration_id DESC
       LIMIT 5
    `);

    ok(res, { events, registrations: regs, perCategory, recentRegistrations: recent }, 'Statistics retrieved');
  } catch (err) {
    console.error('[GET /api/stats]', err);
    fail(res, 500, 'Server error while calculating statistics.');
  }
});

module.exports = router;
