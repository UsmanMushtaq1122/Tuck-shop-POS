const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../local-db/pos.db');

let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(DB_PATH);
    db.configure('busyTimeout', 5000);
  }
  return db;
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDb();
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function initSQLite() {
  const database = getDb();
  
  return new Promise((resolve, reject) => {
    database.serialize(() => {
      database.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        pin TEXT,
        phone TEXT,
        avatar TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category_id TEXT,
        barcode TEXT,
        sku TEXT UNIQUE,
        description TEXT,
        image TEXT,
        supplier_id TEXT,
        purchase_price REAL DEFAULT 0,
        selling_price REAL NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        min_stock INTEGER DEFAULT 5,
        tax_rate REAL DEFAULT 0,
        expiry_date TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS product_variants (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sku TEXT,
        barcode TEXT,
        price REAL NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`);

      database.run(`CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_variants_barcode ON product_variants(barcode)`);

      database.run(`CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        loyalty_points INTEGER DEFAULT 0,
        credit_balance REAL DEFAULT 0,
        total_purchases REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_id TEXT,
        user_id TEXT NOT NULL,
        subtotal REAL NOT NULL,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        notes TEXT,
        sync_status TEXT DEFAULT 'pending',
        sync_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        discount REAL DEFAULT 0,
        total REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS inventory_logs (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER,
        new_stock INTEGER,
        notes TEXT,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        receipt TEXT,
        is_recurring INTEGER DEFAULT 0,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS salaries (
        id TEXT PRIMARY KEY,
        employee_id TEXT,
        employee_name TEXT NOT NULL,
        amount REAL NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'paid',
        notes TEXT,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      database.run(`CREATE INDEX IF NOT EXISTS idx_salaries_month ON salaries(year, month)`);

      database.run(`CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact TEXT,
        email TEXT,
        address TEXT,
        phone TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        supplier_id TEXT,
        supplier_name TEXT,
        user_id TEXT,
        status TEXT DEFAULT 'pending',
        total_items INTEGER DEFAULT 0,
        total_quantity INTEGER DEFAULT 0,
        total_amount REAL DEFAULT 0,
        notes TEXT,
        received_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        purchase_order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        received_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )`);

      database.run(`CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_poi_order ON purchase_order_items(purchase_order_id)`);

      database.run(`CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        user_id TEXT,
        link TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`);

      database.run(`CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        size INTEGER,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      database.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_orders_sync ON orders(sync_status)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`);
      database.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`);

      database.get("SELECT COUNT(*) as count FROM users", async (err, row) => {
        if (err) return reject(err);
        if (row.count === 0) {
          const users = [
            { id: 'admin-001', name: 'Admin User', email: 'admin@tuckshop.com', password: await bcrypt.hash('admin123', 10), role: 'admin', pin: '1234' },
            { id: 'mgr-001', name: 'Ali Raza', email: 'manager@tuckshop.com', password: await bcrypt.hash('manager123', 10), role: 'manager', pin: '5678' },
            { id: 'csh-001', name: 'Sara Ali', email: 'cashier@tuckshop.com', password: await bcrypt.hash('cashier123', 10), role: 'cashier', pin: '1111' },
            { id: 'csh-002', name: 'Hamza Khan', email: 'hamza@tuckshop.com', password: await bcrypt.hash('hamza123', 10), role: 'cashier', pin: '2222' },
            { id: 'inv-001', name: 'Zainab Malik', email: 'inventory@tuckshop.com', password: await bcrypt.hash('inventory123', 10), role: 'inventory', pin: '3333' },
          ];

          for (const u of users) {
            database.run(
              `INSERT INTO users (id, name, email, password, role, pin, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
              [u.id, u.name, u.email, u.password, u.role, u.pin, '']
            );
          }
          console.log(`Seeded ${users.length} default users`);
        }
        resolve();
      });
    });
  });
}

module.exports = { getDb, runQuery, getOne, getAll, initSQLite };
