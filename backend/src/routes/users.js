const express = require('express');
const bcrypt = require('bcrypt');
const { pool } = require('../db');

const router = express.Router();

function normalizeEmail(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (!s.includes('@')) return `${s}@zgroup.local`;
  return s;
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

async function countAdmins() {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n FROM users WHERE role = 'ADMIN'`
  );
  return rows[0].n;
}

// GET /api/users
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, role, created_at FROM users ORDER BY created_at ASC`
    );
    res.json(rows.map(mapUser));
  } catch (e) {
    next(e);
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, role, created_at FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(mapUser(rows[0]));
  } catch (e) {
    next(e);
  }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const role = String(req.body.role || 'COMERCIAL').toUpperCase();
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    if (!['ADMIN', 'COMERCIAL', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido (ADMIN, COMERCIAL, VIEWER)' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, hash, role]
    );
    res.status(201).json(mapUser(rows[0]));
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    next(e);
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const curRes = await pool.query(
      `SELECT id, email, role FROM users WHERE id = $1`,
      [id]
    );
    if (!curRes.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const cur = curRes.rows[0];

    const email = req.body.email != null ? normalizeEmail(req.body.email) : null;
    const password = req.body.password;
    const role = req.body.role != null ? String(req.body.role).toUpperCase() : null;

    if (role && !['ADMIN', 'COMERCIAL', 'VIEWER'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    const newRole = role || cur.role;
    if (cur.role === 'ADMIN' && newRole !== 'ADMIN') {
      const n = await countAdmins();
      if (n <= 1) {
        return res.status(400).json({ error: 'Debe existir al menos un administrador' });
      }
    }

    const parts = [];
    const vals = [];
    let i = 1;
    if (email) {
      parts.push(`email = $${i++}`);
      vals.push(email);
    }
    if (role) {
      parts.push(`role = $${i++}`);
      vals.push(role);
    }
    if (password != null && String(password).length > 0) {
      const hash = await bcrypt.hash(String(password), 12);
      parts.push(`password_hash = $${i++}`);
      vals.push(hash);
    }
    if (!parts.length) {
      const r = await pool.query(
        `SELECT id, email, role, created_at FROM users WHERE id = $1`,
        [id]
      );
      return res.json(mapUser(r.rows[0]));
    }
    vals.push(id);
    const q = `UPDATE users SET ${parts.join(', ')} WHERE id = $${i} RETURNING id, email, role, created_at`;
    const { rows } = await pool.query(q, vals);
    res.json(mapUser(rows[0]));
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    next(e);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const uRes = await pool.query(`SELECT id, role FROM users WHERE id = $1`, [id]);
    if (!uRes.rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    const u = uRes.rows[0];

    if (u.role === 'ADMIN') {
      const n = await countAdmins();
      if (n <= 1) {
        return res.status(400).json({ error: 'No se puede eliminar el único administrador' });
      }
    }

    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ deleted: true, id });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
