const { getAll, runQuery } = require('../database/sqlite');

let isOnline = false;
let syncInterval = null;
let mongoSyncService = null;

async function checkConnection() {
  try {
    const response = await fetch('https://www.google.com', { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function syncPendingItems() {
  if (!isOnline) return;

  try {
    const pending = await getAll("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50");

    for (const item of pending) {
      try {
        const data = JSON.parse(item.data);
        await syncToCloud(item.table_name, item.action, data);
        await runQuery("UPDATE sync_queue SET status = 'synced' WHERE id = ?", [item.id]);
        console.log(`Synced: ${item.table_name}/${item.record_id}`);
      } catch (error) {
        await runQuery(
          "UPDATE sync_queue SET status = 'failed', retry_count = retry_count + 1, error = ? WHERE id = ?",
          [error.message, item.id]
        );
        console.error(`Sync failed: ${item.table_name}/${item.record_id} - ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Sync process error:', error.message);
  }
}

async function syncToCloud(tableName, action, data) {
  if (!process.env.MONGODB_URI) return;

  const cloudModel = getCloudModel(tableName);
  if (!cloudModel) return;

  switch (action) {
    case 'create':
      await cloudModel.create(mapToCloudSchema(tableName, data));
      break;
    case 'update':
      await cloudModel.findOneAndUpdate({ localId: data.id }, mapToCloudSchema(tableName, data), { upsert: true });
      break;
    case 'delete':
      await cloudModel.findOneAndDelete({ localId: data.id });
      break;
  }
}

function getCloudModel(tableName) {
  const models = {
    products: require('../models/cloud-product.model'),
    orders: require('../models/cloud-order.model'),
    customers: require('../models/cloud-customer.model'),
    users: require('../models/cloud-user.model'),
  };
  return models[tableName];
}

function mapToCloudSchema(tableName, data) {
  const mappings = {
    products: {
      localId: data.id,
      name: data.name,
      categoryId: data.category_id,
      barcode: data.barcode,
      sku: data.sku,
      description: data.description,
      image: data.image,
      purchasePrice: data.purchase_price,
      sellingPrice: data.selling_price,
      stockQuantity: data.stock_quantity,
      minStock: data.min_stock,
      taxRate: data.tax_rate,
      expiryDate: data.expiry_date,
      isActive: data.is_active,
    },
    orders: {
      localId: data.id,
      orderNumber: data.order_number,
      customerId: data.customer_id,
      userId: data.user_id,
      items: data.items || [],
      subtotal: data.subtotal,
      discount: data.discount,
      tax: data.tax,
      total: data.total,
      paymentMethod: data.payment_method,
      status: data.status,
      notes: data.notes,
    },
    customers: {
      localId: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      loyaltyPoints: data.loyalty_points,
      creditBalance: data.credit_balance,
      totalPurchases: data.total_purchases,
    },
  };
  return mappings[tableName] || data;
}

function startSyncEngine() {
  syncInterval = setInterval(async () => {
    const wasOnline = isOnline;
    isOnline = await checkConnection();

    if (isOnline && !wasOnline) {
      console.log('Connection restored. Starting sync...');
    } else if (!isOnline && wasOnline) {
      console.log('Connection lost. Queuing changes locally.');
    }

    if (isOnline) {
      await syncPendingItems();
    }
  }, 30000);

  console.log('Sync engine started (30s interval)');
}

function stopSyncEngine() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

function getSyncStatus() {
  return { isOnline, lastSync: new Date().toISOString() };
}

module.exports = {
  startSyncEngine,
  stopSyncEngine,
  getSyncStatus,
  syncPendingItems,
  checkConnection,
};
