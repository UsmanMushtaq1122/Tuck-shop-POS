const { runQuery, getOne, getAll } = require('../database/sqlite');
const { generateId, generateBarcode } = require('../utils/helpers');

async function seedDatabase() {
  console.log('Seeding database...');

  const categories = [
    { id: 'cat-snacks', name: 'Snacks', icon: 'cookie', color: '#F59E0B' },
    { id: 'cat-drinks', name: 'Drinks', icon: 'cup', color: '#3B82F6' },
    { id: 'cat-stationery', name: 'Stationery', icon: 'pen', color: '#10B981' },
    { id: 'cat-fastfood', name: 'Fast Food', icon: 'burger', color: '#EF4444' },
    { id: 'cat-icecream', name: 'Ice Cream', icon: 'ice', color: '#8B5CF6' },
    { id: 'cat-chocolates', name: 'Chocolates', icon: 'candy', color: '#EC4899' },
    { id: 'cat-bakery', name: 'Bakery', icon: 'bread', color: '#F97316' },
    { id: 'cat-grocery', name: 'Grocery', icon: 'bag', color: '#14B8A6' },
  ];

  for (const cat of categories) {
    const exists = await getOne('SELECT id FROM categories WHERE id = ?', [cat.id]);
    if (!exists) {
      await runQuery(
        'INSERT INTO categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
        [cat.id, cat.name, cat.icon, cat.color]
      );
    }
  }

  const products = [
    { name: 'Lays Chips', category_id: 'cat-snacks', purchase_price: 30, selling_price: 50, stock_quantity: 100, min_stock: 10 },
    { name: 'Kurkure', category_id: 'cat-snacks', purchase_price: 20, selling_price: 30, stock_quantity: 80, min_stock: 10 },
    { name: 'Oreo Cookies', category_id: 'cat-snacks', purchase_price: 40, selling_price: 60, stock_quantity: 50, min_stock: 5 },
    { name: 'Coca Cola 500ml', category_id: 'cat-drinks', purchase_price: 80, selling_price: 100, stock_quantity: 120, min_stock: 20 },
    { name: 'Pepsi 500ml', category_id: 'cat-drinks', purchase_price: 80, selling_price: 100, stock_quantity: 100, min_stock: 20 },
    { name: 'Mineral Water 1.5L', category_id: 'cat-drinks', purchase_price: 40, selling_price: 60, stock_quantity: 200, min_stock: 30 },
    { name: 'Fruit Juice Box', category_id: 'cat-drinks', purchase_price: 50, selling_price: 70, stock_quantity: 60, min_stock: 10 },
    { name: 'Notebook A4', category_id: 'cat-stationery', purchase_price: 80, selling_price: 120, stock_quantity: 40, min_stock: 5 },
    { name: 'Ball Pen (Pack of 5)', category_id: 'cat-stationery', purchase_price: 100, selling_price: 150, stock_quantity: 30, min_stock: 5 },
    { name: 'Pencil Box', category_id: 'cat-stationery', purchase_price: 50, selling_price: 80, stock_quantity: 25, min_stock: 5 },
    { name: 'Samosa (Piece)', category_id: 'cat-fastfood', purchase_price: 20, selling_price: 35, stock_quantity: 50, min_stock: 10 },
    { name: 'Roll (Chicken)', category_id: 'cat-fastfood', purchase_price: 60, selling_price: 100, stock_quantity: 30, min_stock: 5 },
    { name: 'Bun Kebab', category_id: 'cat-fastfood', purchase_price: 50, selling_price: 80, stock_quantity: 40, min_stock: 10 },
    { name: 'Ice Cream Cup', category_id: 'cat-icecream', purchase_price: 80, selling_price: 120, stock_quantity: 30, min_stock: 5 },
    { name: 'Ice Cream Bar', category_id: 'cat-icecream', purchase_price: 60, selling_price: 90, stock_quantity: 40, min_stock: 10 },
    { name: 'Dairy Milk', category_id: 'cat-chocolates', purchase_price: 100, selling_price: 150, stock_quantity: 50, min_stock: 10 },
    { name: 'KitKat', category_id: 'cat-chocolates', purchase_price: 50, selling_price: 70, stock_quantity: 60, min_stock: 10 },
    { name: 'Snickers', category_id: 'cat-chocolates', purchase_price: 80, selling_price: 120, stock_quantity: 40, min_stock: 5 },
    { name: 'Bread Loaf', category_id: 'cat-bakery', purchase_price: 80, selling_price: 110, stock_quantity: 20, min_stock: 5 },
    { name: 'Cake Slice', category_id: 'cat-bakery', purchase_price: 60, selling_price: 90, stock_quantity: 15, min_stock: 5 },
    { name: 'Biscuit Pack', category_id: 'cat-bakery', purchase_price: 40, selling_price: 60, stock_quantity: 80, min_stock: 10 },
    { name: 'Sugar 1kg', category_id: 'cat-grocery', purchase_price: 150, selling_price: 180, stock_quantity: 25, min_stock: 5 },
    { name: 'Tea Bags (20pc)', category_id: 'cat-grocery', purchase_price: 200, selling_price: 280, stock_quantity: 20, min_stock: 5 },
    { name: 'Instant Noodles', category_id: 'cat-grocery', purchase_price: 40, selling_price: 60, stock_quantity: 100, min_stock: 15 },
  ];

  for (const prod of products) {
    const exists = await getOne('SELECT id FROM products WHERE name = ?', [prod.name]);
    if (!exists) {
      const id = generateId('prod');
      const barcode = generateBarcode();
      const sku = `SKU-${prod.name.substring(0, 3).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

      await runQuery(
        `INSERT INTO products (id, name, category_id, barcode, sku, purchase_price, selling_price, stock_quantity, min_stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, prod.name, prod.category_id, barcode, sku, prod.purchase_price, prod.selling_price, prod.stock_quantity, prod.min_stock]
      );
    }
  }

  const customers = [
    { name: 'Ahmed Khan', phone: '03001234567', email: 'ahmed@email.com' },
    { name: 'Sara Ali', phone: '03009876543', email: 'sara@email.com' },
    { name: 'Usman Raza', phone: '03011223344' },
    { name: 'Fatima Noor', phone: '03025556677', email: 'fatima@email.com' },
    { name: 'Ali Hassan', phone: '03038889900' },
  ];

  for (const cust of customers) {
    const exists = await getOne('SELECT id FROM customers WHERE phone = ?', [cust.phone]);
    if (!exists) {
      const id = generateId('cust');
      await runQuery(
        'INSERT INTO customers (id, name, phone, email) VALUES (?, ?, ?, ?)',
        [id, cust.name, cust.phone, cust.email || '']
      );
    }
  }

  const suppliers = [
    { id: generateId('sup'), name: 'ABC Distributors', contact: 'Mr. Khan', phone: '03001111111', email: 'abc@dist.com', address: 'Main Market, Lahore' },
    { id: generateId('sup'), name: 'XYZ Wholesale', contact: 'Mr. Ahmed', phone: '03002222222', email: 'xyz@wholesale.com', address: 'Hall Road, Lahore' },
    { id: generateId('sup'), name: 'Fresh Supplies', contact: 'Mr. Ali', phone: '03003333333', email: 'fresh@supplies.com', address: 'Gulberg, Lahore' },
    { id: generateId('sup'), name: 'PepsiCo Pakistan', contact: '+92 21 12345678', phone: '03004444444', email: 'orders@pepsico.pk', address: 'Plot 123, Industrial Area, Karachi' },
    { id: generateId('sup'), name: 'Engro Foods', contact: '+92 21 55667788', phone: '03005555555', email: 'dairy@engro.com', address: 'Korangi Industrial, Karachi' },
  ];

  const supplierIds = [];
  for (const sup of suppliers) {
    const exists = await getOne('SELECT id FROM suppliers WHERE name = ?', [sup.name]);
    if (!exists) {
      await runQuery(
        'INSERT INTO suppliers (id, name, contact, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)',
        [sup.id, sup.name, sup.contact, sup.phone, sup.email, sup.address]
      );
      supplierIds.push(sup.id);
    } else {
      supplierIds.push(exists.id);
    }
  }

  const existingProducts = await getAll('SELECT id, name FROM products WHERE is_active = 1 LIMIT 10');
  if (existingProducts.length > 0) {
    const poExists = await getOne("SELECT id FROM purchase_orders WHERE order_number = 'PO-SEED001'");
    if (!poExists) {
      const poId = generateId('po');
      await runQuery(
        `INSERT INTO purchase_orders (id, order_number, supplier_id, supplier_name, user_id, status, total_items, total_quantity, total_amount, notes, created_at)
         VALUES (?, ?, ?, ?, ?, 'received', ?, ?, ?, 'Initial stock order', datetime('now', '-5 days'))`,
        [poId, 'PO-SEED001', supplierIds[0] || '', 'ABC Distributors', 'admin-001', Math.min(existingProducts.length, 5), 100, 5000]
      );
      for (let i = 0; i < Math.min(existingProducts.length, 5); i++) {
        const p = existingProducts[i];
        const itemId = generateId('poi');
        await runQuery(
          'INSERT INTO purchase_order_items (id, purchase_order_id, product_id, product_name, quantity, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [itemId, poId, p.id, p.name, 20, 50, 1000]
        );
      }
    }
  }

  const salaryExists = await getOne("SELECT id FROM salaries WHERE employee_name = 'Admin User'");
  if (!salaryExists) {
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentYear = new Date().getFullYear();
    const sampleSalaries = [
      { employee_id: 'admin-001', employee_name: 'Admin User', amount: 50000 },
      { employee_id: 'mgr-001', employee_name: 'Ali Raza', amount: 45000 },
      { employee_id: 'csh-001', employee_name: 'Sara Ali', amount: 25000 },
      { employee_id: 'csh-002', employee_name: 'Hamza Khan', amount: 25000 },
      { employee_id: 'inv-001', employee_name: 'Zainab Malik', amount: 30000 },
    ];
    for (const sal of sampleSalaries) {
      await runQuery(
        'INSERT INTO salaries (id, employee_id, employee_name, amount, month, year, date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [generateId('sal'), sal.employee_id, sal.employee_name, sal.amount, currentMonth, currentYear, new Date().toISOString().split('T')[0], 'paid', 'Monthly salary']
      );
    }
  }

  const sampleExpenses = [
    { category: 'Rent', amount: 25000, description: 'Monthly shop rent' },
    { category: 'Electricity', amount: 8500, description: 'Monthly electricity bill' },
    { category: 'Supplies', amount: 3200, description: 'Cleaning and packaging supplies' },
    { category: 'Internet', amount: 3000, description: 'Monthly internet bill' },
    { category: 'Maintenance', amount: 5000, description: 'AC repair' },
  ];
  for (const exp of sampleExpenses) {
    const exists = await getOne('SELECT id FROM expenses WHERE description = ? AND date >= date("now", "-30 days")', [exp.description]);
    if (!exists) {
      const daysAgo = Math.floor(Math.random() * 20) + 1;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      await runQuery(
        'INSERT INTO expenses (id, category, amount, description, date, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [generateId('exp'), exp.category, exp.amount, exp.description, date.toISOString().split('T')[0], 'admin-001']
      );
    }
  }

  console.log('Database seeded successfully!');
}

module.exports = { seedDatabase };
