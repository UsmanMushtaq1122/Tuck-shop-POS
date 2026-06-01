const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM customers WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY name ASC';
    const customers = await getAll(sql, params);
    res.json({ customers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await getOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const orders = await getAll('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 10', [req.params.id]);
    res.json({ customer, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, name, phone, email, address, loyalty_points, credit_balance } = req.body;
    const customerId = id || `cust-${Date.now()}`;

    await runQuery(
      'INSERT INTO customers (id, name, phone, email, address, loyalty_points, credit_balance) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [customerId, name, phone, email, address, loyalty_points || 0, credit_balance || 0]
    );

    res.status(201).json({ message: 'Customer created', id: customerId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, phone, email, address, loyalty_points, credit_balance } = req.body;
    await runQuery(
      'UPDATE customers SET name=?, phone=?, email=?, address=?, loyalty_points=?, credit_balance=? WHERE id=?',
      [name, phone, email, address, loyalty_points, credit_balance, req.params.id]
    );
    res.json({ message: 'Customer updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/credit', authenticateToken, authorizeRole('admin', 'manager', 'cashier'), async (req, res) => {
  try {
    const { amount, type } = req.body;
    const customer = await getOne('SELECT credit_balance FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const currentBalance = customer.credit_balance;
    let newBalance;

    if (type === 'add') {
      newBalance = currentBalance + Math.abs(amount);
    } else if (type === 'deduct') {
      newBalance = currentBalance - Math.abs(amount);
      if (newBalance < 0) newBalance = 0;
    } else {
      newBalance = Math.abs(amount);
    }

    await runQuery('UPDATE customers SET credit_balance = ? WHERE id = ?', [newBalance, req.params.id]);
    res.json({ message: 'Credit updated', previous_balance: currentBalance, new_balance: newBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/loyalty', authenticateToken, async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await getOne('SELECT loyalty_points FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const newPoints = (customer.loyalty_points || 0) + (parseInt(points) || 0);
    await runQuery('UPDATE customers SET loyalty_points = ? WHERE id = ?', [newPoints, req.params.id]);
    res.json({ message: 'Loyalty points updated', points: newPoints });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await runQuery('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
