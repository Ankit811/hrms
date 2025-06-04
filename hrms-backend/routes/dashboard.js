// backend/routes/dashboard.js
const express = require('express');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const OT = require('../models/OTClaim'); // OTClaim model
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
      if (!hod?.department?._id) {
        return res.status(400).json({ message: 'HOD department not found' });
      }
      departmentId = hod.department._id;
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
      const deptEmployees = await Employee.find({ department: departmentId }).select('employeeId');
      attendanceMatch.employeeId = { $in: deptEmployees.map(e => e.employeeId) };
    }
    const presentToday = await Attendance.countDocuments(attendanceMatch);

    let leaveMatch = {};
    if (loginType === 'Admin') {
      leaveMatch = {
        'status.admin': 'Pending',
        'employee': { $nin: await Employee.find({ loginType: 'Admin' }).select('_id') }
      };
    } else if (loginType === 'CEO') {
      leaveMatch = { 'status.ceo': 'Pending' };
    } else if (loginType === 'HOD') {
      leaveMatch = {
        'status.hod': 'Pending',
        department: departmentId,
        'employee': { $nin: await Employee.find({ loginType: { $in: ['HOD', 'Admin'] } }).select('_id') }
      };
    }
    const pendingLeaves = await Leave.countDocuments(leaveMatch);

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
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Endpoint for employee info
router.get('/employee-info', auth, role(['Employee', 'HOD', 'Admin']), async (req, res) => {
  try {
    const { employeeId } = req.user;
    const employee = await Employee.findOne({ employeeId }).select('employeeType paidLeaves restrictedHolidays compensatoryLeaves');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    console.log(`Fetched employee info for ${employeeId}:`, {
      employeeType: employee.employeeType,
      paidLeaves: employee.paidLeaves,
      restrictedHolidays: employee.restrictedHolidays,
      compensatoryLeaves: employee.compensatoryLeaves,
    });
    res.json({
      employeeType: employee.employeeType,
      paidLeaves: employee.paidLeaves,
      restrictedHolidays: employee.restrictedHolidays,
      compensatoryLeaves: employee.compensatoryLeaves,
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
        (a) => new Date(a.logDate).toDateString() === date.toDateString()
      ).length;
      attendanceData = [{ name: date.toLocaleDateString(), count }];
    } else if (attendanceView === 'monthly') {
      attendanceData = Array.from({ length: endOfMonth.getDate() }, (_, i) => {
        const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
        const count = attendanceRecords.filter(
          (a) => new Date(a.logDate).toDateString() === date.toDateString()
        ).length;
        return { name: `${i + 1}`, count };
      });
    } else {
      attendanceData = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(today.getFullYear(), i, 1);
        const count = attendanceRecords.filter(
          (a) =>
            new Date(a.logDate).getMonth() === i &&
            new Date(a.logDate).getFullYear() === today.getFullYear()
        ).length;
        return { name: month.toLocaleString('default', { month: 'short' }), count };
      });
    }

    const employee = await Employee.findOne({ employeeId }).select('employeeType');
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
        'status.admin': 'Approved',
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
        if (leave.halfDay?.date) {
          if (leave.fullDay?.from || leave.fullDay?.to) {
            console.warn(`Leave ${leave._id} has both halfDay and fullDay for ${employeeId}`);
            return 0.5; // Prioritize half-day
          }
          console.log(`Leave ${leave._id}: 0.5 days (half-day)`);
          return 0.5;
        }
        if (leave.fullDay?.from && leave.fullDay?.to) {
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
        if (leave.fullDay?.from && leave.fullDay.to) {
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
      'status.admin': 'Approved',
      'status.ceo': 'Approved',
    };
    const unpaidLeavesRecords = await Leave.find(unpaidLeavesQuery);
    const unpaidLeavesTaken = unpaidLeavesRecords.reduce((total, leave) => {
      if (leave.halfDay?.date) { // Fixed: Check halfDay.date, not halfDay.fullDay
        return total + 0.5;
      }
      if (leave.fullDay?.from && leave.fullDay?.to) {
        const from = normalizeDate(leave.fullDay.from); // Fixed: Use .from, not .fromDate
        const to = normalizeDate(leave.fullDay.to);
        const days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }
      return total;
    }, 0);

    const leaveRecords = await Leave.find({ employeeId }).sort({ createdAt: -1 }).limit(10);

    // Fetch OT claims
    const otQuery = {
      employeeId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
      'status.ceo': 'Approved', // Only approved claims
    };
    const otRecords = await OT.find(otQuery); // Fixed: Use OT, not ot
    const overtimeHours = otRecords.reduce((sum, ot) => sum + (ot.hours || 0), 0);

    const otClaimRecords = await OT.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = {
      attendanceData,
      leaveRecords,
      unpaidLeavesTaken,
      overtimeHours,
      otClaimRecords, // Fixed: Return otClaimRecords, not otRecords
    };

    console.log(`Employee dashboard stats for ${employeeId}:`, stats);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching employee dashboard stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
