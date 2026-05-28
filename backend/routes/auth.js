const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { generateToken } = require('../middleware/jwt');

const router = express.Router();

// Register
router.post('/register', express.json(), (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
  }

  const hash = bcrypt.hashSync(password, 10);

  db.run(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
    [email, hash, name || email.split('@')[0]],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }
        return res.status(500).json({ error: err.message });
      }
      const token = generateToken(this.lastID);
      res.json({ token, user: { id: this.lastID, email, name: name || email.split('@')[0] } });
    }
  );
});

// Login
router.post('/login', express.json(), (req, res) => {
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
    res.json({
      token,
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

module.exports = router;
