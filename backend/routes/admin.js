const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'content_catalog.json');

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

module.exports = router;
