const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  localId: { type: String, required: true, unique: true },
  orderNumber: { type: String, required: true, unique: true },
  customerId: String,
  userId: { type: String, required: true },
  items: [{
    productId: String,
    productName: String,
    quantity: Number,
    price: Number,
    discount: Number,
    total: Number,
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  status: { type: String, default: 'completed' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('CloudOrder', orderSchema);
