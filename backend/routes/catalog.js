const express = require('express');
const router = express.Router();

// Bundled at build time by the Vercel function bundler (NCC), so no filesystem
// access is required at runtime. This makes the catalog available on serverless.
const catalog = require('../data/content_catalog.json');

// ETag derived from serialized size — changes when the catalog content changes.
const etag = '"' + Buffer.byteLength(JSON.stringify(catalog)).toString(36) + '-' + catalog.version + '"';

router.get('/', (req, res) => {
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=5');
  res.json(catalog);
});

module.exports = router;
