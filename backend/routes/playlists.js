const express = require('express');
const db = require('../database');
const { requireUser } = require('../middleware/jwt');
const { sanitizeBody } = require('../middleware/sanitize');

const router = express.Router();

function validUrl(u) {
  return typeof u === 'string' && u.length > 0 && u.length < 2000;
}

router.get('/', requireUser, async (req, res) => {
  try {
    const playlists = await db.all(
      'SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    const result = [];
    for (const p of playlists) {
      const items = await db.all(
        'SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY sort_order ASC, id ASC',
        [p.id]
      );
      result.push({ ...p, items });
    }
    res.json(result);
  } catch (err) {
    console.error('Get playlists error:', err.message);
    res.status(500).json({ error: 'Failed to load playlists' });
  }
});

router.post('/', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Playlist name required' });
  try {
    const info = await db.run('INSERT INTO playlists (user_id, name) VALUES (?, ?)', [
      req.userId,
      name.trim(),
    ]);
    const row = await db.get('SELECT * FROM playlists WHERE id = ?', [info.lastID]);
    res.status(201).json(row);
  } catch (err) {
    console.error('Create playlist error:', err.message);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

router.post('/:id/items', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const playlistId = req.params.id;
  const { video_url, audio_url, title, category_id } = req.body || {};
  const v = video_url || '';
  const a = audio_url || '';
  if (!validUrl(v) && !validUrl(a)) {
    return res.status(400).json({ error: 'video_url or audio_url required' });
  }
  try {
    const pl = await db.get('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [
      playlistId,
      req.userId,
    ]);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });

    const count = await db.get('SELECT COUNT(*) AS n FROM playlist_items WHERE playlist_id = ?', [
      playlistId,
    ]);
    await db.run(
      'INSERT OR IGNORE INTO playlist_items (playlist_id, video_url, audio_url, title, category_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [playlistId, v, a, title || '', category_id || '', count?.n || 0]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Add item error:', err.message);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

router.patch('/:id/name', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const playlistId = req.params.id;
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  try {
    const pl = await db.get('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [
      playlistId,
      req.userId,
    ]);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });
    await db.run('UPDATE playlists SET name = ? WHERE id = ?', [name.trim(), playlistId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Rename playlist error:', err.message);
    res.status(500).json({ error: 'Failed to rename playlist' });
  }
});

router.delete('/:id', requireUser, async (req, res) => {
  const playlistId = req.params.id;
  try {
    const pl = await db.get('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [
      playlistId,
      req.userId,
    ]);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });
    await db.run('DELETE FROM playlists WHERE id = ?', [playlistId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete playlist error:', err.message);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

router.post('/:id/reorder', express.json(), requireUser, sanitizeBody, async (req, res) => {
  const playlistId = req.params.id;
  const { order } = req.body || {}; // array of item ids in new order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
  try {
    const pl = await db.get('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [
      playlistId,
      req.userId,
    ]);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });

    for (let i = 0; i < order.length; i++) {
      await db.run('UPDATE playlist_items SET sort_order = ? WHERE id = ? AND playlist_id = ?', [
        i,
        order[i],
        playlistId,
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Reorder error:', err.message);
    res.status(500).json({ error: 'Failed to reorder' });
  }
});

router.delete('/:id/items/:itemId', requireUser, async (req, res) => {
  const { id, itemId } = req.params;
  try {
    const pl = await db.get('SELECT id FROM playlists WHERE id = ? AND user_id = ?', [
      id,
      req.userId,
    ]);
    if (!pl) return res.status(404).json({ error: 'Playlist not found' });
    await db.run('DELETE FROM playlist_items WHERE id = ? AND playlist_id = ?', [itemId, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete item error:', err.message);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
