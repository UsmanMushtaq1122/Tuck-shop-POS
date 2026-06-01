const mongoose = require('mongoose');

const syncLogSchema = new mongoose.Schema({
  localId: String,
  tableName: { type: String, required: true },
  recordId: { type: String, required: true },
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  status: { type: String, enum: ['pending', 'synced', 'failed'], default: 'pending' },
  retryCount: { type: Number, default: 0 },
  error: String,
}, { timestamps: true });

module.exports = mongoose.model('CloudSyncLog', syncLogSchema);
