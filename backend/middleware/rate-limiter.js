/** /root/.openclaw/workspace/AmbientTV/backend/middleware/rate-limiter.js */

const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  enableOfflineQueue: false
});

redis.on('error', (err) => {
  console.error('[Redis] error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] connected');
});

// Rate limiter using Redis
function rateLimit(opts = {}) {
  const { windowMs = 60000, maxRequests = 100, keyPrefix = 'rl' } = opts;
  const windowSeconds = Math.floor(windowMs / 1000);

  return async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', ttl);

      if (current > maxRequests) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: ttl
        });
      }
      next();
    } catch (err) {
      // If Redis fails, allow request (fail open for availability)
      console.error('[RateLimit] Redis error:', err.message);
      next();
    }
  };
}

// Different limits for different endpoints
const strict = () => rateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'rl:strict' });   // login/register
const standard = () => rateLimit({ windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'rl:std' });          // API
const generous = () => rateLimit({ windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'rl:gen' });        // catalog/health

module.exports = { rateLimit, strict, standard, generous, redis };
