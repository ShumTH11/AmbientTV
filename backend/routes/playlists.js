const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

// All routes require authentication
router.use(requireAuth);

// GET /api/user/playlists — list all playlists with item counts
router.get('/', (req, res) => {
  const userId = req.user.id;
  db.all(
    `SELECT p.*, COUNT(pi.id) as item_count
     FROM playlists p
     LEFT JOIN playlist_items pi ON pi.playlist_id = p.id
     WHERE p.user_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    }
  );
});

// POST /api/user/playlists — create new playlist
router.post('/', (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  db.run(
    'INSERT INTO playlists (user_id, name) VALUES (?, ?)',
    [userId, name.trim()],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name: name.trim(), item_count: 0 });
    }
  );
});

// DELETE /api/user/playlists/:id — delete playlist
router.delete('/:id', (req, res) => {
  const userId = req.user.id;
  const playlistId = req.params.id;
  db.run(
    'DELETE FROM playlists WHERE id = ? AND user_id = ?',
    [playlistId, userId],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Playlist not found' });
      res.json({ deleted: true });
    }
  );
});

// GET /api/user/playlists/:id — get playlist with items
router.get('/:id', (req, res) => {
  const userId = req.user.id;
  const playlistId = req.params.id;

  db.get(
    'SELECT * FROM playlists WHERE id = ? AND user_id = ?',
    [playlistId, userId],
    (err, playlist) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      db.all(
        'SELECT * FROM playlist_items WHERE playlist_id = ? ORDER BY sort_order, created_at',
        [playlistId],
        (err2, items) => {
          if (err2) return res.status(500).json({ error: err2.message });
          res.json({ ...playlist, items: items || [] });
        }
      );
    }
  );
});

// POST /api/user/playlists/:id/items — add item to playlist
router.post('/:id/items', (req, res) => {
  const userId = req.user.id;
  const playlistId = req.params.id;
  const { video_url, audio_url, title, category_id } = req.body;

  if (!video_url || !audio_url) {
    return res.status(400).json({ error: 'video_url and audio_url are required' });
  }

  // Verify playlist belongs to user
  db.get(
    'SELECT id FROM playlists WHERE id = ? AND user_id = ?',
    [playlistId, userId],
    (err, playlist) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      // Get max sort_order
      db.get(
        'SELECT MAX(sort_order) as max_order FROM playlist_items WHERE playlist_id = ?',
        [playlistId],
        (err2, row) => {
          if (err2) return res.status(500).json({ error: err2.message });
          const sortOrder = (row?.max_order || 0) + 1;

          db.run(
            'INSERT INTO playlist_items (playlist_id, video_url, audio_url, title, category_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
            [playlistId, video_url, audio_url, title || '', category_id || '', sortOrder],
            function(err3) {
              if (err3) {
                if (err3.message.includes('UNIQUE constraint failed')) {
                  return res.status(409).json({ error: 'Item already in playlist' });
                }
                return res.status(500).json({ error: err3.message });
              }
              res.json({ id: this.lastID, playlist_id: playlistId, video_url, audio_url, title, sort_order: sortOrder });
            }
          );
        }
      );
    }
  );
});

// DELETE /api/user/playlists/:id/items/:itemId — remove item from playlist
router.delete('/:id/items/:itemId', (req, res) => {
  const userId = req.user.id;
  const playlistId = req.params.id;
  const itemId = req.params.itemId;

  // Verify playlist belongs to user
  db.get(
    'SELECT id FROM playlists WHERE id = ? AND user_id = ?',
    [playlistId, userId],
    (err, playlist) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      db.run(
        'DELETE FROM playlist_items WHERE id = ? AND playlist_id = ?',
        [itemId, playlistId],
        function(err2) {
          if (err2) return res.status(500).json({ error: err2.message });
          if (this.changes === 0) return res.status(404).json({ error: 'Item not found' });
          res.json({ deleted: true });
        }
      );
    }
  );
});

// PATCH /api/user/playlists/:id/items/reorder — reorder items
router.patch('/:id/items/reorder', (req, res) => {
  const userId = req.user.id;
  const playlistId = req.params.id;
  const { item_ids } = req.body;

  if (!Array.isArray(item_ids)) {
    return res.status(400).json({ error: 'item_ids array is required' });
  }

  // Verify playlist belongs to user
  db.get(
    'SELECT id FROM playlists WHERE id = ? AND user_id = ?',
    [playlistId, userId],
    (err, playlist) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

      // Update sort_order for each item
      const stmt = db.prepare('UPDATE playlist_items SET sort_order = ? WHERE id = ? AND playlist_id = ?');
      item_ids.forEach((itemId, index) => {
        stmt.run(index, itemId, playlistId);
      });
      stmt.finalize();

      res.json({ reordered: true });
    }
  );
});

module.exports = router;
