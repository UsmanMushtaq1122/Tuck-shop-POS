const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'cashier'], default: 'cashier' },
  pin: String,
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ip: String,
    device: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('CloudUser', userSchema);
