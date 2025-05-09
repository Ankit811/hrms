const express = require('express');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Audit = require('../models/Audit');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const router = express.Router();

// Submit Leave
router.post('/', auth, role(['Employee', 'HOD']), async (req, res) => {
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

    const leave = new Leave({
      employeeId: user.employeeId,
      employee: user._id,
      name: user.name,
      designation: user.designation,
      department: user.department,
      leaveType: req.body.leaveType,
      category: req.body.category,
      halfDay: req.body.halfDay,
      fullDay: req.body.fullDay,
      reason: req.body.reason,
      chargeGivenTo: req.body.chargeGivenTo,
      emergencyContact: req.body.emergencyContact,
      isCompensatory: req.body.isCompensatory || false,
      compensatoryDetails: req.body.compensatoryDetails,
    });

    const leaveDays = req.body.halfDay ? 0.5 :
      (req.body.fullDay?.to
        ? ((new Date(req.body.fullDay.to) - new Date(req.body.fullDay.from)) / (1000 * 60 * 60 * 24)) + 1
        : 1);

    if (req.body.leaveType === 'Paid' && user.paidLeaves < leaveDays && !req.body.isCompensatory) {
      return res.status(400).json({ message: 'Not enough paid leave balance' });
    }

    await leave.save();

    if (req.body.leaveType === 'Paid' && !req.body.isCompensatory) {
      user.paidLeaves -= leaveDays;
    } else if (req.body.leaveType === 'Unpaid') {
      user.unpaidLeavesTaken += leaveDays;
    }

    await user.save();

    const hod = await Employee.findOne({ department: user.department, loginType: 'HOD' });
    const admin = await Employee.findOne({ loginType: 'Admin' });

    if (hod && req.user.role !== 'HOD') {
      await Notification.create({ userId: hod.employeeId, message: `New leave request from ${user.name}` });
      if (global._io) global._io.to(hod.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
    } else {
      await Notification.create({ userId: admin.employeeId, message: `New leave request from ${user.name}` });
      if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
    }

    await Audit.create({ user: user.employeeId, action: 'Submit Leave', details: 'Submitted leave request' });

    res.status(201).json(leave);
  } catch (err) {
    console.error('Leave submit error:', err.stack);
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
        filter = {}; // Show all leaves for Admin when status is 'all'
      }
    } else if (req.user.role === 'CEO') {
      if (status && status !== 'all') {
        filter.$or = [
          { 'status.hod': status },
          { 'status.admin': status },
          { 'status.ceo': status }
        ];
      } else {
        filter = {}; // Show all leaves for CEO when status is 'all'
      }
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    // Apply additional query filters
    if (leaveType && leaveType !== 'all') {
      if (leaveType === 'Compensatory') {
        filter.isCompensatory = true;
      } else {
        filter.leaveType = leaveType;
      }
    }

    if (fromDate) {
      filter.$or = filter.$or || [];
      filter.$or.push(
        { 'fullDay.from': { $gte: new Date(fromDate) } },
        { 'halfDay.date': { $gte: new Date(fromDate) } },
        { createdAt: { $gte: new Date(fromDate) } }
      );
    }

    if (toDate) {
      filter.$or = filter.$or || [];
      filter.$or.push(
        { 'fullDay.to': { $lte: new Date(toDate) } },
        { 'halfDay.date': { $lte: new Date(toDate) } },
        { createdAt: { $lte: new Date(toDate) } }
      );
    }

    console.log('User role:', req.user.role, 'Employee ID:', req.user.employeeId);
    console.log('Fetching leaves with filter:', filter);

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

// Approve Leave
router.put('/:id/approve', auth, role(['HOD', 'Admin', 'CEO']), async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    const user = await Employee.findOne({ employeeId: leave.employeeId });

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

module.exports = router;
