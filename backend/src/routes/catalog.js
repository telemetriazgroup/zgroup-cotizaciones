const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
router.use(requireAuth);

function mapRow(row) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    cat: row.cat,
    tipo: row.tipo,
    unit: row.unit,
    price: parseFloat(row.price),
    detalle: row.detalle || '',
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/catalog
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM catalog_items ORDER BY sort_order ASC, id ASC`
    );
    res.json(rows.map(mapRow));
  } catch (e) {
    next(e);
  }
});

// GET /api/catalog/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM catalog_items WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Ítem no encontrado' });
    res.json(mapRow(rows[0]));
  } catch (e) {
    next(e);
  }
});

// POST /api/catalog (ADMIN)
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const {
      id,
      code,
      name,
      cat,
      tipo = 'ACTIVO',
      unit = 'und',
      price = 0,
      detalle = '',
      sortOrder,
    } = req.body;
    if (!id || !code || !name || !cat) {
      return res.status(400).json({ error: 'id, code, name y cat son obligatorios' });
    }
    if (!['ACTIVO', 'CONSUMIBLE'].includes(String(tipo).toUpperCase())) {
      return res.status(400).json({ error: 'tipo debe ser ACTIVO o CONSUMIBLE' });
    }
    const allowedCats = ['Trab. Estructura', 'Sistema de Frio', 'Accesorios', 'Puertas'];
    if (!allowedCats.includes(cat)) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }
    const so = sortOrder != null ? parseInt(sortOrder, 10) : 9999;
    const { rows } = await pool.query(
      `INSERT INTO catalog_items (id, code, name, cat, tipo, unit, price, detalle, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [id, code, name, cat, String(tipo).toUpperCase(), unit, price, detalle, so]
    );
    res.status(201).json(mapRow(rows[0]));
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe un ítem con ese id' });
    next(e);
  }
});

// PUT /api/catalog/:id (ADMIN)
router.put('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const d = req.body;
    const cur = await pool.query(`SELECT id FROM catalog_items WHERE id = $1`, [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Ítem no encontrado' });

    const allowedCats = ['Trab. Estructura', 'Sistema de Frio', 'Accesorios', 'Puertas'];
    if (d.cat != null && !allowedCats.includes(d.cat)) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }
    if (d.tipo != null && !['ACTIVO', 'CONSUMIBLE'].includes(String(d.tipo).toUpperCase())) {
      return res.status(400).json({ error: 'tipo inválido' });
    }

    const parts = [];
    const vals = [];
    let i = 1;
    if (d.code !== undefined) {
      parts.push(`code = $${i++}`);
      vals.push(d.code);
    }
    if (d.name !== undefined) {
      parts.push(`name = $${i++}`);
      vals.push(d.name);
    }
    if (d.cat !== undefined) {
      parts.push(`cat = $${i++}`);
      vals.push(d.cat);
    }
    if (d.tipo !== undefined) {
      parts.push(`tipo = $${i++}`);
      vals.push(String(d.tipo).toUpperCase());
    }
    if (d.unit !== undefined) {
      parts.push(`unit = $${i++}`);
      vals.push(d.unit);
    }
    if (d.price !== undefined) {
      parts.push(`price = $${i++}`);
      vals.push(d.price);
    }
    if (d.detalle !== undefined) {
      parts.push(`detalle = $${i++}`);
      vals.push(d.detalle);
    }
    if (d.sortOrder !== undefined) {
      parts.push(`sort_order = $${i++}`);
      vals.push(parseInt(d.sortOrder, 10));
    }
    if (!parts.length) {
      const r = await pool.query(`SELECT * FROM catalog_items WHERE id = $1`, [id]);
      return res.json(mapRow(r.rows[0]));
    }
    parts.push('updated_at = NOW()');
    vals.push(id);
    const q = `UPDATE catalog_items SET ${parts.join(', ')} WHERE id = $${i} RETURNING *`;
    const { rows } = await pool.query(q, vals);
    res.json(mapRow(rows[0]));
  } catch (e) {
    next(e);
  }
});

// DELETE /api/catalog/:id (ADMIN)
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(`DELETE FROM catalog_items WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Ítem no encontrado' });
    res.json({ deleted: true, id: req.params.id });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
