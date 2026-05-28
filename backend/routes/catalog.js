const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'content_catalog.json');

// In-memory cache + etag
let cache = null;
let etag = null;
let lastModified = 0;

async function reloadCache() {
  try {
    const stat = await fs.stat(CATALOG_PATH);
    if (stat.mtimeMs === lastModified && cache) return;
    const data = await fs.readFile(CATALOG_PATH, 'utf8');
    cache = JSON.parse(data);
    etag = '"' + stat.mtimeMs.toString(36) + '-' + stat.size.toString(36) + '"';
    lastModified = stat.mtimeMs;
  } catch (err) {
    console.error('Failed to read catalog:', err.message);
    throw err;
  }
}

// Warm cache on startup
reloadCache().catch(() => {});

/**
 * GET /api/catalog
 * Async, cached (mtime-checked), supports If-None-Match (etag).
 */
router.get('/', async (req, res) => {
  try {
    await reloadCache();
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=5');
    res.json(cache);
  } catch (err) {
    res.status(500).json({ error: 'Catalog unavailable' });
  }
});

module.exports = router;
