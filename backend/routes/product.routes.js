const express = require('express');
const { getAll, getOne, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { generateId, generateBarcode } = require('../utils/helpers');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, category, active, lowStock, outOfStock, expirySoon } = req.query;
    let sql = `SELECT p.*, c.name as category_name, c.color as category_color, c.icon as category_icon
               FROM products p 
               LEFT JOIN categories c ON p.category_id = c.id 
               WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (p.name LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }
    if (active !== undefined) {
      sql += ' AND p.is_active = ?';
      params.push(active === 'true' ? 1 : 0);
    }
    if (lowStock === 'true') {
      sql += ' AND p.stock_quantity <= p.min_stock AND p.stock_quantity > 0';
    }
    if (outOfStock === 'true') {
      sql += ' AND p.stock_quantity = 0';
    }
    if (expirySoon === 'true') {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      sql += ' AND p.expiry_date IS NOT NULL AND p.expiry_date <= ? AND p.expiry_date >= date("now")';
      params.push(thirtyDays.toISOString().split('T')[0]);
    }

    sql += ' ORDER BY p.name ASC';
    const products = await getAll(sql, params);
    const productsWithProfit = products.map(p => ({
      ...p,
      profit_margin: p.purchase_price > 0 ? (((p.selling_price - p.purchase_price) / p.purchase_price) * 100).toFixed(1) : 0,
      profit_per_unit: p.selling_price - p.purchase_price,
      total_value: p.selling_price * p.stock_quantity,
      is_expired: p.expiry_date ? new Date(p.expiry_date) < new Date() : false,
      expiry_status: getExpiryStatus(p.expiry_date),
    }));
    res.json({ products: productsWithProfit });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function getExpiryStatus(expiryDate) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'critical';
  if (diffDays <= 30) return 'warning';
  return 'good';
}

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const total = await getOne('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
    const lowStock = await getOne('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock AND stock_quantity > 0 AND is_active = 1');
    const outOfStock = await getOne('SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND is_active = 1');
    const totalValue = await getOne('SELECT COALESCE(SUM(selling_price * stock_quantity), 0) as value FROM products WHERE is_active = 1');
    const expiringSoon = await getOne(`SELECT COUNT(*) as count FROM products WHERE expiry_date IS NOT NULL AND expiry_date <= date('now', '+30 days') AND expiry_date >= date('now') AND is_active = 1`);
    const expired = await getOne(`SELECT COUNT(*) as count FROM products WHERE expiry_date < date('now') AND is_active = 1`);
    res.json({
      total: total.count,
      lowStock: lowStock.count,
      outOfStock: outOfStock.count,
      totalValue: totalValue.value,
      expiringSoon: expiringSoon.count,
      expired: expired.count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const product = await getOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const variants = await getAll('SELECT * FROM product_variants WHERE product_id = ? ORDER BY name ASC', [req.params.id]);
    res.json({ product, variants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/barcode/:barcode', authenticateToken, async (req, res) => {
  try {
    const product = await getOne('SELECT * FROM products WHERE barcode = ? AND is_active = 1', [req.params.barcode]);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/generate-barcode', authenticateToken, async (req, res) => {
  try {
    const barcode = generateBarcode();
    res.json({ barcode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, category_id, barcode, sku, description, image, supplier_id, purchase_price, selling_price, stock_quantity, min_stock, tax_rate, expiry_date, variants } = req.body;
    const productId = `prod-${Date.now()}`;
    const productBarcode = barcode || generateBarcode();
    const productSku = sku || `SKU-${name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;

    await runQuery(
      `INSERT INTO products (id, name, category_id, barcode, sku, description, image, supplier_id, purchase_price, selling_price, stock_quantity, min_stock, tax_rate, expiry_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, name, category_id, productBarcode, productSku, description, image, supplier_id || null, purchase_price || 0, selling_price, stock_quantity || 0, min_stock || 5, tax_rate || 0, expiry_date]
    );

    if (variants && variants.length > 0) {
      for (const variant of variants) {
        const variantId = `var-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        await runQuery(
          'INSERT INTO product_variants (id, product_id, name, sku, barcode, price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [variantId, productId, variant.name, variant.sku || '', variant.barcode || '', variant.price || selling_price, variant.stock_quantity || 0]
        );
      }
    }

    res.status(201).json({ message: 'Product created', id: productId, barcode: productBarcode, sku: productSku });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/bulk-import', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { products } = req.body;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (const prod of products) {
      try {
        const existing = await getOne('SELECT id FROM products WHERE barcode = ? OR sku = ?', [prod.barcode, prod.sku]);
        const productId = existing ? existing.id : `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const barcode = prod.barcode || generateBarcode();
        const sku = prod.sku || `SKU-${prod.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 10000)}`;

        if (existing) {
          await runQuery(
            `UPDATE products SET name=?, category_id=?, barcode=?, sku=?, description=?, image=?, supplier_id=?, purchase_price=?, selling_price=?, stock_quantity=?, min_stock=?, tax_rate=?, expiry_date=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
            [prod.name, prod.category_id, barcode, sku, prod.description, prod.image, prod.supplier_id || null, prod.purchase_price || 0, prod.selling_price, prod.stock_quantity || 0, prod.min_stock || 5, prod.tax_rate || 0, prod.expiry_date, productId]
          );
          results.updated++;
        } else {
          await runQuery(
            `INSERT INTO products (id, name, category_id, barcode, sku, description, image, supplier_id, purchase_price, selling_price, stock_quantity, min_stock, tax_rate, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [productId, prod.name, prod.category_id, barcode, sku, prod.description, prod.image, prod.supplier_id || null, prod.purchase_price || 0, prod.selling_price, prod.stock_quantity || 0, prod.min_stock || 5, prod.tax_rate || 0, prod.expiry_date]
          );
          results.created++;
        }
      } catch (err) {
        results.errors.push({ product: prod.name, error: err.message });
      }
    }

    res.json({ message: `Bulk import complete`, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, category_id, barcode, sku, description, image, supplier_id, purchase_price, selling_price, stock_quantity, min_stock, tax_rate, expiry_date, is_active } = req.body;

    await runQuery(
      `UPDATE products SET name=?, category_id=?, barcode=?, sku=?, description=?, image=?, supplier_id=?, purchase_price=?, selling_price=?, stock_quantity=?, min_stock=?, tax_rate=?, expiry_date=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [name, category_id, barcode, sku, description, image, supplier_id || null, purchase_price, selling_price, stock_quantity, min_stock, tax_rate, expiry_date, is_active, req.params.id]
    );

    res.json({ message: 'Product updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await runQuery('UPDATE products SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    await runQuery('UPDATE product_variants SET is_active=0 WHERE product_id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/low-stock', authenticateToken, async (req, res) => {
  try {
    const products = await getAll('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.stock_quantity <= p.min_stock AND p.is_active = 1 ORDER BY p.stock_quantity ASC');
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/expiring', authenticateToken, async (req, res) => {
  try {
    const products = await getAll(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.expiry_date IS NOT NULL AND p.expiry_date <= date('now', '+30 days') AND p.is_active = 1 ORDER BY p.expiry_date ASC`);
    res.json({ products: products.map(p => ({ ...p, expiry_status: getExpiryStatus(p.expiry_date) })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/variants', authenticateToken, async (req, res) => {
  try {
    const variants = await getAll('SELECT * FROM product_variants WHERE product_id = ? AND is_active = 1 ORDER BY name ASC', [req.params.id]);
    res.json({ variants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/variants', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, sku, barcode, price, stock_quantity } = req.body;
    const variantId = `var-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await runQuery(
      'INSERT INTO product_variants (id, product_id, name, sku, barcode, price, stock_quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [variantId, req.params.id, name, sku, barcode, price, stock_quantity || 0]
    );
    res.status(201).json({ message: 'Variant created', id: variantId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/variants/:variantId', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, sku, barcode, price, stock_quantity, is_active } = req.body;
    await runQuery(
      'UPDATE product_variants SET name=?, sku=?, barcode=?, price=?, stock_quantity=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [name, sku, barcode, price, stock_quantity, is_active, req.params.variantId]
    );
    res.json({ message: 'Variant updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/variants/:variantId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    await runQuery('UPDATE product_variants SET is_active=0 WHERE id = ?', [req.params.variantId]);
    res.json({ message: 'Variant deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
