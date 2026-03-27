const { Pool } = require('pg');
const fs        = require('fs');
const path      = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  user:     process.env.DB_USER     || 'zgroup',
  password: process.env.DB_PASSWORD || 'zgroup123',
  database: process.env.DB_NAME     || 'zgroup_cotizaciones',
});

pool.on('error', (err) => {
  console.error('Unexpected DB client error', err);
});

async function initDb() {
  const schema = fs.readFileSync(
    path.join(__dirname, 'schema.sql'),
    'utf8'
  );
  await pool.query(schema);
  console.log('✔  Database schema initialized');
}

module.exports = { pool, initDb };
