const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'zgroup',
  password: process.env.DB_PASSWORD || 'zgroup123',
  database: process.env.DB_NAME || 'zgroup_cotizaciones',
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error', err);
});

async function seedAdmin() {
  const email = (process.env.ZGROUP_ADMIN_EMAIL || 'admin@zgroup.local').trim().toLowerCase();
  const plain = process.env.ZGROUP_ADMIN_PASSWORD || 'Admin123!';
  const { rows } = await pool.query('SELECT id FROM users LIMIT 1');
  if (rows.length) {
    await pool.query(
      `UPDATE projects SET owner_user_id = (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at LIMIT 1)
       WHERE owner_user_id IS NULL`
    );
    return;
  }
  const hash = await bcrypt.hash(plain, 12);
  const ins = await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'ADMIN') RETURNING id`,
    [email, hash]
  );
  const adminId = ins.rows[0].id;
  await pool.query('UPDATE projects SET owner_user_id = $1 WHERE owner_user_id IS NULL', [adminId]);
  console.log(`✔  Usuario ADMIN inicial: ${email} (cambiar contraseña en producción)`);
}

/** Superusuario predefinido: login "zgroup" o zgroup@zgroup.local — solo se crea si no existe. */
async function ensurePredefinedSuperuser() {
  const email = 'zgroup@zgroup.local';
  const plain = process.env.ZGROUP_SUPER_PASSWORD || '12345789';
  const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (rows.length) return;
  const hash = await bcrypt.hash(plain, 12);
  await pool.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'ADMIN')`,
    [email, hash]
  );
  console.log('✔  Superusuario predefinido: usuario zgroup · email zgroup@zgroup.local (cambiar contraseña en producción)');
}

async function seedCatalog() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM catalog_items');
  if (rows[0].n > 0) return;
  const { catalogSeed } = require('./seedCatalog');
  let order = 0;
  for (const it of catalogSeed) {
    await pool.query(
      `INSERT INTO catalog_items (id, code, name, cat, tipo, unit, price, detalle, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [it.id, it.code, it.name, it.cat, it.tipo, it.unit, it.price, it.detalle || '', order++]
    );
  }
  console.log(`✔  Catálogo sembrado: ${catalogSeed.length} ítems (Módulo 1)`);
}

async function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✔  Database schema initialized');
  await seedAdmin();
  await ensurePredefinedSuperuser();
  await seedCatalog();
}

module.exports = { pool, initDb };
