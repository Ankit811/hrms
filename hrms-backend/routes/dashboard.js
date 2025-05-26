const express = require('express');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const router = express.Router();

// Get dashboard statistics (existing endpoint)
router.get('/stats', auth, role(['Admin', 'CEO', 'HOD']), async (req, res) => {
  try {
    const { loginType, employeeId } = req.user;
    let departmentId = null;

    // For HOD, get their department
    if (loginType === 'HOD') {
      const hod = await Employee.findOne({ employeeId }).select('department');
      if (!hod?.department?._id) {
        return res.status(400).json({ message: 'HOD department not found' });
      }
      departmentId = hod.department._id;
    }

    // Current date for presentToday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Employee status aggregation
    const employeeMatch = departmentId ? { department: departmentId } : {};
    const employeeStats = await Employee.aggregate([
      { $match: employeeMatch },
      {
        $addFields: {
          effectiveStatus: {
            $cond: {
              if: {
                $and: [
                  { $eq: ['$status', 'Probation'] },
                  { $ne: ['$confirmationDate', null] },
                  { $lte: ['$confirmationDate', new Date()] },
                ],
              },
              then: 'Confirmed',
              else: '$status',
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
    };
    employeeStats.forEach(stat => {
      if (stat._id) employeeCounts[stat._id] = stat.count;
    });

    // Present today aggregation
    const attendanceMatch = {
      logDate: { $gte: today, $lt: tomorrow },
      status: 'Present',
    };
    if (departmentId) {
      const deptEmployees = await Employee.find({ department: departmentId }).select('employeeId');
      attendanceMatch.employeeId = { $in: deptEmployees.map(e => e.employeeId) };
    }
    const presentToday = await Attendance.countDocuments(attendanceMatch);

    // Pending leaves aggregation
    let leaveMatch = {};
    if (loginType === 'Admin') {
      leaveMatch = { 'status.admin': 'Pending' };
    } else if (loginType === 'CEO') {
      leaveMatch = { 'status.ceo': 'Pending' };
    } else if (loginType === 'HOD') {
      leaveMatch = { 'status.hod': 'Pending', department: departmentId };
    }
    const pendingLeaves = await Leave.countDocuments(leaveMatch);

    // Compile response
    const stats = {
      confirmedEmployees: employeeCounts.Confirmed,
      probationEmployees: employeeCounts.Probation,
      contractualEmployees: employeeCounts.Contractual,
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

// New endpoint for employee dashboard stats
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

    const employee = await Employee.findOne({ employeeId }).select('employeeType paidLeaves unpaidLeavesTaken');
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const endOfYear = new Date(today.getFullYear(), 11, 31);

    // Attendance Data
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

    // Paid Leaves Remaining
    let paidLeavesRemaining = { monthly: 0, yearly: 0 };
    if (employee.employeeType === 'Staff') {
      // For Staff: Calculate monthly and yearly remaining leaves
      const leavesThisMonth = await Leave.find({
        employeeId,
        leaveType: 'Paid',
        $or: [
          { 'fullDay.from': { $gte: startOfMonth, $lte: endOfMonth } },
          { 'halfDay.date': { $gte: startOfMonth, $lte: endOfMonth } },
        ],
        'status.hod': 'Approved',
        'status.admin': 'Approved',
        'status.ceo': 'Approved',
      });
      const leavesThisYear = await Leave.find({
        employeeId,
        leaveType: 'Paid',
        $or: [
          { 'fullDay.from': { $gte: startOfYear, $lte: endOfYear } },
          { 'halfDay.date': { $gte: startOfYear, $lte: endOfYear } },
        ],
        'status.hod': 'Approved',
        'status.admin': 'Approved',
        'status.ceo': 'Approved',
      });

      const monthlyDays = leavesThisMonth.reduce((total, leave) => {
        if (leave.halfDay?.date) return total + 0.5;
        const from = new Date(leave.fullDay.from);
        const to = new Date(leave.fullDay.to);
        const days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

      const yearlyDays = leavesThisYear.reduce((total, leave) => {
        if (leave.halfDay?.date) return total + 0.5;
        const from = new Date(leave.fullDay.from);
        const to = new Date(leave.fullDay.to);
        const days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

      paidLeavesRemaining = {
        monthly: employee.paidLeaves - monthlyDays,
        yearly: employee.paidLeaves - yearlyDays,
      };
    } else {
      // For Interns: Only monthly
      const leavesThisMonth = await Leave.find({
        employeeId,
        leaveType: 'Paid',
        $or: [
          { 'fullDay.from': { $gte: startOfMonth, $lte: endOfMonth } },
          { 'halfDay.date': { $gte: startOfMonth, $lte: endOfMonth } },
        ],
        'status.hod': 'Approved',
        'status.admin': 'Approved',
        'status.ceo': 'Approved',
      });

      const monthlyDays = leavesThisMonth.reduce((total, leave) => {
        if (leave.halfDay?.date) return total + 0.5;
        const from = new Date(leave.fullDay.from);
        const to = new Date(leave.fullDay.to);
        const days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
        return total + days;
      }, 0);

      paidLeavesRemaining = {
        monthly: employee.paidLeaves - monthlyDays,
        yearly: 0, // Not applicable for Interns
      };
    }

    // Unpaid Leaves Taken (Monthly)
    const unpaidLeavesQuery = {
      employeeId,
      leaveType: 'Unpaid',
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
      if (leave.halfDay?.date) return total + 0.5;
      const from = new Date(leave.fullDay.from);
      const to = new Date(leave.fullDay.to);
      const days = ((to - from) / (1000 * 60 * 60 * 24)) + 1;
      return total + days;
    }, 0);

    // Leave Application Records
    const leaveRecords = await Leave.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(10);

    // Overtime (Monthly)
    const overtimeQuery = {
      employeeId,
      logDate: { $gte: startOfMonth, $lte: endOfMonth },
    };
    const overtimeRecords = await Attendance.find(overtimeQuery);
    const overtimeMinutes = overtimeRecords.reduce((total, record) => total + (record.ot || 0), 0);
    const overtimeHours = overtimeMinutes / 60;

    // Compile response
    const stats = {
      attendanceData,
      paidLeavesRemaining,
      unpaidLeavesTaken,
      leaveRecords,
      overtimeHours,
    };

    console.log(`Employee dashboard stats for ${employeeId}:`, stats);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching employee dashboard stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
