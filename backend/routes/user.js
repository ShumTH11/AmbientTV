const express = require('express');
const db = require('../database');
const { requireUser } = require('../middleware/jwt');
const { sanitizeBody } = require('../middleware/sanitize');

const router = express.Router();

function validUrl(u) {
  return typeof u === 'string' && u.length > 0 && u.length < 2000;
}

// ---- Favorites ----
router.post('/favorites', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const { video_url, audio_url, title, category_id } = req.body || {};
  const v = video_url || '';
  const a = audio_url || '';
  if (!validUrl(v) && !validUrl(a)) {
    return res.status(400).json({ error: 'video_url or audio_url required' });
  }
  try {
    await db.run(
      'INSERT OR IGNORE INTO favorites (user_id, video_url, audio_url, title, category_id) VALUES (?, ?, ?, ?, ?)',
      [req.userId, v, a, title || '', category_id || '']
    );
    const row = await db.get(
      'SELECT * FROM favorites WHERE user_id = ? AND video_url = ? AND audio_url = ?',
      [req.userId, v, a]
    );
    res.json(row);
  } catch (err) {
    console.error('Add favorite error:', err.message);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.get('/favorites', requireUser, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get favorites error:', err.message);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

router.delete('/favorites', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const { video_url, audio_url } = req.body || {};
  const v = video_url || '';
  const a = audio_url || '';
  try {
    await db.run('DELETE FROM favorites WHERE user_id = ? AND video_url = ? AND audio_url = ?', [
      req.userId,
      v,
      a,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete favorite error:', err.message);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

// ---- History (upsert) ----
router.post('/history', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const { video_url, audio_url, title, category_id, progress = 0, duration = 0 } = req.body || {};
  const v = video_url || '';
  const a = audio_url || '';
  if (!validUrl(v) && !validUrl(a)) {
    return res.status(400).json({ error: 'video_url or audio_url required' });
  }
  try {
    const existing = await db.get(
      'SELECT id FROM history WHERE user_id = ? AND video_url = ? AND audio_url = ?',
      [req.userId, v, a]
    );
    if (existing) {
      await db.run(
        'UPDATE history SET title = ?, category_id = ?, progress = ?, duration = ?, watched_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title || '', category_id || '', progress, duration, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO history (user_id, video_url, audio_url, title, category_id, progress, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.userId, v, a, title || '', category_id || '', progress, duration]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Add history error:', err.message);
    res.status(500).json({ error: 'Failed to add history' });
  }
});

router.get('/history', requireUser, async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT * FROM history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 50',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get history error:', err.message);
    res.status(500).json({ error: 'Failed to load history' });
  }
});

// ---- Stats ----
router.get('/stats', requireUser, async (req, res) => {
  try {
    const [fav, pls, hist, last] = await Promise.all([
      db.get('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?', [req.userId]),
      db.get('SELECT COUNT(*) AS n FROM playlists WHERE user_id = ?', [req.userId]),
      db.get('SELECT COUNT(*) AS n FROM history WHERE user_id = ?', [req.userId]),
      db.get(
        'SELECT title, watched_at FROM history WHERE user_id = ? ORDER BY watched_at DESC LIMIT 1',
        [req.userId]
      ),
    ]);
    res.json({
      favorites: fav?.n || 0,
      playlists: pls?.n || 0,
      history: hist?.n || 0,
      lastWatched: last ? { title: last.title, at: last.watched_at } : null,
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = router;
