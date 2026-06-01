const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const categories = await getAll(`SELECT c.*, COUNT(p.id) as product_count 
      FROM categories c 
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1 
      GROUP BY c.id 
      ORDER BY c.name ASC`);
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const category = await getOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const products = await getAll('SELECT * FROM products WHERE category_id = ? AND is_active = 1 ORDER BY name ASC', [req.params.id]);
    res.json({ category, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { id, name, description, icon, color } = req.body;
    const categoryId = id || `cat-${Date.now()}`;
    await runQuery(
      'INSERT INTO categories (id, name, description, icon, color) VALUES (?, ?, ?, ?, ?)',
      [categoryId, name, description, icon, color]
    );
    res.status(201).json({ message: 'Category created', id: categoryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, description, icon, color, is_active } = req.body;
    await runQuery(
      'UPDATE categories SET name=?, description=?, icon=?, color=?, is_active=? WHERE id=?',
      [name, description, icon, color, is_active, req.params.id]
    );
    res.json({ message: 'Category updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const productCount = await getOne('SELECT COUNT(*) as count FROM products WHERE category_id = ? AND is_active = 1', [req.params.id]);
    if (productCount.count > 0) {
      return res.status(400).json({ error: `Cannot delete category with ${productCount.count} active products` });
    }
    await runQuery('UPDATE categories SET is_active=0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
