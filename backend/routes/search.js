const express = require('express');
const cache = require('../cache');
const router = express.Router();

const KEYS = {
  pexels: process.env.PEXELS_API_KEY,
  pixabay: process.env.PIXABAY_API_KEY,
  youtube: process.env.YOUTUBE_API_KEY,
  coverr: process.env.COVERR_API_KEY,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch with retry and exponential backoff.
 */
async function fetchWithRetry(url, options = {}, maxRetries = 2) {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      lastError = err;
      if (i < maxRetries) {
        const delay = Math.pow(2, i) * 500; // 500ms, 1000ms
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Generic cached proxy handler.
 */
async function cachedProxy(req, res, cacheKey, fetchFn) {
  const cached = cache.get(cacheKey);
  if (cached) {
    res.setHeader('X-Cache', 'HIT');
    return res.json(cached);
  }

  try {
    const data = await fetchFn();
    cache.set(cacheKey, data, CACHE_TTL_MS);
    res.setHeader('X-Cache', 'MISS');
    res.json(data);
  } catch (err) {
    console.error(`Proxy error [${cacheKey}]:`, err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
}

router.get('/pexels', async (req, res) => {
  const { query, per_page = 10 } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const cacheKey = `pexels:${query}:${per_page}`;
  await cachedProxy(req, res, cacheKey, async () => {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${per_page}&orientation=landscape`;
    const response = await fetchWithRetry(url, { headers: { Authorization: KEYS.pexels } });
    return response.json();
  });
});

router.get('/pixabay', async (req, res) => {
  const { query, per_page = 10 } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const cacheKey = `pixabay:${query}:${per_page}`;
  await cachedProxy(req, res, cacheKey, async () => {
    const url = `https://pixabay.com/api/videos/?key=${KEYS.pixabay}&q=${encodeURIComponent(query)}&per_page=${per_page}`;
    const response = await fetchWithRetry(url);
    return response.json();
  });
});

// Pixabay Audio — royalty-free music & sound effects
router.get('/pixabay-audio', async (req, res) => {
  const { query, per_page = 10, type = 'music' } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const cacheKey = `pixabay-audio:${query}:${per_page}:${type}`;
  await cachedProxy(req, res, cacheKey, async () => {
    // Pixabay audio API: https://pixabay.com/api/audio/
    const url = `https://pixabay.com/api/audio/?key=${KEYS.pixabay}&q=${encodeURIComponent(query)}&per_page=${per_page}&type=${type}`;
    const response = await fetchWithRetry(url);
    return response.json();
  });
});

router.get('/youtube', async (req, res) => {
  const { query, maxResults = 10 } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const cacheKey = `youtube:${query}:${maxResults}`;
  await cachedProxy(req, res, cacheKey, async () => {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${KEYS.youtube}`;
    const response = await fetchWithRetry(url);
    return response.json();
  });
});

router.get('/coverr', async (req, res) => {
  const { query, limit = 10 } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const cacheKey = `coverr:${query}:${limit}`;
  await cachedProxy(req, res, cacheKey, async () => {
    const url = `https://api.coverr.co/videos?api_key=${KEYS.coverr}&query=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetchWithRetry(url);
    return response.json();
  });
});

router.get('/archive', async (req, res) => {
  const { query, rows = 10 } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const cacheKey = `archive:${query}:${rows}`;
  await cachedProxy(req, res, cacheKey, async () => {
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:(movies+OR+audio)&rows=${rows}&page=1&output=json&fields=identifier,title,description,mediatype,licenseurl`;
    const response = await fetchWithRetry(url);
    return response.json();
  });
});

module.exports = router;
