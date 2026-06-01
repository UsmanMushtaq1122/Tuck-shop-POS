const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, getAll, runQuery } = require('../database/sqlite');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password, pin } = req.body;

    let user;
    if (pin) {
      user = await getOne('SELECT * FROM users WHERE pin = ? AND is_active = 1', [pin]);
    } else if (email && password) {
      user = await getOne('SELECT * FROM users WHERE email = ? AND is_active = 1', [email]);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!pin) {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'pos-secret-key-2024',
      { expiresIn: '24h' }
    );

    await runQuery(
      'INSERT INTO activity_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [`log-${Date.now()}`, user.id, 'login', 'User logged in']
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getOne('SELECT id, name, email, role, phone, avatar, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await getOne('SELECT * FROM users WHERE id = ?', [req.user.id]);

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await runQuery('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const logs = await getAll('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50');
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
