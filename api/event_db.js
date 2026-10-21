/**
 * event_db.js
 * ----------------------------------------------------------------------------
 * MySQL connection pool for the Charity Events API (Assessment 3).
 *
 * All database credentials are read from environment variables so the same
 * code works locally, in the university cPanel account, and in the GitHub
 * repository without leaking a password. Copy `.env.example` to `.env` and
 * fill in your own values (`.env` is ignored by git).
 * ----------------------------------------------------------------------------
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'charityevents_db',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  dateStrings: true,   // return DATE/DATETIME as plain strings -> no timezone drift
  charset: 'utf8mb4_general_ci'
});

/**
 * Quick connectivity check executed once on start-up. The result is printed in
 * the server log so a broken .env is obvious immediately.
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const [[row]] = await connection.query('SELECT DATABASE() AS db, VERSION() AS v');
    connection.release();
    console.log(`[db] connected to "${row.db}" (MySQL ${row.v})`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    console.error('[db] check DB_HOST / DB_USER / DB_PASSWORD / DB_NAME in your .env file');
  }
}

module.exports = { pool, testConnection };
