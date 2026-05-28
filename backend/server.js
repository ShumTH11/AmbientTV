require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { requireAuth } = require('./middleware/auth');
const { rateLimit } = require('./middleware/rateLimit');
const catalogRouter = require('./routes/catalog');
const searchRouter = require('./routes/search');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — allow Android TV app (adjust origin in production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check (open, no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiting to all API routes
app.use('/api', rateLimit);

// Public catalog (no auth required for browsing)
app.use('/api/catalog', catalogRouter);

// Protected search routes (use external API keys)
app.use('/api/search', requireAuth, searchRouter);

// Auth (register / login / profile)
app.use('/api/auth', authRouter);

// User data (favorites / history) — JWT protected
app.use('/api/user', userRouter);

// Admin panel (password-protected web UI)
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use('/api/admin', adminRouter);

// Web app (browser version)
app.use('/', express.static(path.join(__dirname, '..', 'web')));

// Static catalog JSON (optional direct access)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Global error handler — prevents crashes from unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`AmbientTV backend running on http://localhost:${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET /                      (web app)`);
  console.log(`  GET /admin                 (admin panel)`);
  console.log(`  POST /api/auth/register    (register)`);
  console.log(`  POST /api/auth/login       (login)`);
  console.log(`  GET  /api/auth/profile     (profile)`);
  console.log(`  GET  /api/user/favorites   (user favorites)`);
  console.log(`  GET  /api/user/history     (user history)`);
  console.log(`  GET  /api/admin/...        (admin api)`);
  console.log(`  GET  /api/health           (open)`);
  console.log(`  GET  /api/catalog          (open)`);
  console.log(`  GET  /api/search/...       (protected)`);
});
