const express = require('express');
const { getAll, getOne } = require('../database/sqlite');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 8) + '01';
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const todaySales = await getOne(
      "SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM orders WHERE date(created_at) = ? AND status != 'refunded'",
      [today]
    );
    const weekSales = await getOne(
      "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) >= ? AND status != 'refunded'",
      [weekStart]
    );
    const monthSales = await getOne(
      "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) >= ? AND status != 'refunded'",
      [monthStart]
    );

    const todayExpenses = await getOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date = ?', [today]);
    const monthExpenses = await getOne('SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ?', [monthStart]);

    const lowStock = await getOne(
      'SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock AND is_active = 1'
    );
    const outOfStock = await getOne(
      'SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND is_active = 1'
    );

    const bestSellers = await getAll(
      `SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.total) as total_revenue 
       FROM order_items oi 
       JOIN orders o ON oi.order_id = o.id 
       WHERE date(o.created_at) >= ? 
       GROUP BY oi.product_id 
       ORDER BY total_qty DESC 
       LIMIT 10`,
      [monthStart]
    );

    const recentOrders = await getAll(
      `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id = c.id 
       ORDER BY o.created_at DESC LIMIT 10`
    );

    const dailySales = await getAll(
      `SELECT date(created_at) as date, SUM(total) as total, COUNT(*) as count 
       FROM orders 
       WHERE date(created_at) >= ? AND status != 'refunded'
       GROUP BY date(created_at) 
       ORDER BY date ASC`,
      [weekStart]
    );

    const paymentMethods = await getAll(
      `SELECT payment_method, SUM(total) as total, COUNT(*) as count 
       FROM orders 
       WHERE date(created_at) >= ? AND status != 'refunded'
       GROUP BY payment_method`,
      [monthStart]
    );

    res.json({
      today: { sales: todaySales.total, orders: todaySales.count, expenses: todayExpenses.total, profit: todaySales.total - todayExpenses.total },
      week: { sales: weekSales.total },
      month: { sales: monthSales.total, expenses: monthExpenses.total, profit: monthSales.total - monthExpenses.total },
      inventory: { lowStock: lowStock.count, outOfStock: outOfStock.count },
      bestSellers,
      recentOrders,
      dailySales,
      paymentMethods,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const groupFormat = groupBy === 'month' ? "strftime('%Y-%m', created_at)" : "date(created_at)";
    const sales = await getAll(
      `SELECT ${groupFormat} as period, SUM(total) as revenue, COUNT(*) as orders, AVG(total) as avg_order 
       FROM orders 
       WHERE date(created_at) >= ? AND date(created_at) <= ? AND status != 'refunded'
       GROUP BY ${groupFormat} 
       ORDER BY period ASC`,
      [start, end]
    );

    res.json({ sales });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/profit-loss', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const revenue = await getOne(
      "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE date(created_at) >= ? AND date(created_at) <= ? AND status != 'refunded'",
      [start, end]
    );
    const expensesData = await getOne(
      'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date >= ? AND date <= ?',
      [start, end]
    );

    const salaryTotal = await getOne(
      'SELECT COALESCE(SUM(amount), 0) as total FROM salaries WHERE date >= ? AND date <= ?',
      [start, end]
    );

    const totalExpenses = expensesData.total + salaryTotal.total;

    res.json({
      revenue: revenue.total,
      expenses: totalExpenses,
      profit: revenue.total - totalExpenses,
      margin: revenue.total > 0 ? ((revenue.total - totalExpenses) / revenue.total * 100).toFixed(2) : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/staff-performance', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const staff = await getAll(
      `SELECT u.id, u.name, u.role, COUNT(o.id) as order_count, COALESCE(SUM(o.total), 0) as total_sales,
              COALESCE(AVG(o.total), 0) as avg_order_value
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id AND date(o.created_at) >= ? AND date(o.created_at) <= ? AND o.status != 'refunded'
       WHERE u.is_active = 1 AND u.role IN ('cashier', 'manager')
       GROUP BY u.id
       ORDER BY total_sales DESC`,
      [start, end]
    );

    const daily = await getAll(
      `SELECT u.name, date(o.created_at) as date, COUNT(o.id) as orders, COALESCE(SUM(o.total), 0) as sales
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE date(o.created_at) >= ? AND date(o.created_at) <= ? AND o.status != 'refunded'
       GROUP BY u.id, date(o.created_at)
       ORDER BY date, sales DESC`,
      [start, end]
    );

    res.json({ staff, daily });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/cash-flow', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const groupFormat = groupBy === 'month' ? "strftime('%Y-%m', date)" : 'date';

    const revenueData = await getAll(
      `SELECT ${groupFormat} as period, 'sales' as type, COALESCE(SUM(total), 0) as amount
       FROM orders
       WHERE date(created_at) >= ? AND date(created_at) <= ? AND status != 'refunded'
       GROUP BY ${groupFormat}`,
      [start, end]
    );

    const expenseData = await getAll(
      `SELECT ${groupFormat} as period, 'expenses' as type, COALESCE(SUM(amount), 0) as amount
       FROM expenses
       WHERE date >= ? AND date <= ?
       GROUP BY ${groupFormat}`,
      [start, end]
    );

    res.json({ inflows: revenueData, outflows: expenseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/inventory-report', authenticateToken, async (req, res) => {
  try {
    const totalProducts = await getOne('SELECT COUNT(*) as count FROM products WHERE is_active = 1');
    const totalValue = await getOne('SELECT COALESCE(SUM(purchase_price * stock_quantity), 0) as cost, COALESCE(SUM(selling_price * stock_quantity), 0) as retail FROM products WHERE is_active = 1');
    const lowStock = await getOne('SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock AND stock_quantity > 0 AND is_active = 1');
    const outOfStock = await getOne('SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND is_active = 1');

    const byCategory = await getAll(
      `SELECT c.name, c.color, COUNT(p.id) as product_count, COALESCE(SUM(p.stock_quantity), 0) as total_stock,
              COALESCE(SUM(p.selling_price * p.stock_quantity), 0) as total_value
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
       GROUP BY c.id
       ORDER BY total_value DESC`
    );

    const topProducts = await getAll(
      `SELECT name, sku, stock_quantity, selling_price, purchase_price,
              (selling_price - purchase_price) * stock_quantity as potential_profit
       FROM products WHERE is_active = 1 ORDER BY stock_quantity * selling_price DESC LIMIT 10`
    );

    res.json({
      totalProducts: totalProducts.count,
      costValue: totalValue.cost,
      retailValue: totalValue.retail,
      lowStock: lowStock.count,
      outOfStock: outOfStock.count,
      byCategory,
      topProducts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export', authenticateToken, async (req, res) => {
  try {
    const { type, startDate, endDate, format } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    let data = [];
    let headers = [];
    let filename = '';

    if (type === 'sales') {
      headers = ['Date', 'Order #', 'Customer', 'Items', 'Total', 'Payment', 'Cashier', 'Status'];
      const orders = await getAll(
        `SELECT o.order_number, c.name as customer_name, o.total, o.payment_method, o.status,
                u.name as cashier, o.created_at
         FROM orders o
         LEFT JOIN customers c ON o.customer_id = c.id
         LEFT JOIN users u ON o.user_id = u.id
         WHERE date(o.created_at) >= ? AND date(o.created_at) <= ?
         ORDER BY o.created_at DESC`,
        [start, end]
      );
      data = orders;
      filename = `sales-report-${start}-to-${end}`;
    } else if (type === 'products') {
      headers = ['Name', 'SKU', 'Barcode', 'Category', 'Stock', 'Cost', 'Price', 'Value'];
      const products = await getAll(
        `SELECT p.name, p.sku, p.barcode, c.name as category, p.stock_quantity, p.purchase_price, p.selling_price
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.is_active = 1
         ORDER BY p.name`,
        []
      );
      data = products;
      filename = `inventory-report-${new Date().toISOString().split('T')[0]}`;
    } else if (type === 'expenses') {
      headers = ['Date', 'Category', 'Description', 'Amount', 'Recorded By'];
      const expenses = await getAll(
        `SELECT e.date, e.category, e.description, e.amount, u.name as user_name
         FROM expenses e
         LEFT JOIN users u ON e.user_id = u.id
         WHERE e.date >= ? AND e.date <= ?
         ORDER BY e.date DESC`,
        [start, end]
      );
      data = expenses;
      filename = `expenses-report-${start}-to-${end}`;
    } else {
      headers = ['Period', 'Revenue', 'Expenses', 'Profit', 'Margin'];
      const report = await getAll(
        `SELECT date(created_at) as period,
                COALESCE(SUM(CASE WHEN status != 'refunded' THEN total ELSE 0 END), 0) as revenue,
                0 as expenses
         FROM orders
         WHERE date(created_at) >= ? AND date(created_at) <= ?
         GROUP BY date(created_at)
         ORDER BY period`,
        [start, end]
      );
      data = report;
      filename = `profit-loss-report-${start}-to-${end}`;
    }

    const csvRows = [headers.join(',')];
    for (const row of data) {
      const values = headers.map(h => {
        const key = h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '');
        const val = row[key] !== undefined ? row[key] : row[h.toLowerCase()] || '';
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      });
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
