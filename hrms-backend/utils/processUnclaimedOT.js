const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const OTClaim = require('../models/OTClaim');
const Department = require('../models/Department');

async function processUnclaimedOT() {
  try {
    console.log('Running processUnclaimedOT...');
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Eligible departments
    const eligibleDepartments = ['Production', 'Store', 'AMETL', 'Admin'];
    const eligibleDeptIds = await Department.find({ name: { $in: eligibleDepartments } }).select('_id');

    // Find attendance records with unclaimed OT from yesterday
    const attendanceRecords = await Attendance.find({
      logDate: yesterday,
      ot: { $gte: 240 }, // At least 4 hours (240 minutes)
    }).populate({
      path: 'employeeId',
      populate: { path: 'department' }
    });

    for (const record of attendanceRecords) {
      const otHours = record.ot / 60;
      const employee = await Employee.findOne({ employeeId: record.employeeId });
      if (!employee) {
        console.warn(`No employee found for employeeId: ${record.employeeId}`);
        continue;
      }

      // Check if OT was claimed
      const existingClaim = await OTClaim.findOne({
        employeeId: record.employeeId,
        date: { $gte: yesterday, $lte: yesterday },
      });
      if (existingClaim) continue;

      let compensatoryHours = 0;
      const isEligible = eligibleDeptIds.some(id => id.equals(employee.department._id));
      if (isEligible) {
        // Eligible departments: 4 or 8 hours OT
        if (otHours === 4 || otHours >= 8) {
          compensatoryHours = otHours >= 8 ? 8 : 4;
        }
      } else {
        // Non-eligible departments: Sundays only
        if (yesterday.getDay() === 0 && otHours >= 4) {
          compensatoryHours = otHours >= 8 ? 8 : 4;
        }
      }

      if (compensatoryHours > 0) {
        await employee.addCompensatoryLeave(yesterday, compensatoryHours);
        record.ot = 0;
        await record.save();
        console.log(`Added ${compensatoryHours}h compensatory leave for employee ${record.employeeId} on ${yesterday.toISOString()}`);
      }
    }

    console.log('processUnclaimedOT completed.');
  } catch (err) {
    console.error('Error processing unclaimed OT:', err);
  }
}

module.exports = { processUnclaimedOT };
