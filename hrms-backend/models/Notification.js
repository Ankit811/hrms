const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  alertType: { type: String, enum: ['warning', 'termination', null], default: null },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
