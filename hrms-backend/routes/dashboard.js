const express = require('express');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const OT = require('../models/OTClaim');
const OD = require('../models/OD');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, role(['Admin', 'CEO', 'HOD']), async (req, res) => {
  try {
    const { loginType, employeeId } = req.user;
    let departmentId = null;

    if (loginType === 'HOD') {
      const hod = await Employee.findOne({ employeeId }).select('department');
      if (!hod || !hod.department || !hod.department._id) {
        console.error(`HOD department not found for employeeId: ${employeeId}`);
        return res.status(400).json({ message: 'HOD department not found' });
      }
      departmentId = hod.department._id;
      console.log(`HOD departmentId: ${departmentId}`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const employeeMatch = departmentId ? { department: departmentId, status: 'Working' } : { status: 'Working' };
    const employeeStats = await Employee.aggregate([
      { $match: employeeMatch },
      {
        $addFields: {
          effectiveStatus: {
            $cond: {
              if: {
                $and: [
                  { $eq: ['$employeeType', 'Probation'] },
                  { $ne: ['$confirmationDate', null] },
                  { $lte: ['$confirmationDate', new Date()] },
                ],
              },
              then: 'Confirmed',
              else: '$employeeType',
            },
          },
        },
      },
      {
        $group: {
          _id: '$effectiveStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    const employeeCounts = {
      Confirmed: 0,
      Probation: 0,
      Contractual: 0,
      Intern: 0,
    };
    employeeStats.forEach(stat => {
      if (stat._id && ['Confirmed', 'Probation', 'Contractual', 'Intern'].includes(stat._id)) {
        employeeCounts[stat._id] = stat.count;
      }
    });

    const attendanceMatch = {
      logDate: { $gte: today, $lt: tomorrow },
      status: 'Present',
    };
    if (departmentId) {
      let deptEmployees;
      try {
        deptEmployees = await Employee.find({ department: departmentId }).select('employeeId');
      } catch (empError) {
        console.error('Employee find error for attendance:', empError.stack);
        throw new Error('Failed to fetch department employees');
      }
      attendanceMatch.employeeId = { $in: deptEmployees.map(e => e.employeeId) };
    }
    let presentToday;
    try {
      presentToday = await Attendance.countDocuments(attendanceMatch);
    } catch (attError) {
      console.error('Attendance count error:', attError.stack);
      throw new Error('Failed to count attendance');
    }

    let leaveMatch = {};
    let pendingLeaves;
    try {
      if (loginType === 'Admin') {
        let adminEmployeeIds = [];
        try {
          const adminEmployees = await Employee.find({ loginType: 'Admin' }).select('_id');
          adminEmployeeIds = adminEmployees.map(e => e._id);
          console.log(`Admin: Excluded employee IDs: ${adminEmployeeIds}`);
        } catch (empError) {
          console.error('Error fetching Admin employees:', empError.stack);
          throw new Error('Failed to fetch Admin employee IDs');
        }
        leaveMatch = {
          'status.ceo': 'Approved',
          'status.admin': 'Pending',
          employee: { $nin: adminEmployeeIds }
        };
      } else if (loginType === 'CEO') {
        leaveMatch = {
          'status.hod': 'Approved',
          'status.ceo': 'Pending',
        };
      } else if (loginType === 'HOD') {
        let hodAdminEmployeeIds = [];
        try {
          const hodAdminEmployees = await Employee.find({ loginType: { $in: ['HOD', 'Admin'] } }).select('_id');
          hodAdminEmployeeIds = hodAdminEmployees.map(e => e._id);
          console.log(`HOD: Excluded employee IDs: ${hodAdminEmployeeIds}`);
        } catch (empError) {
          console.error('Error fetching HOD/Admin employees:', empError.stack);
          throw new Error('Failed to fetch HOD/Admin employee IDs');
        }
        leaveMatch = {
          'status.hod': 'Pending',
          department: departmentId, // Fixed field name to match Leave schema
          employee: { $nin: hodAdminEmployeeIds }
        };
        console.log(`HOD leaveMatch query: ${JSON.stringify(leaveMatch)}`);
      }
      pendingLeaves = await Leave.countDocuments(leaveMatch);
      console.log(`Pending leaves for ${loginType}: ${pendingLeaves}`);
    } catch (leaveError) {
      console.error('Leave count error:', leaveError.stack);
      throw new Error('Failed to count pending leaves');
    }

    const stats = {
      confirmedEmployees: employeeCounts.Confirmed,
      probationEmployees: employeeCounts.Probation,
      contractualEmployees: employeeCounts.Contractual,
      internEmployees: employeeCounts.Intern,
      presentToday,
      pendingLeaves,
    };

    console.log(`Dashboard stats for ${loginType}:`, stats);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Endpoint for employee info
router.get('/employee-info', auth, role(['Employee', 'HOD', 'Admin']), async (req, res) => {
  try {
    const { employeeId } = req.user;
    const employee = await Employee.findOne({ employeeId })
      .select('employeeType paidLeaves restrictedHolidays compensatoryLeaves department')
      .populate('department', 'name');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    console.log(`Fetched employee info for ${employeeId}:`, {
      employeeType: employee.employeeType,
      paidLeaves: employee.paidLeaves,
      restrictedHolidays: employee.restrictedHolidays,
      compensatoryLeaves: employee.compensatoryLeaves,
      department: employee.department ? employee.department.name : null,
    });
    res.json({
      employeeType: employee.employeeType,
      paidLeaves: employee.paidLeaves,
      restrictedHolidays: employee.restrictedHolidays,
      compensatoryLeaves: employee.compensatoryLeaves,
      department: employee.department,
    });
  } catch (err) {
    console.error('Error fetching employee info:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Endpoint for employee dashboard stats
router.get('/employee-stats', auth, role(['Employee', 'HOD', 'Admin']), async (req, res) => {
  try {
    const { employeeId, loginType } = req.user;
    const { attendanceView, fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'fromDate and toDate are required' });
    }

    if (!['daily', 'monthly', 'yearly'].includes(attendanceView)) {
      return res.status(400).json({ message: 'Invalid attendanceView. Must be "daily", "monthly", or "yearly"' });
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);
    endOfYear.setHours(23, 59, 59, 999);

    const attendanceQuery = {
      employeeId,
      logDate: { $gte: new Date(fromDate), $lte: new Date(toDate) },
      status: 'Present',
    };
    const attendanceRecords = await Attendance.find(attendanceQuery);

    let attendanceData = [];
    if (attendanceView === 'daily') {
      const date = new Date(fromDate);
      const count = attendanceRecords.filter(
        a => new Date(a.logDate).toDateString() === date.toDateString()
      ).length;
      attendanceData = [{ name: date.toLocaleDateString(), count }];
    } else if (attendanceView === 'monthly') {
      attendanceData = Array.from({ length: endOfMonth.getDate() }, (_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
        const count = attendanceRecords.filter(
          a => new Date(a.logDate).toDateString() === date.toDateString()
        ).length;
        return { name: `${i + 1}`, count };
      });
    } else {
      attendanceData = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(today.getFullYear(), i, 1);
        const count = attendanceRecords.filter(
          a => new Date(a.logDate).getMonth() === i &&
              new Date(a.logDate).getFullYear() === today.getFullYear()
        ).length;
        return { name: month.toLocaleString('default', { month: 'short' }), count };
      });
    }

    const employee = await Employee.findOne({ employeeId })
      .select('employeeType department compensatoryAvailable')
      .populate('department');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const normalizeDate = (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    let leaveDaysTaken = { monthly: 0, yearly: 0 };
    if (employee.employeeType === 'Confirmed') {
      const leaveQueryBase = {
        employeeId,
        leaveType: { $in: ['Casual', 'Medical', 'Maternity', 'Paternity'] },
        'status.hod': 'Approved',
        'status.admin': 'Acknowledged', // Fixed to match Leave schema
        'status.ceo': 'Approved',
      };
      const leavesThisMonth = await Leave.find({
        ...leaveQueryBase,
        $or: [
          { 'fullDay.from': { $gte: startOfMonth, $lte: endOfMonth } },
          { 'halfDay.date': { $gte: startOfMonth, $lte: endOfMonth } },
        ],
      });
      const leavesThisYear = await Leave.find({
        ...leaveQueryBase,
        $or: [
          { 'fullDay.from': { $gte: startOfYear, $lte: endOfYear } },
          { 'halfDay.date': { $gte: startOfYear, $lte: endOfYear } },
        ],
      });

      console.log(`Leaves this month for ${employeeId}:`, leavesThisMonth.map(l => ({
        _id: l._id,
        leaveType: l.leaveType,
        fullDay: l.fullDay,
        halfDay: l.halfDay,
      })));

      const calculateDays = (leave) => {
        if (leave.halfDay && leave.halfDay.date) {
          if (leave.fullDay && (leave.fullDay.from || leave.fullDay.to)) {
            console.warn(`Leave ${leave._id} has both halfDay and fullDay for ${employeeId}`);
            return 0.5; // Prioritize half-day
          }
          console.log(`Leave ${leave._id}: 0.5 days (half-day)`);
          return 0.5;
        }
        if (leave.fullDay && leave.fullDay.from && leave.fullDay.to) {
          const from = normalizeDate(leave.fullDay.from);
          const to = normalizeDate(leave.fullDay.to);
          if (from > to) {
            console.warn(`Invalid leave ${leave._id}: from (${from}) after to (${to})`);
            return 0;
          }
          const days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
          console.log(`Leave ${leave._id}: ${days} days from ${from} to ${to}`);
          return days;
        }
        console.warn(`Leave ${leave._id}: No valid dates`);
        return 0;
      };

      const seenRanges = new Set();
      const deduplicatedLeaves = leavesThisMonth.filter(leave => {
        if (leave.fullDay && leave.fullDay.from && leave.fullDay.to) {
          const rangeKey = `${normalizeDate(leave.fullDay.from).toISOString()}-${normalizeDate(leave.fullDay.to).toISOString()}`;
          if (seenRanges.has(rangeKey)) {
            console.warn(`Duplicate leave ${leave._id} with range ${rangeKey}`);
            return false;
          }
          seenRanges.add(rangeKey);
          return true;
        }
        return true;
      });

      leaveDaysTaken.monthly = deduplicatedLeaves.reduce((total, leave) => total + calculateDays(leave), 0);
      leaveDaysTaken.yearly = leavesThisYear.reduce((total, leave) => total + calculateDays(leave), 0);
    }

    const unpaidLeavesQuery = {
      employeeId,
      leaveType: 'Leave Without Pay(LWP)',
      $or: [
        { 'fullDay.from': { $gte: startOfMonth, $lte: endOfMonth } },
        { 'halfDay.date': { $gte: startOfMonth, $lte: endOfMonth } },
      ],
      'status.hod': 'Approved',
      'status.admin': 'Acknowledged', // Fixed to match Leave schema
      'status.ceo': 'Approved',
    };
    const unpaidLeavesRecords = await Leave.find(unpaidLeavesQuery);
    const unpaidLeavesTaken = unpaidLeavesRecords.reduce((total, leave) => {
      if (leave.halfDay && leave.halfDay.date) {
        return total + 0.5;
      }
      if (leave.fullDay && leave.fullDay.from && leave.fullDay.to) {
        const from = normalizeDate(leave.fullDay.from);
        const to = normalizeDate(leave.fullDay.to);
        const days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }
      return total;
    }, 0);

    const leaveRecords = await Leave.find({ employeeId }).sort({ createdAt: -1 }).limit(10);

    // Fetch OT claims (approved only)
    const otQuery = {
      employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      'status.ceo': 'Approved',
      'status.admin': 'Acknowledged', // Fixed to match OTClaim schema
    };
    const otRecords = await OT.find(otQuery);
    const overtimeHours = otRecords.reduce((sum, ot) => sum + (ot.hours || 0), 0);

    const otClaimRecords = await OT.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Fetch unclaimed and claimed OT entries from Attendance for eligible departments
    const eligibleDepartments = ['Production', 'Testing', 'AMETL', 'Admin'];
    const isEligible = employee.department && eligibleDepartments.includes(employee.department.name);

    let unclaimedOTRecords = [];
    let claimedOTRecords = [];

    if (isEligible) {
      // Fetch all attendance records with OT
      const otAttendanceQuery = {
        employeeId,
        logDate: { $gte: new Date(fromDate), $lte: new Date(toDate) },
        ot: { $gt: 0 }, // OT in minutes
      };
      const otAttendanceRecords = await Attendance.find(otAttendanceQuery).sort({ logDate: -1 });

      // Fetch all OT claims for the employee in the date range
      const otClaims = await OT.find({
        employeeId,
        date: { $gte: new Date(fromDate), $lte: new Date(toDate) },
      });

      // Normalize dates for comparison
      const normalizeOTDate = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      };

      // Separate unclaimed and claimed OT
      unclaimedOTRecords = otAttendanceRecords
        .filter((record) => {
          const recordDate = normalizeOTDate(record.logDate);
          const isClaimed = otClaims.some((claim) => normalizeOTDate(claim.date) === recordDate);
          return !isClaimed;
        })
        .map((record) => {
          const deadline = new Date(record.logDate);
          deadline.setDate(deadline.getDate() + 1);
          deadline.setHours(23, 59, 59, 999); // 11:59:59 PM of next day

          return {
            _id: record._id,
            date: record.logDate,
            hours: (record.ot / 60).toFixed(1), // Convert minutes to hours
            day: new Date(record.logDate).toLocaleString('en-US', { weekday: 'long' }),
            claimDeadline: deadline,
          };
        });

      claimedOTRecords = otClaims.map((claim) => ({
        _id: claim._id,
        date: claim.date,
        hours: claim.hours.toFixed(1),
        day: new Date(claim.date).toLocaleString('en-US', { weekday: 'long' }),
        status: {
          hod: claim.status.hod,
          admin: claim.status.admin,
          ceo: claim.status.ceo,
        },
        projectDetails: claim.projectDetails,
        claimType: claim.claimType, // Full or Partial
      }));
    }

    // Fetch compensatory leave entries
    const compensatoryLeaveEntries = employee.compensatoryAvailable
      ? employee.compensatoryAvailable
          .filter((entry) => entry.status === 'Available')
          .map((entry) => ({
            date: entry.date,
            hours: entry.hours,
            _id: entry._id || new mongoose.Types.ObjectId().toString(), // Ensure unique ID
          }))
      : [];

    // Fetch OD records
    const odRecords = await OD.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const stats = {
      attendanceData,
      leaveRecords,
      unpaidLeavesTaken,
      overtimeHours,
      otClaimRecords,
      unclaimedOTRecords,
      claimedOTRecords,
      compensatoryLeaveEntries,
      odRecords,
    };

    console.log(`Employee dashboard stats for ${employeeId}:`, stats);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching employee dashboard stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
