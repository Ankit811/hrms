const mongoose = require('mongoose');

const otClaimSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  name: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  date: { type: Date, required: true },
  hours: { type: Number, required: true },
  projectDetails: { type: String, required: true },
  compensatoryHours: { type: Number, default: 0 },
  paymentAmount: { type: Number, default: 0 },
  status: {
    hod: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    admin: { type: String, enum: ['Pending', 'Acknowledged'], default: 'Pending' },
    ceo: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  },
}, { timestamps: true });

module.exports = mongoose.model('OTClaim', otClaimSchema);