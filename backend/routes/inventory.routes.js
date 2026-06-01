const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/products', authenticateToken, async (req, res) => {
  try {
    const { lowStock, outOfStock } = req.query;
    let sql = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_active = 1';
    const params = [];

    if (lowStock === 'true') {
      sql += ' AND p.stock_quantity <= p.min_stock';
    }
    if (outOfStock === 'true') {
      sql += ' AND p.stock_quantity = 0';
    }

    sql += ' ORDER BY p.stock_quantity ASC';
    const products = await getAll(sql, params);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/adjust', authenticateToken, authorizeRole('admin', 'manager', 'inventory'), async (req, res) => {
  try {
    const { product_id, type, quantity, notes } = req.body;

    const product = await getOne('SELECT stock_quantity FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = product.stock_quantity;
    let newStock;

    if (type === 'in') {
      newStock = previousStock + quantity;
    } else if (type === 'out') {
      newStock = previousStock - quantity;
      if (newStock < 0) newStock = 0;
    } else {
      newStock = quantity;
    }

    await runQuery('UPDATE products SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newStock, product_id]);

    const logId = `inv-${Date.now()}`;
    await runQuery(
      'INSERT INTO inventory_logs (id, product_id, type, quantity, previous_stock, new_stock, notes, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [logId, product_id, type, quantity, previousStock, newStock, notes, req.user.id]
    );

    res.json({ message: 'Inventory adjusted', previousStock, newStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { product_id } = req.query;
    let sql = `SELECT il.*, p.name as product_name, u.name as user_name 
               FROM inventory_logs il 
               LEFT JOIN products p ON il.product_id = p.id 
               LEFT JOIN users u ON il.user_id = u.id WHERE 1=1`;
    const params = [];

    if (product_id) {
      sql += ' AND il.product_id = ?';
      params.push(product_id);
    }

    sql += ' ORDER BY il.created_at DESC LIMIT 100';
    const logs = await getAll(sql, params);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const lowStock = await getAll(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.stock_quantity <= p.min_stock AND p.stock_quantity > 0 AND p.is_active = 1'
    );
    const outOfStock = await getAll(
      'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.stock_quantity = 0 AND p.is_active = 1'
    );
    res.json({ lowStock, outOfStock });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
