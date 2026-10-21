/**
 * routes/organisations.js
 * ----------------------------------------------------------------------------
 * Charity organisation resource (read only). The client "About" page and the
 * admin "New event" form need the list of organisations to choose from.
 *
 *   GET /api/organisations
 *   GET /api/organisations/:org_id
 * ----------------------------------------------------------------------------
 */
'use strict';

const express = require('express');
const { pool } = require('../event_db');
const { ok, fail } = require('../utils/respond');
const { num } = require('../utils/validation');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.org_id, o.org_name, o.mission, o.contact_email, o.contact_phone, o.website,
             COUNT(e.event_id) AS event_count,
             COALESCE(SUM(e.current_progress), 0) AS total_raised
        FROM charity_organisations o
        LEFT JOIN events e ON e.org_id = o.org_id AND e.is_suspended = 0
       GROUP BY o.org_id, o.org_name, o.mission, o.contact_email, o.contact_phone, o.website
       ORDER BY o.org_name ASC
    `);
    ok(res, rows, `${rows.length} organisations retrieved`, { count: rows.length });
  } catch (err) {
    console.error('[GET /api/organisations]', err);
    fail(res, 500, 'Server error while loading organisations.');
  }
});

router.get('/:org_id', async (req, res) => {
  try {
    const orgId = num(req.params.org_id);
    const [[row]] = await pool.query(
      `SELECT org_id, org_name, mission, contact_email, contact_phone, website
         FROM charity_organisations WHERE org_id = ?`, [orgId]
    );
    if (!row) return fail(res, 404, 'Organisation not found.');

    const [events] = await pool.query(
      `SELECT event_id, event_name, event_date, location, is_suspended
         FROM events WHERE org_id = ? ORDER BY event_date ASC`, [orgId]
    );
    ok(res, { ...row, events }, 'Organisation retrieved');
  } catch (err) {
    console.error('[GET /api/organisations/:id]', err);
    fail(res, 500, 'Server error while loading the organisation.');
  }
});

module.exports = router;
