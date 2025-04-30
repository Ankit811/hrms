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
    const leave = new Leave({
      employeeId: user.employeeId,
      name: user.name,
      position: user.position,
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

    if (req.body.leaveType === 'Paid' && user.paidLeaves <= 0 && !req.body.isCompensatory) {
      return res.status(400).json({ message: 'No paid leaves available' });
    }

    await leave.save();
    
    if (req.body.leaveType === 'Paid' && !req.body.isCompensatory) {
      user.paidLeaves -= req.body.halfDay ? 0.5 : (req.body.fullDay.to ? (new Date(req.body.fullDay.to) - new Date(req.body.fullDay.from)) / (1000 * 60 * 60 * 24) + 1 : 1);
    } else if (req.body.leaveType === 'Unpaid') {
      user.unpaidLeavesTaken += req.body.halfDay ? 0.5 : (req.body.fullDay.to ? (new Date(req.body.fullDay.to) - new Date(req.body.fullDay.from)) / (1000 * 60 * 60 * 24) + 1 : 1);
    }

    await user.save();

    const hod = await Employee.findOne({ department: user.department, loginType: 'HOD' });
    const admin = await Employee.findOne({ loginType: 'Admin' });
    console.log(hod,admin);
    
    if (hod && user.loginType !== 'HOD') {
      await Notification.create({ userId: hod.employeeId, message: `New leave request from ${user.name}` });
      if (global._io) global._io.to(hod.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
    } else {
      await Notification.create({ userId: admin.employeeId, message: `New leave request from ${user.name}` });
      if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `New leave request from ${user.name}` });
    }

    await Audit.create({ user: user.employeeId, action: 'Submit Leave', details: 'Submitted leave request' });

    res.status(201).json(leave);
  } catch (err) {
    console.warn('Leave submit error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Leaves (by role)
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.loginType === 'Employee' || req.user.loginType === 'HOD') {
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.loginType === 'Admin') {
      filter = { 'status.hod': 'Approved', 'status.admin': 'Pending' };
    } else if (req.user.loginType === 'CEO') {
      filter = { 'status.admin': 'Approved', 'status.ceo': 'Pending' };
    } else if (req.user.loginType === 'HOD') {
      const user = await Employee.findById(req.user.id);
      filter = { department: user.department, 'status.hod': 'Pending' };
    }

    const leaves = await Leave.find(filter).populate('department');
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve Leave
router.put('/:id/approve', auth, role(['HOD', 'Admin', 'CEO']), async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    const user = await Employee.findOne({ employeeId: leave.employeeId });

    if (req.user.loginType === 'HOD' && leave.status.hod === 'Pending') {
      leave.status.hod = req.body.status;
      if (req.body.status === 'Approved') {
        const admin = await Employee.findOne({ loginType: 'Admin' });
        await Notification.create({ userId: admin.employeeId, message: `Leave request from ${leave.name} approved by HOD` });
        if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `Leave approved by HOD for ${leave.name}` });
      } else {
        await Notification.create({ userId: user.employeeId, message: `Your leave request was rejected by HOD` });
        if (global._io) global._io.to(user.employeeId).emit('notification', { message: `Leave rejected by HOD` });
      }

    } else if (req.user.loginType === 'Admin' && leave.status.admin === 'Pending') {
      leave.status.admin = req.body.status;
      if (req.body.status === 'Approved') {
        const ceo = await Employee.findOne({ loginType: 'CEO' });
        await Notification.create({ userId: ceo.employeeId, message: `Leave request from ${leave.name} approved by Admin` });
        if (global._io) global._io.to(ceo.employeeId).emit('notification', { message: `Leave approved by Admin for ${leave.name}` });
      } else {
        await Notification.create({ userId: user.employeeId, message: `Your leave request was rejected by Admin` });
        if (global._io) global._io.to(user.employeeId).emit('notification', { message: `Leave rejected by Admin` });
      }

    } else if (req.user.loginType === 'CEO' && leave.status.ceo === 'Pending') {
      leave.status.ceo = req.body.status;
      await Notification.create({ userId: user.employeeId, message: `Your leave request was ${req.body.status.toLowerCase()} by CEO` });
      if (global._io) global._io.to(user.employeeId).emit('notification', { message: `Leave ${req.body.status.toLowerCase()} by CEO` });

    } else {
      return res.status(403).json({ message: 'Not authorized to approve this leave' });
    }

    await leave.save();
    await Audit.create({ userId: req.user.employeeId, action: `${req.body.status} Leave`, details: `${req.body.status} leave for ${leave.name}` });

    res.json(leave);
  } catch (err) {
    console.error('Leave approval error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;