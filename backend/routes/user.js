const express = require('express');
const db = require('../database');
const { requireUser } = require('../middleware/jwt');
const { sanitizeBody } = require('../middleware/sanitize');

const router = express.Router();
router.use(requireUser);

// Apply input sanitization to all body routes
router.use(sanitizeBody);

// ========== FAVORITES ==========

// Get all favorites
router.get('/favorites', (req, res) => {
  db.all(
    'SELECT id, video_url, audio_url, title, category_id, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Add favorite
router.post('/favorites', express.json(), (req, res) => {
  const { video_url, audio_url, title, category_id } = req.body;
  if (!video_url || !audio_url) {
    return res.status(400).json({ error: 'video_url и audio_url обязательны' });
  }
  db.run(
    'INSERT OR REPLACE INTO favorites (user_id, video_url, audio_url, title, category_id) VALUES (?, ?, ?, ?, ?)',
    [req.userId, video_url, audio_url, title || '', category_id || ''],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, added: true });
    }
  );
});

// Remove favorite
router.delete('/favorites', express.json(), (req, res) => {
  const { video_url, audio_url } = req.body;
  db.run(
    'DELETE FROM favorites WHERE user_id = ? AND video_url = ? AND audio_url = ?',
    [req.userId, video_url, audio_url],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: this.changes > 0 });
    }
  );
});

// ========== HISTORY ==========

// Get history
router.get('/history', (req, res) => {
  db.all(
    'SELECT id, video_url, audio_url, title, category_id, progress, duration, watched_at FROM history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 50',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Add history entry
router.post('/history', express.json(), (req, res) => {
  const { video_url, audio_url, title, category_id, progress, duration } = req.body;
  if (!video_url || !audio_url) {
    return res.status(400).json({ error: 'video_url и audio_url обязательны' });
  }
  db.run(
    'INSERT INTO history (user_id, video_url, audio_url, title, category_id, progress, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, video_url, audio_url, title || '', category_id || '', progress || 0, duration || 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// Update progress
router.patch('/history/progress', express.json(), (req, res) => {
  const { video_url, audio_url, progress, duration } = req.body;
  db.run(
    'UPDATE history SET progress = ?, duration = ? WHERE user_id = ? AND video_url = ? AND audio_url = ? AND watched_at = (SELECT MAX(watched_at) FROM history WHERE user_id = ? AND video_url = ? AND audio_url = ?)',
    [progress || 0, duration || 0, req.userId, video_url, audio_url, req.userId, video_url, audio_url],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes > 0 });
    }
  );
});

// Clear history
router.delete('/history', (req, res) => {
  db.run('DELETE FROM history WHERE user_id = ?', [req.userId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// ========== RESUME / PROGRESS SYNC ==========

// Get last progress for a specific pair
router.get('/progress', (req, res) => {
  const { video_url, audio_url } = req.query;
  if (!video_url || !audio_url) {
    return res.status(400).json({ error: 'video_url и audio_url обязательны' });
  }
  db.get(
    'SELECT progress, duration FROM history WHERE user_id = ? AND video_url = ? AND audio_url = ? ORDER BY watched_at DESC LIMIT 1',
    [req.userId, video_url, audio_url],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row || { progress: 0, duration: 0 });
    }
  );
});

// Save progress (called periodically while playing)
router.post('/progress', express.json(), (req, res) => {
  const { video_url, audio_url, title, category_id, progress, duration } = req.body;
  if (!video_url || !audio_url) {
    return res.status(400).json({ error: 'video_url и audio_url обязательны' });
  }
  // Upsert: insert new or update existing latest entry
  db.get(
    'SELECT id FROM history WHERE user_id = ? AND video_url = ? AND audio_url = ? ORDER BY watched_at DESC LIMIT 1',
    [req.userId, video_url, audio_url],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run(
          'UPDATE history SET progress = ?, duration = ?, watched_at = CURRENT_TIMESTAMP WHERE id = ?',
          [progress || 0, duration || 0, row.id],
          function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ updated: true });
          }
        );
      } else {
        db.run(
          'INSERT INTO history (user_id, video_url, audio_url, title, category_id, progress, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.userId, video_url, audio_url, title || '', category_id || '', progress || 0, duration || 0],
          function(err2) {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({ id: this.lastID });
          }
        );
      }
    }
  );
});

// Get all recent progress (for cross-device sync)
router.get('/progress/all', (req, res) => {
  db.all(
    'SELECT video_url, audio_url, title, category_id, progress, duration, watched_at FROM history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 20',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

module.exports = router;
