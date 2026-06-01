const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAdmin } = require('../middleware/jwt');
const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const http = require('http');

// GET /api/admin/health — check all catalog URLs
router.get('/', requireAdmin, async (req, res) => {
  try {
    const catalogPath = path.join(__dirname, '..', 'data', 'content_catalog.json');
    const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));

    const results = {
      checked_at: new Date().toISOString(),
      total_pairs: 0,
      broken: [],
      local: [],
      ok: 0
    };

    for (const cat of catalog.categories || []) {
      for (const pair of cat.pairs || []) {
        results.total_pairs++;

        // Check for local URLs
        if (pair.videoUrl?.startsWith('/media/') || pair.audioUrl?.startsWith('/media/')) {
          results.local.push({
            category: cat.id,
            title: pair.title,
            videoUrl: pair.videoUrl,
            audioUrl: pair.audioUrl
          });
          continue;
        }

        // Check video URL
        const vCheck = await checkUrl(pair.videoUrl);
        const aCheck = await checkUrl(pair.audioUrl);

        if (!vCheck.ok || !aCheck.ok) {
          results.broken.push({
            category: cat.id,
            title: pair.title,
            videoUrl: pair.videoUrl,
            videoStatus: vCheck.status,
            audioUrl: pair.audioUrl,
            audioStatus: aCheck.status
          });
        } else {
          results.ok++;
        }
      }
    }

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function checkUrl(url) {
  return new Promise((resolve) => {
    if (!url) return resolve({ ok: false, status: 'MISSING' });
    if (url.startsWith('/media/')) return resolve({ ok: true, status: 'LOCAL' });

    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      const status = res.statusCode;
      if (status >= 200 && status < 400) {
        resolve({ ok: true, status: String(status) });
      } else if (status === 403 && url.includes('pexels.com')) {
        // Pexels 403 on HEAD is common, try GET
        resolve({ ok: true, status: '403_PEXELS' });
      } else {
        resolve({ ok: false, status: String(status) });
      }
    });
    req.on('error', () => resolve({ ok: false, status: 'ERROR' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 'TIMEOUT' }); });
    req.end();
  });
}

module.exports = router;
