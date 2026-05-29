const validator = require('validator');

/**
 * Sanitize string input — trim, escape HTML, limit length.
 */
function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  let s = str.trim();
  s = validator.escape(s);        // escape < > & " '
  s = validator.stripLow(s);      // remove low ASCII control chars
  if (s.length > maxLength) s = s.substring(0, maxLength);
  return s;
}

/**
 * Validate and sanitize URL. Returns null if invalid.
 */
function sanitizeUrl(url, protocols = ['http', 'https']) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!validator.isURL(trimmed, { protocols, require_protocol: true })) {
    return null;
  }
  // Block known malicious / data URLs
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return null;
  }
  return trimmed;
}

/**
 * Sanitize numeric input. Returns defaultValue if invalid.
 */
function sanitizeNumber(val, defaultValue = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return defaultValue;
  return Math.max(min, Math.min(max, num));
}

/**
 * Express middleware — sanitizes common body fields.
 */
function sanitizeBody(req, res, next) {
  if (req.body) {
    // Sanitize string fields
    ['title', 'name', 'category_id'].forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = sanitizeString(req.body[field]);
      }
    });

    // Sanitize URLs
    ['video_url', 'audio_url'].forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = sanitizeUrl(req.body[field]);
      }
    });

    // Sanitize numbers
    ['progress', 'duration'].forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = sanitizeNumber(req.body[field]);
      }
    });
  }
  next();
}

module.exports = {
  sanitizeString,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeBody
};
