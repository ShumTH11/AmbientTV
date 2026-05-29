const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { generateToken } = require('../middleware/jwt');
const { sanitizeString, sanitizeBody } = require('../middleware/sanitize');

const router = express.Router();

// Register
router.post('/register', express.json(), sanitizeBody, (req, res) => {
  const { email, password } = req.body;
  let { name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Неверный формат email' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const safeName = sanitizeString(name || email.split('@')[0], 100);

  db.run(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
    [email, hash, safeName],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }
        return res.status(500).json({ error: err.message });
      }
      const token = generateToken(this.lastID);
      // Set httpOnly cookie
      res.cookie('atv_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      res.json({ user: { id: this.lastID, email, name: safeName } });
    }
  );
});

// Login
router.post('/login', express.json(), sanitizeBody, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = generateToken(user.id);
    // Set httpOnly cookie
    res.cookie('atv_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    res.json({
      user: { id: user.id, email: user.email, name: user.name }
    });
  });
});

// Profile
router.get('/profile', require('../middleware/jwt').requireUser, (req, res) => {
  db.get('SELECT id, email, name, created_at FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(user);
  });
});

// Logout — clear cookie
router.post('/logout', (req, res) => {
  res.clearCookie('atv_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.json({ success: true });
});

module.exports = router;
