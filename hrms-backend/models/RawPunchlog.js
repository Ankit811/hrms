const mongoose = require('mongoose');

const rawPunchlogSchema = new mongoose.Schema({
  UserID: {
    type: String,
    required: true,
  },
  LogDate: {
    type: Date,
    required: true,
  },
  LogTime: {
    type: String, // Changed from Date to String
    required: true,
  },
  Direction: {
    type: String,
    enum: ['in', 'out'],
    default: 'out',
  },
  processed: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('RawPunchlog', rawPunchlogSchema);