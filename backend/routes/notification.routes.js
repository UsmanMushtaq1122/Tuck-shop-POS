const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    let sql = 'SELECT * FROM notifications';
    const params = [];
    if (unreadOnly === 'true') {
      sql += ' WHERE read = 0';
    }
    if (req.user.role !== 'admin') {
      sql += sql.includes('WHERE') ? ' AND' : ' WHERE';
      sql += ' (user_id IS NULL OR user_id = ?)';
      params.push(req.user.id);
    }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const notifications = await getAll(sql, params);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { type, title, message, link } = req.body;
    const id = generateId('notif');
    await runQuery(
      'INSERT INTO notifications (id, type, title, message, user_id, link) VALUES (?, ?, ?, ?, ?, ?)',
      [id, type, title, message, req.user.id, link || null]
    );
    const notification = await getOne('SELECT * FROM notifications WHERE id = ?', [id]);
    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await runQuery('UPDATE notifications SET read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await runQuery('UPDATE notifications SET read = 1 WHERE read = 0');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await runQuery('DELETE FROM notifications WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const results = [];

    const products = await getAll('SELECT id, name, stock_quantity, min_stock FROM products WHERE stock_quantity <= min_stock');
    for (const p of products) {
      const existing = await getOne(
        'SELECT id FROM notifications WHERE type = ? AND message LIKE ? AND read = 0',
        ['low_stock', `%${p.name}%`]
      );
      if (!existing) {
        const id = generateId('notif');
        await runQuery(
          'INSERT INTO notifications (id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
          [id, 'low_stock', 'Low Stock Alert', `${p.name} stock is low (${p.stock_quantity} units). Minimum: ${p.min_stock}`, '/inventory']
        );
        results.push({ id, type: 'low_stock', product: p.name });
      }
    }

    const customers = await getAll('SELECT id, name, credit_balance FROM customers WHERE credit_balance > 0 ORDER BY credit_balance DESC LIMIT 10');
    const pendingTotal = customers.reduce((s, c) => s + c.credit_balance, 0);
    if (customers.length > 0) {
      const existing = await getOne(
        "SELECT id FROM notifications WHERE type = ? AND created_at >= datetime('now', '-1 day')",
        ['pending_payment']
      );
      if (!existing) {
        const id = generateId('notif');
        const topNames = customers.slice(0, 3).map(c => c.name).join(', ');
        await runQuery(
          'INSERT INTO notifications (id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
          [id, 'pending_payment', 'Pending Payments', `${customers.length} customers owe ${Math.round(pendingTotal)} PKR total. Top: ${topNames}`, '/customers']
        );
        results.push({ id, type: 'pending_payment' });
      }
    }

    res.json({ notifications: results, count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/daily-summary', authenticateToken, async (req, res) => {
  try {
    const existing = await getOne(
      "SELECT id FROM notifications WHERE type = 'daily_summary' AND created_at >= datetime('now', '-1 day')"
    );
    if (existing) return res.json({ notification: null, message: 'Already generated today' });

    const sales = await getOne(
      "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) = date('now') AND status = 'completed'"
    );
    const expenses = await getOne(
      "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date(created_at) = date('now')"
    );
    const profit = sales.total - (expenses.total || 0);

    const id = generateId('notif');
    await runQuery(
      'INSERT INTO notifications (id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
      [id, 'daily_summary', 'Daily Summary', `${sales.count} orders, ${Math.round(sales.total)} PKR sales, ${Math.round(expenses.total)} PKR expenses, ${Math.round(profit)} PKR profit`, '/reports']
    );
    const notification = await getOne('SELECT * FROM notifications WHERE id = ?', [id]);
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
