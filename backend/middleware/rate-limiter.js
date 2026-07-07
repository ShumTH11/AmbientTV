// In-memory rate limiter (no external dependency, serverless-safe).
// On Vercel each function instance keeps its own counter — sufficient for basic
// abuse protection. For a shared global limit, point this at an external store.

const store = new Map(); // key -> { count, resetAt }

function cleanup() {
  const now = Date.now();
  let removed = 0;
  for (const [k, v] of store) {
    if (now > v.resetAt) {
      store.delete(k);
      removed++;
    }
  }
  return removed;
}

function rateLimit(opts = {}) {
  const { windowMs = 60000, maxRequests = 100, keyPrefix = 'rl' } = opts;

  return (req, res, next) => {
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    let rec = store.get(key);
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + windowMs };
      store.set(key, rec);
    }
    rec.count++;

    const ttl = Math.max(0, Math.ceil((rec.resetAt - now) / 1000));
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rec.count));
    res.setHeader('X-RateLimit-Reset', ttl);

    if (rec.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests', retryAfter: ttl });
    }

    if (store.size > 5000) cleanup();
    next();
  };
}

const strict = () => rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'rl:strict' }); // login/register
const standard = () => rateLimit({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'rl:std' }); // API
const generous = () => rateLimit({ windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'rl:gen' }); // catalog/health

module.exports = { rateLimit, strict, standard, generous };
