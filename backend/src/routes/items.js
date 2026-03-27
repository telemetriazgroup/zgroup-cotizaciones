const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function mapItem(row) {
  return {
    id:        row.id,
    projectId: row.project_id,
    catalogId: row.catalog_id,
    code:      row.code,
    name:      row.name,
    cat:       row.cat,
    tipo:      row.tipo,
    unit:      row.unit,
    unitPrice: parseFloat(row.unit_price),
    qty:       parseFloat(row.qty),
    subtotal:  parseFloat(row.subtotal),
    sortOrder: parseInt(row.sort_order) || 0,
  };
}

// ── POST /api/projects/:id/items ──────────────────────────────────
router.post('/:id/items', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { id: itemId, catalogId = 'custom', code = 'CST',
            name, cat = 'Personalizado', tipo = 'ACTIVO',
            unit = 'und', unitPrice = 0, qty = 1, sortOrder = 0 } = req.body;

    if (!itemId || !name) return res.status(400).json({ error: 'itemId and name required' });

    const subtotal = (parseFloat(unitPrice) || 0) * (parseFloat(qty) || 1);

    const { rows } = await pool.query(
      `INSERT INTO project_items
         (id, project_id, catalog_id, code, name, cat, tipo, unit, unit_price, qty, subtotal, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [itemId, id, catalogId, code, name, cat, tipo, unit,
       unitPrice, qty, subtotal, sortOrder]
    );
    res.status(201).json(mapItem(rows[0]));
  } catch (err) { next(err); }
});

// ── PUT /api/projects/:id/items/:itemId ───────────────────────────
router.put('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { unitPrice, qty } = req.body;

    const subtotal = (parseFloat(unitPrice) || 0) * (parseFloat(qty) || 1);

    const { rows } = await pool.query(
      `UPDATE project_items
       SET unit_price = $3, qty = $4, subtotal = $5
       WHERE id = $1 AND project_id = $2
       RETURNING *`,
      [itemId, id, unitPrice, qty, subtotal]
    );
    if (!rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(mapItem(rows[0]));
  } catch (err) { next(err); }
});

// ── DELETE /api/projects/:id/items/:itemId ────────────────────────
router.delete('/:id/items/:itemId', async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { rowCount } = await pool.query(
      'DELETE FROM project_items WHERE id=$1 AND project_id=$2',
      [itemId, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Item not found' });
    res.json({ deleted: true, id: itemId });
  } catch (err) { next(err); }
});

// ── DELETE /api/projects/:id/items  (clear all) ───────────────────
router.delete('/:id/items', async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM project_items WHERE project_id=$1', [id]);
    res.json({ deleted: true, projectId: id });
  } catch (err) { next(err); }
});

module.exports = router;
