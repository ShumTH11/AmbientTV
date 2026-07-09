const express = require('express');
const db = require('../database');
const { requireUser } = require('../middleware/jwt');
const { sanitizeBody } = require('../middleware/sanitize');

const router = express.Router();

/**
 * Build a Scene object from a favorites/history row.
 * Falls back to legacy video_url/audio_url columns for rows created before this update.
 */
function rowToScene(row) {
  if (!row) return null;
  // New format: video_url contains serialized JSON Scene
  if (row.video_url && row.video_url.startsWith('{')) {
    try {
      return JSON.parse(row.video_url);
    } catch { /* fall through */ }
  }
  // Legacy format: reconstruct from individual columns
  return {
    source: row.video_url ? 'uploads' : 'presets',
    ref: row.video_url || row.audio_url || row.title || '',
    video_url: row.video_url || undefined,
    audio_url: row.audio_url || undefined,
    title: row.title || 'Без названия',
    thumbnail: undefined,
    image: undefined,
    categoryId: row.category_id || undefined,
  };
}

/**
 * Extract a serializable scene key from a Scene object for deduplication.
 */
function sceneRef(scene) {
  if (!scene) return null;
  if (scene.ref) return `${scene.source || 'unknown'}:${scene.ref}`;
  if (scene.video_url) return `uploads:${scene.video_url}`;
  if (scene.audio_url) return `presets:${scene.audio_url}`;
  return null;
}

// ---- Favorites ----
router.post('/favorites', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const scene = req.body?.scene || req.body;
  if (!scene) return res.status(400).json({ error: 'scene required' });

  const key = sceneRef(scene);
  if (!key) return res.status(400).json({ error: 'Could not determine scene reference' });

  // Store full scene as JSON (works for YouTube, Rutube, uploads, presets)
  const sceneJson = JSON.stringify(scene);

  try {
    // Check if this exact scene key is already favorited
    console.log('[user.fav POST] userId=' + req.userId + ' key=' + key + ' title=' + (scene.title || ''));
    const existing = await db.get(
      'SELECT * FROM favorites WHERE user_id = ? AND video_url = ?',
      [req.userId, key]
    );
    console.log('[user.fav POST] existing=' + (existing ? existing.id + ' video_url=' + existing.video_url : null));
    if (existing) {
      // Same scene already favorited — refresh timestamp only
      await db.run(
        'UPDATE favorites SET title = ?, category_id = ?, created_at = ? WHERE user_id = ? AND video_url = ?',
        [scene.title || '', scene.categoryId || '', new Date().toISOString(), req.userId, key]
      );
      console.log('[user.fav POST] UPDATE done');
    } else {
      // New scene — INSERT (supports same content via different sources, e.g. YouTube + Rutube)
      console.log('[user.fav POST] INSERTING new favorite');
      await db.run(
        'INSERT INTO favorites (user_id, video_url, audio_url, title, category_id) VALUES (?, ?, ?, ?, ?)',
        [req.userId, key, sceneJson, scene.title || '', scene.categoryId || '']
      );
      console.log('[user.fav POST] INSERT done');
    }
    const row = await db.get(
      'SELECT * FROM favorites WHERE user_id = ? AND video_url = ?',
      [req.userId, key]
    );
    res.json(row ? rowToScene(row) : { ok: true });
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
    res.json(rows.map(rowToScene));
  } catch (err) {
    console.error('Get favorites error:', err.message);
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

router.delete('/favorites', requireUser, async (req, res) => {
  // Support both body {scene} and query ?sceneKey=youtube:xxx
  let key = null;
  const qKey = req.query?.sceneKey;
  console.log('[user.del fav] query=', JSON.stringify(req.query), 'body=', JSON.stringify(req.body), 'sceneKey=', qKey);
  if (qKey) {
    key = String(qKey);
  } else {
    const scene = req.body?.scene || req.body;
    key = scene ? sceneRef(scene) : null;
  }
  console.log('[user.del fav] final key=', JSON.stringify(key), 'userId=', req.userId, '!key=', !key);
  if (!key) return res.status(400).json({ error: 'Could not determine scene reference' });
  try {
    const del = await db.run('DELETE FROM favorites WHERE user_id = ? AND video_url = ?', [
      req.userId,
      key,
    ]);
    console.log('[user.del fav] db.run result:', JSON.stringify(del));
    console.log('[user.del fav] res.headersSent before json:', res.headersSent);
    res.status(200).json({ ok: true, deleted: del.changes });
    console.log('[user.del fav] res.headersSent after json:', res.headersSent);
    console.log('[user.del fav] response sent');
  } catch (err) {
    console.error('Delete favorite error:', err.message);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

// ---- History (upsert) ----
router.post('/history', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const scene = req.body?.scene || req.body;
  if (!scene) return res.status(400).json({ error: 'scene required' });

  const key = sceneRef(scene);
  if (!key) return res.status(400).json({ error: 'Could not determine scene reference' });

  const sceneJson = JSON.stringify(scene);
  const progress = Number(req.body.progress) || 0;
  const duration = Number(req.body.duration) || 0;

  try {
    const existing = await db.get(
      'SELECT id FROM history WHERE user_id = ? AND video_url = ?',
      [req.userId, key]
    );
    if (existing) {
      await db.run(
        'UPDATE history SET audio_url = ?, title = ?, category_id = ?, progress = ?, duration = ?, watched_at = CURRENT_TIMESTAMP WHERE id = ?',
        [sceneJson, scene.title || '', scene.categoryId || '', progress, duration, existing.id]
      );
    } else {
      await db.run(
        'INSERT INTO history (user_id, video_url, audio_url, title, category_id, progress, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.userId, key, sceneJson, scene.title || '', scene.categoryId || '', progress, duration]
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
    res.json(rows.map(rowToScene));
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
      favorites: (fav?.n ?? fav?.['COUNT(*)']) || 0,
      playlists: (pls?.n ?? pls?.['COUNT(*)']) || 0,
      history: (hist?.n ?? hist?.['COUNT(*)']) || 0,
      lastWatched: last ? { title: last.title, at: last.watched_at } : null,
    });
  } catch (err) {
    console.error('Stats error:', err.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

module.exports = router;
