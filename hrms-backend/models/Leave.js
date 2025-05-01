const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  name: { type: String, required: true },
  position: { type: String, required: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  leaveType: { type: String, enum: ['Paid', 'Unpaid'], required: true },
  category: { type: String, enum: ['Casual', 'Sick'], required: true },
  halfDay: {
    time: { type: String, enum: ['Afternoon', 'Before noon'] },
    date: { type: Date }
  },
  fullDay: {
    from: { type: Date },
    to: { type: Date }
  },
  reason: { type: String, required: true },
  chargeGivenTo: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  status: {
    hod: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    admin: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    ceo: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  },
  isCompensatory: { type: Boolean, default: false },
  compensatoryDetails: {
    date: { type: Date },
    day: { type: String },
    project: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Leave', leaveSchema);
