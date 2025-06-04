const express = require('express');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Audit = require('../models/Audit');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const router = express.Router();

// Submit Leave
router.post('/', auth, role(['Employee', 'HOD', 'Admin']), async (req, res) => {
  try {
    const user = await Employee.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    if (!user.designation) {
      return res.status(400).json({ message: 'Employee designation is required' });
    }
    if (!user.department) {
      return res.status(400).json({ message: 'Employee department is required' });
    }

    const currentYear = new Date().getFullYear();

    const leaveDays = req.body.halfDay ? 0.5 :
      (req.body.fullDay?.from && req.body.fullDay?.to
        ? ((new Date(req.body.fullDay.to) - new Date(req.body.fullDay.from)) / (1000 * 60 * 60 * 24)) + 1
        : 0);
    if (leaveDays === 0 && !req.body.halfDay) {
      return res.status(400).json({ message: 'Invalid leave dates provided' });
    }

    // Validate leave dates
    let leaveStart, leaveEnd;
    if (req.body.halfDay?.date) {
      leaveStart = new Date(req.body.halfDay.date);
      leaveEnd = new Date(req.body.halfDay.date);
    } else if (req.body.fullDay?.from && req.body.fullDay?.to) {
      leaveStart = new Date(req.body.fullDay.from);
      leaveEnd = new Date(req.body.fullDay.to);
      if (leaveStart > leaveEnd) {
        return res.status(400).json({ message: 'Leave start date cannot be after end date' });
      }
    } else {
      return res.status(400).json({ message: 'Either halfDay or fullDay dates are required' });
    }

    // Custom Leave Type Validations
    const leaveType = req.body.leaveType; // Avoid lowercase to match enum
    const isConfirmed = user.employeeType === 'Confirmed';
    const joinDate = new Date(user.dateOfJoining);
    const yearsOfService = (new Date() - joinDate) / (1000 * 60 * 60 * 24 * 365);
    console.log('Leave Type:', leaveType, 'Employee Type:', user.employeeType, 'Leave Days:', leaveDays);

    switch (leaveType) {
      case 'Casual':
        const canTakeCasualLeave = await user.checkConsecutivePaidLeaves(leaveStart, leaveEnd);
        if (!canTakeCasualLeave) {
          return res.status(400).json({ message: 'Cannot take more than 3 consecutive paid leave days.' });
        }
        if (user.paidLeaves < leaveDays) {
          return res.status(400).json({ message: 'Insufficient Casual leave balance.' });
        }
        break;
      case 'Medical':
        if (!isConfirmed) return res.status(400).json({ message: 'Medical leave is only for confirmed employees.' });
        if (![3, 4].includes(leaveDays)) return res.status(400).json({ message: 'Medical leave must be either 3 or 4 days.' });
        if (user.medicalLeaves < leaveDays) return res.status(400).json({ message: 'Medical leave already used or insufficient balance for this year.' });
        const medicalLeavesThisYear = await Leave.find({
          employeeId: user.employeeId,
          leaveType: 'Medical',
          'status.ceo': 'Approved',
          $or: [
            { 'fullDay.from': { $gte: new Date(currentYear, 0, 1) } },
            { 'halfDay.date': { $gte: new Date(currentYear, 0, 1) } },
          ],
        });
        if (medicalLeavesThisYear.length > 0) {
          return res.status(400).json({ message: 'Medical leave can only be used once per year.' });
        }
        break;
      case 'Maternity':
        if (!isConfirmed || user.gender !== 'Female') return res.status(400).json({ message: 'Maternity leave is only for confirmed female employees.' });
        if (yearsOfService < 1) return res.status(400).json({ message: 'Must have completed one year of service.' });
        if (leaveDays !== 90) return res.status(400).json({ message: 'Maternity leave must be 90 days.' });
        if (user.maternityClaims >= 2) return res.status(400).json({ message: 'Maternity leave can only be availed twice during service.' });
        if (leaveDays > 3) {
          return res.status(400).json({ message: 'Cannot take more than 3 consecutive paid leave days.' });
        }
        break;
      case 'Paternity':
        if (!isConfirmed || user.gender !== 'Male') return res.status(400).json({ message: 'Paternity leave is only for confirmed male employees.' });
        if (yearsOfService < 1) return res.status(400).json({ message: 'Must have completed one year of service.' });
        if (leaveDays !== 7) return res.status(400).json({ message: 'Paternity leave must be 7 days.' });
        if (user.paternityClaims >= 2) return res.status(400).json({ message: 'Paternity leave can only be availed twice during service.' });
        if (leaveDays > 3) {
          return res.status(400).json({ message: 'Cannot take more than 3 consecutive paid leave days.' });
        }
        break;
      case 'Restricted Holidays':
        if (leaveDays !== 1) return res.status(400).json({ message: 'Restricted Holiday must be 1 day.' });
        if (user.restrictedHolidays < 1) return res.status(400).json({ message: 'Restricted Holiday already used for this year.' });
        const canTakeRestrictedLeave = await user.checkConsecutivePaidLeaves(leaveStart, leaveEnd);
        if (!canTakeRestrictedLeave) {
          return res.status(400).json({ message: 'Cannot take more than 3 consecutive paid leave days.' });
        }
        if (!req.body.restrictedHoliday) return res.status(400).json({ message: 'Restricted holiday must be selected.' });
        // Check for existing Restricted Holiday requests
        const existingRestrictedLeave = await Leave.findOne({
          employeeId: user.employeeId,
          leaveType: 'Restricted Holidays',
          $or: [
            { 'fullDay.from': { $gte: new Date(currentYear, 0, 1) } },
            { 'halfDay.date': { $gte: new Date(currentYear, 0, 1) } },
          ],
          $or: [
            { 'status.hod': { $in: ['Pending', 'Approved'] } },
            { 'status.admin': { $in: ['Pending', 'Approved'] } },
            { 'status.ceo': { $in: ['Pending', 'Approved'] } },
          ],
        });
        if (existingRestrictedLeave) {
          return res.status(400).json({ message: 'A Restricted Holiday request already exists for this year.' });
        }
        break;
      case 'Compensatory':
        if (!req.body.compensatoryDate || !req.body.projectDetails) {
          return res.status(400).json({ message: 'Compensatory date and project details are required' });
        }
        const hoursNeeded = leaveDays * 8; // 1 day = 8 hours
        if (user.compensatoryLeaves < hoursNeeded) {
          return res.status(400).json({ message: 'Insufficient compensatory leave balance' });
        }
        break;
      case 'Leave Without Pay(LWP)':
        break;
      default:
        return res.status(400).json({ message: 'Invalid leave type.' });
    }

    // Set status based on user role
    const status = {
      hod: 'Pending',
      admin: 'Pending',
      ceo: 'Pending'
    };
    if (req.user.role === 'Admin') {
      status.hod = 'Approved';
      status.admin = 'Approved';
    } else if (req.user.role === 'HOD') {
      status.hod = 'Approved';
    }

    const leave = new Leave({
      employeeId: user.employeeId,
      employee: user._id,
      name: user.name,
      designation: user.designation,
      department: user.department,
      leaveType: req.body.leaveType,
      halfDay: req.body.halfDay,
      fullDay: req.body.fullDay,
      reason: req.body.reason,
      chargeGivenTo: req.body.chargeGivenTo,
      emergencyContact: req.body.emergencyContact,
      compensatoryDate: req.body.compensatoryDate,
      projectDetails: req.body.projectDetails,
      restrictedHoliday: req.body.restrictedHoliday,
      status
    });

    await leave.save();

    // Notify based on user role
    if (req.user.role === 'Admin') {
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({ userId: ceo.employeeId, message: `New leave request from ${user.name}` });
        if (global._io) global._io.to(ceo.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
      }
    } else if (req.user.role === 'HOD') {
      const admin = await Employee.findOne({ loginType: 'Admin' });
      if (admin) {
        await Notification.create({ userId: admin.employeeId, message: `New leave request from ${user.name}` });
        if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
      }
    } else {
      const hod = await Employee.findOne({ department: user.department, loginType: 'HOD' });
      const admin = await Employee.findOne({ loginType: 'Admin' });
      if (hod) {
        await Notification.create({ userId: hod.employeeId, message: `New leave request from ${user.name}` });
        if (global._io) global._io.to(hod.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
      } else if (admin) {
        await Notification.create({ userId: admin.employeeId, message: `New leave request from ${user.name}` });
        if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
      }
    }

    await Audit.create({ user: user.employeeId, action: 'Submit Leave', details: 'Submitted leave request' });

    res.status(201).json(leave);
  } catch (err) {
    console.error('Leave submit error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve Leave
router.put('/:id/approve', auth, role(['HOD', 'Admin', 'CEO']), async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    const user = await Employee.findOne({ employeeId: leave.employeeId });
    if (!user) return res.status(404).json({ message: 'Employee not found' });

    let nextStage = '';
    let approverMessage = '';

    if (req.user.role === 'HOD' && leave.status.hod === 'Pending') {
      leave.status.hod = req.body.status;
      if (req.body.status === 'Approved') {
        nextStage = 'admin';
        approverMessage = `Leave request from ${leave.name} approved by HOD`;
      } else {
        approverMessage = `Your leave request was rejected by HOD`;
      }
    } else if (req.user.role === 'Admin' && leave.status.hod === 'Approved' && leave.status.admin === 'Pending') {
      leave.status.admin = req.body.status;
      if (req.body.status === 'Approved') {
        nextStage = 'ceo';
        approverMessage = `Leave request from ${leave.name} approved by Admin`;
      } else {
        approverMessage = `Your leave request was rejected by Admin`;
      }
    } else if (req.user.role === 'CEO' && leave.status.admin === 'Approved' && leave.status.ceo === 'Pending') {
      leave.status.ceo = req.body.status;
      approverMessage = `Your leave request was ${req.body.status.toLowerCase()} by CEO`;
      if (req.body.status === 'Approved') {
        let leaveStart, leaveEnd;
        if (leave.halfDay?.date) {
          leaveStart = new Date(leave.halfDay.date);
          leaveEnd = new Date(leave.halfDay.date);
        } else if (leave.fullDay?.from && leave.fullDay?.to) {
          leaveStart = new Date(leave.fullDay.from);
          leaveEnd = new Date(leave.fullDay.to);
        }
        if (leaveStart && leaveEnd) {
          const leaveDays = leaveStart.getTime() === leaveEnd.getTime() ? 0.5 : ((leaveEnd - leaveStart) / (1000 * 60 * 60 * 24)) + 1;
          switch (leave.leaveType) {
            case 'Casual':
              if (user.paidLeaves >= leaveDays) {
                await user.deductPaidLeaves(leaveStart, leaveEnd);
              } else {
                return res.status(400).json({ message: 'Insufficient Casual leave balance.' });
              }
              break;
            case 'Medical':
              if (user.medicalLeaves >= leaveDays) {
                await user.deductMedicalLeaves(leaveDays);
              } else {
                return res.status(400).json({ message: 'Insufficient Medical leave balance.' });
              }
              break;
            case 'Maternity':
              if (user.maternityClaims < 2) {
                await user.recordMaternityClaim();
              } else {
                return res.status(400).json({ message: 'Maternity leave limit reached.' });
              }
              break;
            case 'Paternity':
              if (user.paternityClaims < 2) {
                await user.recordPaternityClaim();
              } else {
                return res.status(400).json({ message: 'Paternity leave limit reached.' });
              }
              break;
            case 'Compensatory':
                const hoursNeeded = leaveDays * 8; // 1 day = 8 hours
                await user.deductCompensatoryLeaves(hoursNeeded);
                break;
            case 'Restricted Holidays':
              if (user.restrictedHolidays >= 1) {
                await user.deductRestrictedHolidays();
              } else {
                return res.status(400).json({ message: 'Restricted Holiday already used.' });
              }
              break;
            case 'Leave Without Pay(LWP)':
              await user.incrementUnpaidLeaves(leaveStart, leaveEnd);
              break;
          }
        }
      }
    } else {
      return res.status(403).json({ message: 'Not authorized to approve this leave' });
    }

    await leave.save();

    await Notification.create({ userId: user.employeeId, message: approverMessage });
    if (global._io) global._io.to(user.employeeId).emit('notification', { message: approverMessage });

    if (nextStage) {
      let nextApprover = null;
      if (nextStage === 'admin') {
        nextApprover = await Employee.findOne({ loginType: 'Admin' });
      } else if (nextStage === 'ceo') {
        nextApprover = await Employee.findOne({ loginType: 'CEO' });
      }
      if (nextApprover) {
        await Notification.create({ userId: nextApprover.employeeId, message: `New leave request from ${leave.name}` });
        if (global._io) global._io.to(nextApprover.employeeId).emit('notification', { message: `New leave request from ${leave.name}` });
      }
    }

    await Audit.create({ user: req.user.employeeId, action: `${req.body.status} Leave`, details: `${req.body.status} leave for ${leave.name}` });

    res.json(leave);
  } catch (err) {
    console.error('Leave approval error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get Leaves (by role)
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    const { leaveType, status, fromDate, toDate, page = 1, limit = 10 } = req.query;

    if (req.user.role === 'Employee') {
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.role === 'HOD') {
      const hod = await Employee.findOne({ employeeId: req.user.employeeId }).populate('department');
      if (!hod || !hod.department || !hod.department._id) {
        return res.status(400).json({ message: 'HOD has no valid department assigned' });
      }
      filter = { department: hod.department._id };
      if (status && status !== 'all') {
        filter.$or = [
          { 'status.hod': status },
          { 'status.admin': status },
          { 'status.ceo': status }
        ];
      }
    } else if (req.user.role === 'Admin') {
      if (status && status !== 'all') {
        filter.$or = [
          { 'status.hod': status },
          { 'status.admin': status },
          { 'status.ceo': status }
        ];
      } else {
        filter = {};
      }
    } else if (req.user.role === 'CEO') {
      if (status && status !== 'all') {
        filter.$or = [
          { 'status.hod': status },
          { 'status.admin': status },
          { 'status.ceo': status }
        ];
      } else {
        filter = {};
      }
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    if (leaveType && leaveType !== 'all') {
      filter.leaveType = leaveType;
    }

    if (fromDate || toDate) {
      const dateConditions = [];

      if (fromDate) {
        dateConditions.push({
          $or: [
            { 'fullDay.from': { $gte: new Date(fromDate) } },
            { 'halfDay.date': { $gte: new Date(fromDate) } }
          ]
        });
      }

      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        dateConditions.push({
          $or: [
            { 'fullDay.to': { $lte: toDateEnd } },
            { 'halfDay.date': { $lte: toDateEnd } }
          ]
        });
      }

      if (dateConditions.length > 0) {
        filter.$and = dateConditions;
      }
    }

    console.log('User role:', req.user.role, 'Employee ID:', req.user.employeeId);
    console.log('Fetching leaves with filter:', JSON.stringify(filter, null, 2));

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const leaves = await Leave.find(filter)
      .populate('department employee')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Leave.countDocuments(filter);

    console.log('Leaves found:', leaves.length, 'Total:', total);

    res.json({ leaves, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Error fetching leaves:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
