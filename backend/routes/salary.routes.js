const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { month, year, employee_id } = req.query;
    let sql = 'SELECT s.*, u.name as user_name FROM salaries s LEFT JOIN users u ON s.user_id = u.id WHERE 1=1';
    const params = [];

    if (month) {
      sql += ' AND s.month = ?';
      params.push(month);
    }
    if (year) {
      sql += ' AND s.year = ?';
      params.push(parseInt(year));
    }
    if (employee_id) {
      sql += ' AND s.employee_id = ?';
      params.push(employee_id);
    }

    sql += ' ORDER BY s.date DESC';
    const salaries = await getAll(sql, params);
    res.json({ salaries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();

    const monthly = await getAll(
      'SELECT month, SUM(amount) as total, COUNT(*) as count FROM salaries WHERE year = ? GROUP BY month ORDER BY month',
      [currentYear]
    );

    const total = await getOne(
      'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM salaries WHERE year = ?',
      [currentYear]
    );

    res.json({ total: total.total, count: total.count, monthly });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/employees', authenticateToken, async (req, res) => {
  try {
    const employees = await getAll(
      'SELECT DISTINCT employee_id, employee_name FROM salaries ORDER BY employee_name'
    );
    const allUsers = await getAll(
      "SELECT id, name FROM users WHERE role IN ('manager', 'cashier', 'inventory') AND is_active = 1 ORDER BY name"
    );
    res.json({ employees, users: allUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { employee_id, employee_name, amount, month, year, date, notes } = req.body;
    if (!employee_name || !amount || !month || !year) {
      return res.status(400).json({ error: 'Employee name, amount, month, and year are required' });
    }
    const id = `sal-${Date.now()}`;
    const salaryDate = date || new Date().toISOString().split('T')[0];

    const existing = await getOne(
      'SELECT id FROM salaries WHERE employee_id = ? AND month = ? AND year = ?',
      [employee_id || employee_name, month, year]
    );
    if (existing) {
      return res.status(400).json({ error: 'Salary already recorded for this employee for this month' });
    }

    await runQuery(
      'INSERT INTO salaries (id, employee_id, employee_name, amount, month, year, date, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, employee_id || employee_name, employee_name, amount, month, year, salaryDate, notes || '', req.user.id]
    );

    const expenseId = `exp-${Date.now()}`;
    await runQuery(
      'INSERT INTO expenses (id, category, amount, description, date, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [expenseId, 'Salary', amount, `Salary for ${employee_name} - ${month}/${year}`, salaryDate, req.user.id]
    );

    res.status(201).json({ message: 'Salary recorded', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { amount, month, year, date, notes, status } = req.body;
    await runQuery(
      'UPDATE salaries SET amount=?, month=?, year=?, date=?, notes=?, status=? WHERE id=?',
      [amount, month, year, date, notes || '', status || 'paid', req.params.id]
    );
    res.json({ message: 'Salary updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await runQuery('DELETE FROM salaries WHERE id = ?', [req.params.id]);
    res.json({ message: 'Salary deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
