require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const projects = require('./routes/projects');
const items = require('./routes/items');
const plans = require('./routes/plans');
const { requireAuth } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => cb(null, true),
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// ── Public ────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', service: 'ZGROUP Cotizaciones API', ts: new Date() })
);

app.use('/api/auth', authRoutes);

// ── Protected ───────────────────────────────────────────────────────
app.use('/api/projects', requireAuth, projects);
app.use('/api/projects', requireAuth, items);
app.use('/api/projects', requireAuth, plans);

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
