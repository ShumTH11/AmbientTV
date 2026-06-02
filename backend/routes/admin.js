const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');

const router = express.Router();
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'content_catalog.json');
const MEDIA_DIR = path.join(__dirname, '..', 'media');
const VIDEO_DIR = path.join(MEDIA_DIR, 'video');
const AUDIO_DIR = path.join(MEDIA_DIR, 'audio');

// Ensure media dirs exist
(async () => {
  try { await fs.mkdir(VIDEO_DIR, { recursive: true }); } catch (e) {}
  try { await fs.mkdir(AUDIO_DIR, { recursive: true }); } catch (e) {}
})();

// Multer storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'video';
    const dest = type === 'audio' ? AUDIO_DIR : VIDEO_DIR;
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload_${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB max
  fileFilter: (req, file, cb) => {
    const allowedVideo = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/flac'];
    const type = req.params.type || 'video';
    const allowed = type === 'audio' ? allowedAudio : allowedVideo;
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`));
    }
  }
});

let writePromise = null;

// Load catalog helper
async function loadCatalog() {
  const data = await fs.readFile(CATALOG_PATH, 'utf8');
  return JSON.parse(data);
}

async function saveCatalog(catalog) {
  if (writePromise) await writePromise;
  writePromise = fs.writeFile(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  await writePromise;
  writePromise = null;
}

// Admin auth via cookie
function requireAdmin(req, res, next) {
  const token = req.cookies?.atv_admin;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!token || !adminHash) {
    return res.status(401).json({ error: 'Unauthorized', detail: 'Invalid or missing admin session' });
  }
  const valid = bcrypt.compareSync(token, adminHash);
  if (!valid) {
    return res.status(401).json({ error: 'Unauthorized', detail: 'Invalid admin session' });
  }
  next();
}

// Login
router.post('/login', express.json(), (req, res) => {
  const { password } = req.body;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;
  if (!password || !adminHash) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const valid = bcrypt.compareSync(password, adminHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  // Set admin cookie
  res.cookie('atv_admin', password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
  res.json({ success: true });
});

// Check session
router.get('/check', requireAdmin, (req, res) => {
  res.json({ authenticated: true });
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('atv_admin', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true });
});

// Get catalog
router.get('/catalog', requireAdmin, async (req, res) => {
  try {
    const catalog = await loadCatalog();
    res.json(catalog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read catalog', detail: err.message });
  }
});

// Save entire catalog
router.post('/catalog', requireAdmin, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    await saveCatalog(req.body);
    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write catalog', detail: err.message });
  }
});

// Stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const data = await loadCatalog();
    const totalPairs = data.categories.reduce((sum, c) => sum + (c.pairs ? c.pairs.length : 0), 0);
    res.json({
      version: data.version,
      categories: data.categories.length,
      totalPairs,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== LOCAL MEDIA MANAGEMENT ==========

// List local media files
router.get('/media', requireAdmin, async (req, res) => {
  try {
    const videoFiles = await fs.readdir(VIDEO_DIR).catch(() => []);
    const audioFiles = await fs.readdir(AUDIO_DIR).catch(() => []);
    
    const videos = await Promise.all(videoFiles.map(async (f) => {
      const stat = await fs.stat(path.join(VIDEO_DIR, f));
      return {
        name: f,
        type: 'video',
        size: stat.size,
        sizeMB: (stat.size / 1024 / 1024).toFixed(2),
        modified: stat.mtime,
        path: `/media/video/${f}`
      };
    }));
    
    const audios = await Promise.all(audioFiles.map(async (f) => {
      const stat = await fs.stat(path.join(AUDIO_DIR, f));
      return {
        name: f,
        type: 'audio',
        size: stat.size,
        sizeMB: (stat.size / 1024 / 1024).toFixed(2),
        modified: stat.mtime,
        path: `/media/audio/${f}`
      };
    }));
    
    res.json({ videos, audios, totalCount: videos.length + audios.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list media', detail: err.message });
  }
});

// Upload media file
router.post('/media/upload/:type', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const type = req.params.type;
    const filePath = type === 'audio' 
      ? `/media/audio/${req.file.filename}`
      : `/media/video/${req.file.filename}`;
    
    res.json({
      success: true,
      file: {
        name: req.file.filename,
        originalName: req.file.originalname,
        type: type,
        size: req.file.size,
        sizeMB: (req.file.size / 1024 / 1024).toFixed(2),
        path: filePath
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

// Delete media file
router.delete('/media/:type/:filename', requireAdmin, async (req, res) => {
  try {
    const { type, filename } = req.params;
    const dir = type === 'audio' ? AUDIO_DIR : VIDEO_DIR;
    const filePath = path.join(dir, filename);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(dir)) {
      return res.status(403).json({ error: 'Invalid path' });
    }
    
    await fs.unlink(filePath);
    res.json({ success: true, deleted: filename });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', detail: err.message });
  }
});

// Get media usage stats
router.get('/media/stats', requireAdmin, async (req, res) => {
  try {
    const videoFiles = await fs.readdir(VIDEO_DIR).catch(() => []);
    const audioFiles = await fs.readdir(AUDIO_DIR).catch(() => []);
    
    let videoSize = 0;
    let audioSize = 0;
    
    for (const f of videoFiles) {
      const stat = await fs.stat(path.join(VIDEO_DIR, f));
      videoSize += stat.size;
    }
    for (const f of audioFiles) {
      const stat = await fs.stat(path.join(AUDIO_DIR, f));
      audioSize += stat.size;
    }
    
    res.json({
      videos: { count: videoFiles.length, sizeMB: (videoSize / 1024 / 1024).toFixed(2) },
      audios: { count: audioFiles.length, sizeMB: (audioSize / 1024 / 1024).toFixed(2) },
      total: { count: videoFiles.length + audioFiles.length, sizeMB: ((videoSize + audioSize) / 1024 / 1024).toFixed(2) }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stats', detail: err.message });
  }
});

module.exports = router;
