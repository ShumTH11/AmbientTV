const express = require('express');
const db = require('../database');
const { requireUser } = require('../middleware/jwt');

const router = express.Router();
router.use(requireUser);

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

module.exports = router;
