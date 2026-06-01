const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const suppliers = await getAll(
      `SELECT s.*, (SELECT COUNT(*) FROM products WHERE products.supplier_id = s.id AND products.is_active = 1) as product_count
       FROM suppliers s WHERE s.is_active = 1 ORDER BY s.name ASC`
    );
    res.json({ suppliers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const supplier = await getOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    const products = await getAll(
      'SELECT id, name, sku, selling_price, stock_quantity FROM products WHERE supplier_id = ? AND is_active = 1',
      [req.params.id]
    );
    const orders = await getAll(
      `SELECT id, order_number, status, total_amount, total_items, created_at
       FROM purchase_orders WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.params.id]
    );
    res.json({ supplier, products, orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name is required' });
    const id = `sup-${Date.now()}`;
    await runQuery(
      'INSERT INTO suppliers (id, name, contact, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, contact || '', phone || '', email || '', address || '']
    );
    res.status(201).json({ message: 'Supplier created', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, contact, phone, email, address } = req.body;
    await runQuery(
      'UPDATE suppliers SET name=?, contact=?, phone=?, email=?, address=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, contact || '', phone || '', email || '', address || '', req.params.id]
    );
    res.json({ message: 'Supplier updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await runQuery('UPDATE suppliers SET is_active=0 WHERE id=?', [req.params.id]);
    res.json({ message: 'Supplier deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
