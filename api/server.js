/**
 * server.js
 * ----------------------------------------------------------------------------
 * Entry point of the Charity Events RESTful API (Assessment 3).
 *
 * Responsibilities
 *   1. Configure Express (JSON body parsing, CORS, security headers, logging).
 *   2. Mount the resource routers under /api.
 *   3. Serve the two AngularJS single-page applications from the same origin,
 *      so the deployment on the SCU cPanel only needs one Node process:
 *         /            -> client-side website  (client/)
 *         /admin/      -> admin-side website   (admin/)
 *   4. Provide a consistent JSON 404 and error handler.
 * ----------------------------------------------------------------------------
 */
'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./event_db');
const { fail } = require('./utils/respond');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = Number(process.env.PORT || 3000);

/* -------------------------------------------------------------------------- */
/* Middleware                                                                 */
/* -------------------------------------------------------------------------- */
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Minimal request logger: method, url, status and duration.
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[api] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - started}ms)`);
    }
  });
  next();
});

/* -------------------------------------------------------------------------- */
/* API routes                                                                 */
/* -------------------------------------------------------------------------- */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'up',
      node: process.version,
      uptime_seconds: Math.round(process.uptime())
    },
    message: 'Charity Events API is running'
  });
});

app.use('/api/events', require('./routes/events'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/organisations', require('./routes/organisations'));
app.use('/api/stats', require('./routes/stats'));
// Registration routes declare both /api/registrations and
// /api/events/:event_id/registrations, therefore mounted at /api.
app.use('/api', require('./routes/registrations'));

/* -------------------------------------------------------------------------- */
/* Static AngularJS websites                                                  */
/* -------------------------------------------------------------------------- */
const CLIENT_DIR = path.join(__dirname, '..', 'client');
const ADMIN_DIR = path.join(__dirname, '..', 'admin');

app.use('/admin', express.static(ADMIN_DIR));
app.use(express.static(CLIENT_DIR));   // must come last: it serves index.html at "/"

/* -------------------------------------------------------------------------- */
/* Fallbacks                                                                  */
/* -------------------------------------------------------------------------- */
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return fail(res, 404, `No API endpoint matches ${req.method} ${req.originalUrl}.`);
  }
  return res.status(404).sendFile(path.join(CLIENT_DIR, 'index.html'));
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return next(err);
  return fail(res, 500, 'Unexpected server error.');
});

/* -------------------------------------------------------------------------- */
/* Start                                                                      */
/* -------------------------------------------------------------------------- */
if (require.main === module) {
  testConnection();
  app.listen(PORT, () => {
    console.log('=========================================================');
    console.log(' Charity Events API (PROG2002 A3)');
    console.log(` Node ${process.version}`);
    console.log(` API         : http://localhost:${PORT}/api`);
    console.log(` Client site : http://localhost:${PORT}/`);
    console.log(` Admin site  : http://localhost:${PORT}/admin/`);
    console.log('=========================================================');
  });
}

module.exports = app;
