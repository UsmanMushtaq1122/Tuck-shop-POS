const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  localId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  categoryId: String,
  barcode: String,
  sku: { type: String, unique: true },
  description: String,
  image: String,
  purchasePrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, required: true },
  stockQuantity: { type: Number, default: 0 },
  minStock: { type: Number, default: 5 },
  taxRate: { type: Number, default: 0 },
  expiryDate: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('CloudProduct', productSchema);
