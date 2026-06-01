const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { generateId } = require('../utils/helpers');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, status, startDate, endDate } = req.query;
    let sql = `SELECT o.*, c.name as customer_name, u.name as cashier_name 
               FROM orders o 
               LEFT JOIN customers c ON o.customer_id = c.id 
               LEFT JOIN users u ON o.user_id = u.id WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (o.order_number LIKE ? OR o.id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (startDate) {
      sql += ' AND o.created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      sql += ' AND o.created_at <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY o.created_at DESC';
    const orders = await getAll(sql, params);
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await getOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const items = await getAll('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ order, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { id, order_number, customer_id, items, subtotal, discount, tax, total, payment_method, status, notes } = req.body;

    const orderId = id || `order-${Date.now()}`;
    const orderNum = order_number || `INV-${Date.now()}`;

    await runQuery(
      `INSERT INTO orders (id, order_number, customer_id, user_id, subtotal, discount, tax, total, payment_method, status, notes, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, orderNum, customer_id, req.user.id, subtotal, discount || 0, tax || 0, total, payment_method, status || 'completed', notes, 'pending']
    );

    for (const item of items) {
      const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await runQuery(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, price, discount, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, orderId, item.product_id, item.product_name, item.quantity, item.price, item.discount || 0, item.total]
      );

      await runQuery(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    if (customer_id) {
      await runQuery(
        'UPDATE customers SET total_purchases = total_purchases + ? WHERE id = ?',
        [total, customer_id]
      );
    }

    res.status(201).json({ message: 'Order created', id: orderId, order_number: orderNum });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { status } = req.body;
    await runQuery('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Order status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const orders = await getAll(
      `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE date(o.created_at) = ? ORDER BY o.created_at DESC`,
      [today]
    );
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
