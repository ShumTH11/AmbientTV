const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();
const CATALOG_PATH = path.join(__dirname, '..', 'data', 'content_catalog.json');

let writePromise = null; // serialize writes

function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token || token !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized', detail: 'Invalid or missing admin token' });
  }
  next();
}

router.get('/catalog', requireAdmin, async (req, res) => {
  try {
    const data = await fs.readFile(CATALOG_PATH, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read catalog', detail: err.message });
  }
});

router.post('/catalog', requireAdmin, express.json({ limit: '10mb' }), async (req, res) => {
  try {
    // Serialize concurrent writes to prevent race conditions
    if (writePromise) {
      await writePromise;
    }
    writePromise = (async () => {
      await fs.writeFile(CATALOG_PATH, JSON.stringify(req.body, null, 2));
    })();
    await writePromise;
    writePromise = null;
    res.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err) {
    writePromise = null;
    res.status(500).json({ error: 'Failed to write catalog', detail: err.message });
  }
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(CATALOG_PATH, 'utf8'));
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
