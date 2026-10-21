/**
 * routes/categories.js
 * ----------------------------------------------------------------------------
 * Categories resource (read + admin CRUD, used by the admin Category page).
 *
 *   GET    /api/categories
 *   GET    /api/categories/:category_id
 *   POST   /api/categories
 *   PUT    /api/categories/:category_id
 *   DELETE /api/categories/:category_id   blocked while events use the category
 * ----------------------------------------------------------------------------
 */
'use strict';

const express = require('express');
const { pool } = require('../event_db');
const { ok, created, fail } = require('../utils/respond');
const { Validator, str, num } = require('../utils/validation');

const router = express.Router();

/** GET /api/categories - with an event count so the admin list is informative. */
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.category_id, c.category_name, c.description,
             COUNT(e.event_id) AS event_count
        FROM categories c
        LEFT JOIN events e ON e.category_id = c.category_id
       GROUP BY c.category_id, c.category_name, c.description
       ORDER BY c.category_name ASC
    `);
    ok(res, rows, `${rows.length} categories retrieved`, { count: rows.length });
  } catch (err) {
    console.error('[GET /api/categories]', err);
    fail(res, 500, 'Server error while loading categories.');
  }
});

router.get('/:category_id', async (req, res) => {
  try {
    const [[row]] = await pool.query(
      'SELECT category_id, category_name, description FROM categories WHERE category_id = ?',
      [num(req.params.category_id)]
    );
    if (!row) return fail(res, 404, 'Category not found.');
    ok(res, row, 'Category retrieved');
  } catch (err) {
    console.error('[GET /api/categories/:id]', err);
    fail(res, 500, 'Server error while loading the category.');
  }
});

/** POST /api/categories */
router.post('/', async (req, res) => {
  const body = req.body || {};
  const v = new Validator()
    .required('category_name', body.category_name, 'Category name')
    .maxLength('category_name', body.category_name, 100, 'Category name')
    .maxLength('description', body.description, 255, 'Description');
  if (!v.valid) return fail(res, 400, 'Please correct the highlighted fields.', v.errors);

  try {
    const [[dupe]] = await pool.query('SELECT category_id FROM categories WHERE category_name = ?', [str(body.category_name)]);
    if (dupe) return fail(res, 409, `The category "${str(body.category_name)}" already exists.`);

    const [result] = await pool.query(
      'INSERT INTO categories (category_name, description) VALUES (?,?)',
      [str(body.category_name), str(body.description) || null]
    );
    created(res, { category_id: result.insertId, category_name: str(body.category_name), description: str(body.description) },
      `Category "${str(body.category_name)}" was created.`);
  } catch (err) {
    console.error('[POST /api/categories]', err);
    fail(res, 500, 'Server error while creating the category.');
  }
});

/** PUT /api/categories/:category_id */
router.put('/:category_id', async (req, res) => {
  const id = num(req.params.category_id);
  const body = req.body || {};
  const v = new Validator()
    .required('category_name', body.category_name, 'Category name')
    .maxLength('category_name', body.category_name, 100, 'Category name')
    .maxLength('description', body.description, 255, 'Description');
  if (!v.valid) return fail(res, 400, 'Please correct the highlighted fields.', v.errors);

  try {
    const [[existing]] = await pool.query('SELECT category_id FROM categories WHERE category_id = ?', [id]);
    if (!existing) return fail(res, 404, 'Category not found.');

    const [[dupe]] = await pool.query(
      'SELECT category_id FROM categories WHERE category_name = ? AND category_id <> ?',
      [str(body.category_name), id]
    );
    if (dupe) return fail(res, 409, `Another category is already named "${str(body.category_name)}".`);

    await pool.query(
      'UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?',
      [str(body.category_name), str(body.description) || null, id]
    );
    ok(res, { category_id: id, category_name: str(body.category_name) }, 'Category updated.');
  } catch (err) {
    console.error('[PUT /api/categories/:id]', err);
    fail(res, 500, 'Server error while updating the category.');
  }
});

/** DELETE /api/categories/:category_id - blocked while events reference it. */
router.delete('/:category_id', async (req, res) => {
  const id = num(req.params.category_id);
  try {
    const [[existing]] = await pool.query('SELECT category_id, category_name FROM categories WHERE category_id = ?', [id]);
    if (!existing) return fail(res, 404, 'Category not found.');

    const [[used]] = await pool.query('SELECT COUNT(*) AS total FROM events WHERE category_id = ?', [id]);
    if (Number(used.total) > 0) {
      return fail(res, 409,
        `"${existing.category_name}" is used by ${used.total} event(s) and cannot be deleted.`);
    }

    await pool.query('DELETE FROM categories WHERE category_id = ?', [id]);
    ok(res, { category_id: id }, `Category "${existing.category_name}" was deleted.`);
  } catch (err) {
    console.error('[DELETE /api/categories/:id]', err);
    fail(res, 500, 'Server error while deleting the category.');
  }
});

module.exports = router;
