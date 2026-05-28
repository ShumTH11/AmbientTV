/**
 * Simple in-memory rate limiter middleware.
 *
 * Limits each IP to N requests per window (default: 30 req / 1 min).
 * Returns 429 Too Many Requests if the limit is exceeded.
 */

const clients = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 120; // 2/sec average, burst-friendly for admin ops

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  let record = clients.get(ip);
  if (!record) {
    record = { count: 1, resetAt: now + WINDOW_MS };
    clients.set(ip, record);
  } else {
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + WINDOW_MS;
    } else {
      record.count += 1;
    }
  }

  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - record.count));

  if (record.count > MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Limit of ${MAX_REQUESTS} requests per minute exceeded. Try again later.`
    });
  }

  next();
}

// Cleanup old records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of clients) {
    if (now > record.resetAt + WINDOW_MS) {
      clients.delete(ip);
    }
  }
}, 60_000);

module.exports = { rateLimit };
