require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const { initDb }   = require('./db');
const projects     = require('./routes/projects');
const items        = require('./routes/items');
const plans        = require('./routes/plans');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' })); // large for base64 plans

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/projects', projects);
app.use('/api/projects', items);
app.use('/api/projects', plans);

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'ZGROUP Cotizaciones API', ts: new Date() })
);

// ── Error handler ─────────────────────────────────────────────────
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────────
async function start() {
  try {
    await initDb();
    app.listen(PORT, () =>
      console.log(`🚀  ZGROUP Backend  →  http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
