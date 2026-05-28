/**
 * Bearer-token authentication middleware.
 *
 * The Android TV app must send:
 *   Authorization: Bearer <APP_SECRET>
 *
 * This prevents unauthorized use of the proxy endpoints.
 * For production, rotate the secret periodically and store it
 * in a secure vault (not in the APK).
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', detail: 'Missing Authorization header' });
  }

  if (token !== process.env.APP_SECRET) {
    return res.status(403).json({ error: 'Forbidden', detail: 'Invalid token' });
  }

  next();
}

module.exports = { requireAuth };
