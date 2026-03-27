const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { ACCESS_SECRET } = require('../middleware/auth');
const { revokeRefreshInCache, isRefreshRevokedInCache } = require('../redis');

const REFRESH_TTL_MS = parseInt(process.env.JWT_REFRESH_TTL_MS || String(7 * 24 * 60 * 60 * 1000), 10); // 7d
const ACCESS_TTL_SEC = parseInt(process.env.JWT_ACCESS_TTL_SEC || '900', 10); // 15 min
const COOKIE_NAME = 'refresh_token';

const router = express.Router();

/** Usuario corto "zgroup" → zgroup@zgroup.local */
function normalizeLoginEmail(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  if (!s.includes('@')) return `${s}@zgroup.local`;
  return s;
}

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL_SEC }
  );
}

function mapUser(row) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  };
}

/** POST /api/auth/login */
router.post('/login', async (req, res, next) => {
  try {
    const email = normalizeLoginEmail(req.body.email || req.body.user || '');
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1',
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const accessToken = signAccess({ id: u.id, email: u.email, role: u.role });

    const rawRefresh = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [u.id, tokenHash, expiresAt]
    );

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(COOKIE_NAME, rawRefresh, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TTL_MS,
    });

    res.json({
      accessToken,
      user: mapUser(u),
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/refresh */
router.post('/refresh', async (req, res, next) => {
  try {
    const rawRefresh = req.cookies[COOKIE_NAME];
    if (!rawRefresh || typeof rawRefresh !== 'string') {
      return res.status(401).json({ error: 'Sesión expirada', code: 'NO_REFRESH' });
    }

    const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');

    const { rows } = await pool.query(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.email, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Sesión expirada', code: 'REFRESH_INVALID' });
    }
    const row = rows[0];
    if (row.revoked_at) {
      return res.status(401).json({ error: 'Sesión expirada', code: 'REFRESH_REVOKED' });
    }
    if (new Date(row.expires_at) < new Date()) {
      return res.status(401).json({ error: 'Sesión expirada', code: 'REFRESH_EXPIRED' });
    }

    if (await isRefreshRevokedInCache(row.id)) {
      return res.status(401).json({ error: 'Sesión expirada', code: 'REFRESH_REVOKED' });
    }

    const accessToken = signAccess({
      id: row.user_id,
      email: row.email,
      role: row.role,
    });

    res.json({
      accessToken,
      user: { id: row.user_id, email: row.email, role: row.role },
    });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me */
router.get('/me', async (req, res, next) => {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado', code: 'NO_TOKEN' });
    }
    const token = h.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, ACCESS_SECRET);
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Token inválido', code: 'INVALID_TOKEN' });
    }
    const { rows } = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [payload.sub]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user: mapUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

/** POST /api/auth/logout */
router.post('/logout', async (req, res, next) => {
  try {
    const rawRefresh = req.cookies[COOKIE_NAME];
    if (rawRefresh && typeof rawRefresh === 'string') {
      const tokenHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
      const expRes = await pool.query(
        `UPDATE refresh_tokens SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL
         RETURNING id, expires_at`,
        [tokenHash]
      );
      if (expRes.rows.length) {
        const { id, expires_at: expAt } = expRes.rows[0];
        const exp = new Date(expAt);
        const ttlSec = Math.max(1, Math.ceil((exp.getTime() - Date.now()) / 1000));
        await revokeRefreshInCache(id, ttlSec);
      }
    }
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
