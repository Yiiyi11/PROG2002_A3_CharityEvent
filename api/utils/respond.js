/**
 * utils/respond.js
 * ----------------------------------------------------------------------------
 * A single response envelope used by every endpoint so the AngularJS services
 * only ever have to understand one shape:
 *
 *   { success: true,  data: <payload>, message: "...", count?: n }
 *   { success: false, data: null, message: "...", errors?: { field: msg } }
 * ----------------------------------------------------------------------------
 */
'use strict';

function ok(res, data, message = 'OK', extra = {}) {
  return res.json({ success: true, data, message, ...extra });
}

function created(res, data, message = 'Created') {
  return res.status(201).json({ success: true, data, message });
}

function fail(res, status, message, errors = undefined) {
  const body = { success: false, data: null, message };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

module.exports = { ok, created, fail };
