const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    let sql = 'SELECT e.*, u.name as user_name FROM expenses e LEFT JOIN users u ON e.user_id = u.id WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND e.category = ?';
      params.push(category);
    }
    if (startDate) {
      sql += ' AND e.date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND e.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY e.date DESC';
    const expenses = await getAll(sql, params);
    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, category, amount, description, date, receipt } = req.body;
    const expenseId = id || `exp-${Date.now()}`;

    await runQuery(
      'INSERT INTO expenses (id, category, amount, description, date, receipt, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [expenseId, category, amount, description, date || new Date().toISOString().split('T')[0], receipt, req.user.id]
    );

    res.status(201).json({ message: 'Expense created', id: expenseId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { category, amount, description, date, receipt } = req.body;
    await runQuery(
      'UPDATE expenses SET category=?, amount=?, description=?, date=?, receipt=? WHERE id=?',
      [category, amount, description, date, receipt, req.params.id]
    );
    res.json({ message: 'Expense updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    await runQuery('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 8) + '01';

    const todayExpenses = await getOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?', [today]);
    const monthExpenses = await getOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?', [monthStart]);
    const byCategory = await getAll('SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses GROUP BY category ORDER BY total DESC');

    res.json({
      today: todayExpenses.total,
      month: monthExpenses.total,
      byCategory,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
