const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, ref: 'Employee' },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  logDate: { type: Date, required: true },
  logTime: { type: String, required: true },
  direction: { type: String, enum: ['IN', 'OUT'], required: true },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);