require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
const PORT = process.env.PORT || 3000;

// Track server state for health checks and graceful shutdown
let isShuttingDown = false;
let serverInstance = null;

// CORS whitelist — configurable via env, defaults to common dev/prod origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080,http://localhost:3999,file://').split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: origin ${origin} not in ALLOWED_ORIGINS`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Trust proxy (required for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

// Health check (open, no auth required)
app.get('/api/health', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting_down',
      timestamp: new Date().toISOString()
    });
  }

  // Check database connectivity
  const dbHealthy = db.open;

  // Check cache
  const cacheHealthy = typeof cache.get === 'function' && typeof cache.set === 'function';

  const healthy = dbHealthy && cacheHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealthy ? 'ok' : 'error',
      cache: cacheHealthy ? 'ok' : 'error'
    }
  });
});

// Apply rate limiting per endpoint
// Health check has its own generous rate limit but is also checked above
app.use('/api/catalog', generous());
app.use('/api/auth/register', strict());
app.use('/api/auth/login', strict());
app.use('/api/auth', standard());
app.use('/api/user', standard());
app.use('/api/admin', standard());
app.use('/api/search', standard());

// Public catalog (no auth required for browsing)
app.use('/api/catalog', catalogRouter);

// Protected search routes (use external API keys)
app.use('/api/search', requireAuth, searchRouter);

// Auth (register / login / profile)
app.use('/api/auth', authRouter);

// User data (favorites / history / playlists) — JWT protected
app.use('/api/user', userRouter);
app.use('/api/user/playlists', playlistsRouter);

// Health monitoring (admin only)
app.use('/api/admin/health', healthRouter);

// Admin panel (password-protected web UI)
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use('/api/admin', adminRouter);

// Web app (browser version)
// Support both Docker layout (/app/web) and local dev layout (/project/web)
const webPath = fs.existsSync(path.join(__dirname, 'web'))
  ? path.join(__dirname, 'web')
  : path.join(__dirname, '..', 'web');
app.use('/', express.static(webPath));

// Static catalog JSON (optional direct access)
app.use('/static', express.static(path.join(__dirname, 'static')));

// Local media files (self-hosted video/audio)
app.use('/media', express.static(path.join(__dirname, 'media')));

// API: check if media is available locally
app.get('/api/media/status', (req, res) => {
  const mediaDir = path.join(__dirname, 'media');
  const videoDir = path.join(mediaDir, 'video');
  const audioDir = path.join(mediaDir, 'audio');

  const videos = fs.existsSync(videoDir) ? fs.readdirSync(videoDir).filter(f => f.endsWith('.mp4')) : [];
  const audios = fs.existsSync(audioDir) ? fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3') || f.endsWith('.m4a')) : [];

  res.json({
    hasLocalMedia: videos.length > 0 || audios.length > 0,
    videos: videos.map(f => `/media/video/${f}`),
    audios: audios.map(f => `/media/audio/${f}`),
    totalVideoMB: videos.reduce((sum, f) => sum + (fs.statSync(path.join(videoDir, f)).size / 1024 / 1024), 0).toFixed(1),
    totalAudioMB: audios.reduce((sum, f) => sum + (fs.statSync(path.join(audioDir, f)).size / 1024 / 1024), 0).toFixed(1)
  });
});

// Global error handler — prevents crashes from unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections
  if (serverInstance) {
    serverInstance.close(() => {
      console.log('HTTP server closed.');

      // Close database connection
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err.message);
        } else {
          console.log('Database connection closed.');
        }

        // Clear cache interval
        cache.clear();
        console.log('Cache cleared.');

        console.log('Graceful shutdown complete.');
        process.exit(0);
      });
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // Don't shut down immediately, just log
});

serverInstance = app.listen(PORT, () => {
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
