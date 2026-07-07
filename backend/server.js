// Long-running process entrypoint for LOCAL development and Railway deployments.
// On Vercel this file is NOT used — api/[[...]].js imports ./app instead.

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = require('./app');
const db = require('./database');
const cache = require('./cache');

const PORT = process.env.PORT || 3000;
let isShuttingDown = false;
let serverInstance = null;

// --- Static asset serving (local / Railway only) ---
const webPath = fs.existsSync(path.join(__dirname, 'web'))
  ? path.join(__dirname, 'web')
  : path.join(__dirname, '..', 'web');
app.use('/', express.static(webPath));
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// Local media availability (self-hosted video/audio)
app.get('/api/media/status', (req, res) => {
  const mediaDir = path.join(__dirname, 'media');
  const videoDir = path.join(mediaDir, 'video');
  const audioDir = path.join(mediaDir, 'audio');
  const videos = fs.existsSync(videoDir) ? fs.readdirSync(videoDir).filter((f) => f.endsWith('.mp4')) : [];
  const audios = fs.existsSync(audioDir)
    ? fs.readdirSync(audioDir).filter((f) => f.endsWith('.mp3') || f.endsWith('.m4a'))
    : [];
  res.json({
    hasLocalMedia: videos.length > 0 || audios.length > 0,
    videos: videos.map((f) => `/media/video/${f}`),
    audios: audios.map((f) => `/media/audio/${f}`),
    totalVideoMB: videos.reduce((s, f) => s + fs.statSync(path.join(videoDir, f)).size / 1024 / 1024, 0).toFixed(1),
    totalAudioMB: audios.reduce((s, f) => s + fs.statSync(path.join(audioDir, f)).size / 1024 / 1024, 0).toFixed(1),
  });
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  isShuttingDown = true;
  if (serverInstance) {
    serverInstance.close(() => {
      db.close(() => {
        cache.clear();
        console.log('Graceful shutdown complete.');
        process.exit(0);
      });
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

serverInstance = app.listen(PORT, () => {
  console.log(`AmbientTV backend running on http://localhost:${PORT} (${db.isTurso ? 'turso' : 'local-sqlite'})`);
  console.log('  GET  /                      (web app)');
  console.log('  GET  /admin                 (admin panel)');
  console.log('  POST /api/auth/register     (register)');
  console.log('  POST /api/auth/login        (login)');
  console.log('  GET  /api/auth/profile      (profile)');
  console.log('  GET  /api/user/favorites    (user favorites)');
  console.log('  GET  /api/user/history      (user history)');
  console.log('  GET  /api/health            (open)');
  console.log('  GET  /api/catalog           (open)');
});
