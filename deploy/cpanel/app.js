/**
 * app.js — cPanel (Passenger) entry point
 * ----------------------------------------------------------------------------
 * cPanel's "Setup Node.js App" feature launches a single file, which is called
 * app.js by default. Phusion Passenger loads that file and expects it to simply
 * export the Express application — Passenger binds the port and the domain
 * itself, so the app must NOT call listen() in that situation.
 *
 * No code is duplicated here: api/server.js already exports the Express `app`
 * and only calls app.listen() when it is executed directly. This file therefore
 * works in both directions:
 *
 *   • Under Passenger (cPanel)  -> module.exports is used, no port is bound.
 *   • `node app.js` over SSH    -> the require.main block below starts a normal
 *                                  HTTP server, which is handy for testing the
 *                                  exact build that was uploaded.
 * ----------------------------------------------------------------------------
 */
'use strict';

const app = require('./api/server');

module.exports = app;

if (require.main === module) {
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () => {
    console.log('=========================================================');
    console.log(' Charity Events API (PROG2002 A3) - cPanel build');
    console.log(` Node ${process.version} - standalone mode (not Passenger)`);
    console.log(` API    : http://localhost:${PORT}/api`);
    console.log(` Client : http://localhost:${PORT}/`);
    console.log(` Admin  : http://localhost:${PORT}/admin/`);
    console.log('=========================================================');
  });
}
