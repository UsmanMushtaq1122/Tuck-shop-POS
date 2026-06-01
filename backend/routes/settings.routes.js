const express = require('express');
const { getOne, getAll, runQuery } = require('../database/sqlite');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_SETTINGS = {
  shop_name: 'Tuck Shop POS',
  shop_address: '123 Main Street, Karachi',
  shop_phone: '+92 300 1234567',
  shop_email: 'info@tuckshop.com',
  shop_logo: '',
  tax_rate: '5',
  tax_number: 'TXN-123456789',
  tax_inclusive: 'false',
  currency: 'PKR',
  currency_symbol: 'Rs.',
  currency_position: 'before',
  decimal_places: '0',
  receipt_header: 'Thank you for your purchase!',
  receipt_footer: 'Visit us again!',
  paper_width: '80',
  auto_print: 'false',
  show_logo: 'true',
  show_tax: 'true',
  copies: '1',
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await getAll('SELECT key, value FROM settings');
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/', authenticateToken, authorizeRole('admin', 'manager'), async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      if (key in DEFAULT_SETTINGS) {
        await runQuery(
          'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
          [key, String(value)]
        );
      }
    }
    const rows = await getAll('SELECT key, value FROM settings');
    const settings = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json({ settings, message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
