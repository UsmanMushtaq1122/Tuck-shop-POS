const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT po.*, u.name as user_name
               FROM purchase_orders po
               LEFT JOIN users u ON po.user_id = u.id WHERE 1=1`;
    const params = [];
    if (status) {
      sql += ' AND po.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY po.created_at DESC';
    const orders = await getAll(sql, params);
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const order = await getOne('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    const items = await getAll(
      'SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY product_name ASC',
      [req.params.id]
    );
    res.json({ order, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'manager', 'inventory'), async (req, res) => {
  try {
    const { supplier_id, supplier_name, items, notes } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }
    const orderId = `po-${Date.now()}`;
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0);
    const totalAmount = items.reduce((sum, i) => sum + ((parseFloat(i.unit_cost) || 0) * (parseInt(i.quantity) || 0)), 0);

    await runQuery(
      `INSERT INTO purchase_orders (id, order_number, supplier_id, supplier_name, user_id, total_items, total_quantity, total_amount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, orderNumber, supplier_id || null, supplier_name || '', req.user.id, totalItems, totalQuantity, totalAmount, notes || '']
    );

    for (const item of items) {
      const itemId = `poi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const quantity = parseInt(item.quantity) || 0;
      const unitCost = parseFloat(item.unit_cost) || 0;
      await runQuery(
        'INSERT INTO purchase_order_items (id, purchase_order_id, product_id, product_name, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [itemId, orderId, item.product_id || '', item.product_name || '', quantity, unitCost, quantity * unitCost]
      );
    }

    res.status(201).json({ message: 'Purchase order created', id: orderId, order_number: orderNumber });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/receive', authenticateToken, authorizeRole('admin', 'manager', 'inventory'), async (req, res) => {
  try {
    const order = await getOne('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Purchase order not found' });
    if (order.status === 'received') return res.status(400).json({ error: 'Order already received' });

    const items = await getAll('SELECT * FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);

    for (const item of items) {
      const product = await getOne('SELECT stock_quantity FROM products WHERE id = ?', [item.product_id]);
      if (product) {
        const newStock = product.stock_quantity + item.quantity;
        await runQuery('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, item.product_id]);
        const logId = `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await runQuery(
          'INSERT INTO inventory_logs (id, product_id, type, quantity, previous_stock, new_stock, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [logId, item.product_id, 'in', item.quantity, product.stock_quantity, newStock, `Purchase order ${order.order_number}`, req.user.id]
        );
      }
    }

    await runQuery(
      "UPDATE purchase_orders SET status = 'received', received_date = datetime('now'), updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [req.params.id]
    );

    res.json({ message: 'Purchase order received' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'manager', 'inventory'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    await runQuery(
      'UPDATE purchase_orders SET status=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [status || 'pending', notes || '', req.params.id]
    );
    res.json({ message: 'Purchase order updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await runQuery('DELETE FROM purchase_order_items WHERE purchase_order_id = ?', [req.params.id]);
    await runQuery('DELETE FROM purchase_orders WHERE id = ?', [req.params.id]);
    res.json({ message: 'Purchase order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
