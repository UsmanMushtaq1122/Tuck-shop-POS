const express = require('express');
const bcrypt = require('bcryptjs');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const users = await getAll('SELECT id, name, email, role, phone, avatar, is_active, created_at FROM users ORDER BY name ASC');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { id, name, email, password, role, pin, phone } = req.body;
    const userId = id || `user-${Date.now()}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    await runQuery(
      'INSERT INTO users (id, name, email, password, role, pin, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, role || 'cashier', pin, phone]
    );

    res.status(201).json({ message: 'User created', id: userId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, email, role, pin, phone, is_active } = req.body;
    await runQuery(
      'UPDATE users SET name=?, email=?, role=?, pin=?, phone=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, email, role, pin, phone, is_active, req.params.id]
    );
    res.json({ message: 'User updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await runQuery('UPDATE users SET is_active=0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
