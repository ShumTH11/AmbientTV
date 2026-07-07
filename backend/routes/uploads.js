const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { put, list, del } = require('@vercel/blob');

const router = express.Router();

const ALLOWED_VIDEO = ['.mp4', '.webm', '.mov', '.m4v', '.ogg'];
const ALLOWED_AUDIO = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// On Vercel, uploads go to Vercel Blob storage. Locally / on Railway we use disk.
const USE_BLOB = !!process.env.BLOB_READ_WRITE_TOKEN;
const MAX_BLOB_MB = 25; // Vercel's lambda request body is smaller; this is a soft cap.
const MAX_DISK_MB = 2048;

function typeOf(req) {
  const t = req.query.type;
  return t === 'audio' || t === 'image' ? t : 'video';
}

function extFor(type, originalname) {
  const ext = path.extname(originalname || '').toLowerCase();
  if (type === 'audio' && ALLOWED_AUDIO.includes(ext)) return ext;
  if (type === 'image' && ALLOWED_IMAGE.includes(ext)) return ext;
  if (type === 'video' && ALLOWED_VIDEO.includes(ext)) return ext;
  return type === 'audio' ? '.mp3' : type === 'image' ? '.png' : '.mp4';
}

function allowedFor(type) {
  return type === 'audio' ? ALLOWED_AUDIO : type === 'image' ? ALLOWED_IMAGE : ALLOWED_VIDEO;
}

function fileFilter(type) {
  const allowed = allowedFor(type);
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error(`Unsupported file type. Allowed: ${allowed.join(', ')}`));
    }
    cb(null, true);
  };
}

const diskStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const type = typeOf(req);
    const dir = path.join(__dirname, '..', 'media', 'uploads', type === 'audio' ? 'audios' : type === 'image' ? 'images' : 'videos');
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      /* ignore */
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const type = typeOf(req);
    const ext = extFor(type, file.originalname);
    const filename = `u_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, filename);
  },
});

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BLOB_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => fileFilter(typeOf(req))(req, file, cb),
});

const diskUpload = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_DISK_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => fileFilter(typeOf(req))(req, file, cb),
});

function buildItem(type, filename, originalName, url, sizeBytes, createdAt) {
  return {
    id: `uploads:${type}:${filename}`,
    name: filename,
    type,
    url,
    originalName: originalName,
    sizeMB: (sizeBytes / 1024 / 1024).toFixed(2),
    createdAt: createdAt || new Date().toISOString(),
  };
}

// GET /api/uploads — list uploads
router.get('/', async (req, res) => {
  try {
    if (USE_BLOB) {
      const { blobs } = await list();
      const items = blobs
        .filter((b) => b.pathname.startsWith('uploads/'))
        .map((b) => {
          const parts = b.pathname.split('/'); // uploads/videos/<file>
          const type = parts[1] ? parts[1].replace(/s$/, '') : 'video';
          const name = parts[2] || '';
          return buildItem(type, name, name, b.url, b.size || 0, b.uploadedAt);
        });
      return res.json(items);
    }
    // Disk mode
    const base = path.join(__dirname, '..', 'media', 'uploads');
    const types = [
      ['videos', 'video'],
      ['audios', 'audio'],
      ['images', 'image'],
    ];
    const items = [];
    for (const [dir, type] of types) {
      const dirPath = path.join(base, dir);
      try {
        const files = await fs.readdir(dirPath);
        for (const f of files) {
          const stat = await fs.stat(path.join(dirPath, f));
          items.push(
            buildItem(type, f, f, `/media/uploads/${dir}/${f}`, stat.size, stat.mtime.toISOString())
          );
        }
      } catch (e) {
        /* dir missing */
      }
    }
    res.json(items);
  } catch (err) {
    console.error('List uploads error:', err.message);
    res.status(500).json({ error: 'Failed to list uploads' });
  }
});

// POST /api/uploads?type=video|audio|image
router.post('/', (req, res) => {
  const type = typeOf(req);
  const uploader = USE_BLOB ? memoryUpload : diskUpload;
  uploader.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: 'Upload failed', detail: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      if (USE_BLOB) {
        const ext = extFor(type, req.file.originalname);
        const filename = `u_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
        const pathname = `uploads/${type}s/${filename}`;
        const blob = await put(pathname, req.file.buffer, {
          access: 'public',
          contentType: req.file.mimetype,
          allowOverwrite: false,
        });
        return res.status(201).json(
          buildItem(type, filename, req.file.originalname, blob.url, req.file.size)
        );
      }
      // Disk mode — file already saved by multer
      const dir = type === 'audio' ? 'audios' : type === 'image' ? 'images' : 'videos';
      const url = `/media/uploads/${dir}/${req.file.filename}`;
      return res
        .status(201)
        .json(buildItem(type, req.file.filename, req.file.originalname, url, req.file.size));
    } catch (e) {
      console.error('Save upload error:', e.message);
      res.status(500).json({ error: 'Failed to save upload', detail: e.message });
    }
  });
});

module.exports = router;
