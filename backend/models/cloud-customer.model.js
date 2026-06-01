const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  localId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: String,
  email: String,
  address: String,
  loyaltyPoints: { type: Number, default: 0 },
  creditBalance: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('CloudCustomer', customerSchema);
