const express = require('express');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const MEDIA_DIR = path.join(__dirname, '..', 'media');
const UPLOAD_DIR = path.join(MEDIA_DIR, 'uploads');
const VIDEO_DIR = path.join(UPLOAD_DIR, 'videos');
const AUDIO_DIR = path.join(UPLOAD_DIR, 'audios');
const IMAGE_DIR = path.join(UPLOAD_DIR, 'images');

(async () => {
  try { await fs.mkdir(VIDEO_DIR, { recursive: true }); } catch (e) {}
  try { await fs.mkdir(AUDIO_DIR, { recursive: true }); } catch (e) {}
  try { await fs.mkdir(IMAGE_DIR, { recursive: true }); } catch (e) {}
})();

const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_AUDIO = [
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/flac',
  'audio/x-m4a',
];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function dirForType(type) {
  if (type === 'audio') return AUDIO_DIR;
  if (type === 'image') return IMAGE_DIR;
  return VIDEO_DIR;
}
function extFor(type, originalname) {
  const ext = path.extname(originalname);
  if (ext) return ext;
  if (type === 'audio') return '.mp3';
  if (type === 'image') return '.png';
  return '.mp4';
}
function allowedFor(type) {
  if (type === 'audio') return ALLOWED_AUDIO;
  if (type === 'image') return ALLOWED_IMAGE;
  return ALLOWED_VIDEO;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dirForType(req.query.type)),
  filename: (req, file, cb) => {
    const type = req.query.type === 'audio' || req.query.type === 'image' ? req.query.type : 'video';
    cb(null, `u_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${extFor(type, file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const type = req.query.type === 'audio' || req.query.type === 'image' ? req.query.type : 'video';
    if (allowedFor(type).includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type: ${file.mimetype}`));
  },
});

function statRow(dir, type, f) {
  return {
    id: `uploads:${type}:${f}`,
    name: f,
    type,
    url: `/media/uploads/${type}s/${f}`,
    originalName: f,
    sizeMB: '0.00',
    createdAt: '',
  };
}

// List uploaded files
router.get('/', async (req, res) => {
  try {
    const vFiles = await fs.readdir(VIDEO_DIR).catch(() => []);
    const aFiles = await fs.readdir(AUDIO_DIR).catch(() => []);
    const iFiles = await fs.readdir(IMAGE_DIR).catch(() => []);
    const v = vFiles.map((f) => statRow(VIDEO_DIR, 'video', f));
    const a = aFiles.map((f) => statRow(AUDIO_DIR, 'audio', f));
    const i = iFiles.map((f) => statRow(IMAGE_DIR, 'image', f));
    res.json([...v, ...a, ...i]);
  } catch (e) {
    res.status(500).json({ error: 'list failed', detail: e.message });
  }
});

// Upload a file (multipart form, field 'file', query ?type=video|audio|image)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const type =
      req.query.type === 'audio' || req.query.type === 'image' ? req.query.type : 'video';
    const url = `/media/uploads/${type}s/${req.file.filename}`;
    res.json({
      id: `uploads:${type}:${req.file.filename}`,
      name: req.file.filename,
      originalName: req.file.originalname,
      type,
      url,
      sizeMB: (req.file.size / 1024 / 1024).toFixed(2),
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Upload failed', detail: e.message });
  }
});

module.exports = router;
