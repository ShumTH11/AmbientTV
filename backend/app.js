// Express application factory used by BOTH:
//   - local / Railway  (server.js calls app.listen)
//   - Vercel Functions (api/[[...]].js exports this app)
//
// This module intentionally does NOT:
//   - serve static files (Vercel does that; local dev does it in server.js)
//   - call app.listen()
//   - register process-level signal handlers
// Those belong to server.js (the long-running process entrypoint).

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { strict, standard, generous } = require('./middleware/rate-limiter');

const { requireAuth } = require('./middleware/auth');
const catalogRouter = require('./routes/catalog');
const searchRouter = require('./routes/search');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const playlistsRouter = require('./routes/playlists');
const healthRouter = require('./routes/health');

const db = require('./database');
const cache = require('./cache');

const app = express();

// CORS whitelist — configurable via env, defaults to common dev/prod origins.
// On Vercel the frontend and API share the same origin, so `origin` is undefined
// and requests are allowed automatically.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0) return callback(null, true); // same-origin / open
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: origin ${origin} not in ALLOWED_ORIGINS`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Trust proxy (required for secure cookies behind reverse proxy / Vercel)
app.set('trust proxy', 1);

// Open health check
app.get('/api/health', (req, res) => {
  const dbHealthy = db.open;
  const cacheHealthy = typeof cache.get === 'function' && typeof cache.set === 'function';
  const healthy = dbHealthy && cacheHealthy;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    mode: db.isTurso ? 'turso' : 'local-sqlite',
    checks: {
      database: dbHealthy ? 'ok' : 'error',
      cache: cacheHealthy ? 'ok' : 'error',
    },
  });
});

// Rate limiting per endpoint
app.use('/api/catalog', generous());
app.use('/api/auth/register', strict());
app.use('/api/auth/login', strict());
app.use('/api/auth', standard());
app.use('/api/user', standard());
app.use('/api/admin', standard());
app.use('/api/search', standard());

// Routes
app.use('/api/catalog', catalogRouter);
app.use('/api/search', requireAuth, searchRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/user/playlists', playlistsRouter);
app.use('/api/admin/health', healthRouter);
app.use('/admin', adminRouter);
app.use('/api/uploads', require('./routes/uploads'));

// Global error handler — prevents crashes from unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

module.exports = app;
