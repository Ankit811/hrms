const express = require('express');
const OD = require('../models/OD');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Audit = require('../models/Audit');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const router = express.Router();

// Submit OD
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

    const { dateOut, timeOut, dateIn, timeIn, purpose, placeUnitVisit } = req.body;

    // Validate required fields
    if (!dateOut || !timeOut || !dateIn || !purpose || !placeUnitVisit) {
      return res.status(400).json({ message: 'All required fields (Date Out, Time Out, Date In, Purpose, Place/Unit Visit) must be provided' });
    }

    // Validate date logic
    if (new Date(dateOut) > new Date(dateIn)) {
      return res.status(400).json({ message: 'Date Out must be before or equal to Date In' });
    }

    // Set status based on user role
    const status = {
      hod: req.user.role === 'Employee' ? 'Pending' : 'Approved',
      ceo: 'Pending',
      admin: 'Pending'
    };
    if (req.user.role === 'HOD' || req.user.role === 'Admin') {
      status.hod = 'Approved';
    }

    const od = new OD({
      employeeId: user.employeeId,
      employee: user._id,
      name: user.name,
      designation: user.designation,
      department: user.department,
      dateOut: new Date(dateOut),
      timeOut,
      dateIn: new Date(dateIn),
      timeIn,
      purpose,
      placeUnitVisit,
      status
    });

    await od.save();

    // Notify based on user role
    if (req.user.role === 'HOD' || req.user.role === 'Admin') {
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({ userId: ceo.employeeId, message: `New OD request from ${user.name}` });
        if (global._io) global._io.to(ceo.employeeId).emit('notification', { message: `New OD request from ${user.name}` });
      }
    } else {
      const hod = await Employee.findOne({ department: user.department, loginType: 'HOD' });
      if (hod) {
        await Notification.create({ userId: hod.employeeId, message: `New OD request from ${user.name}` });
        if (global._io) global._io.to(hod.employeeId).emit('notification', { message: `New OD request from ${user.name}` });
      }
    }

    await Audit.create({ user: user.employeeId, action: 'Submit OD', details: 'Submitted OD request' });

    res.status(201).json(od);
  } catch (err) {
    console.error('OD submit error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve OD
router.put('/:id/approve', auth, role(['HOD', 'Admin', 'CEO']), async (req, res) => {
  try {
    const od = await OD.findById(req.params.id);
    if (!od) return res.status(404).json({ message: 'OD request not found' });

    const user = await Employee.findOne({ employeeId: od.employeeId });
    if (!user) return res.status(404).json({ message: 'Employee not found' });

    let nextStage = '';
    let approverMessage = '';

    if (req.user.role === 'HOD' && od.status.hod === 'Pending') {
      od.status.hod = req.body.status;
      if (req.body.status === 'Approved') {
        nextStage = 'ceo';
        approverMessage = `OD request from ${od.name} approved by HOD`;
      } else {
        approverMessage = `Your OD request was rejected by HOD`;
      }
    } else if (req.user.role === 'CEO' && od.status.hod === 'Approved' && od.status.ceo === 'Pending') {
      od.status.ceo = req.body.status;
      if (req.body.status === 'Approved') {
        nextStage = user.loginType === 'Admin' ? '' : 'admin';
        approverMessage = `OD request from ${od.name} approved by CEO`;
      } else {
        approverMessage = `Your OD request was rejected by CEO`;
      }
    } else if (req.user.role === 'Admin' && od.status.ceo === 'Approved' && od.status.admin === 'Pending') {
      od.status.admin = req.body.status;
      approverMessage = `Your OD request was ${req.body.status.toLowerCase()} by Admin`;
    } else {
      return res.status(403).json({ message: 'Not authorized to approve this OD request' });
    }

    await od.save();

    await Notification.create({ userId: user.employeeId, message: approverMessage });
    if (global._io) global._io.to(user.employeeId).emit('notification', { message: approverMessage });

    if (nextStage) {
      let nextApprover = null;
      if (nextStage === 'ceo') {
        nextApprover = await Employee.findOne({ loginType: 'CEO' });
      } else if (nextStage === 'admin') {
        nextApprover = await Employee.findOne({ loginType: 'Admin' });
      }
      if (nextApprover) {
        await Notification.create({ userId: nextApprover.employeeId, message: `New OD request from ${od.name}` });
        if (global._io) global._io.to(nextApprover.employeeId).emit('notification', { message: `New OD request from ${od.name}` });
      }
    }

    await Audit.create({ user: req.user.employeeId, action: `${req.body.status} OD`, details: `${req.body.status} OD for ${od.name}` });

    res.json(od);
  } catch (err) {
    console.error('OD approval error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get OD Records
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    const { status, fromDate, toDate, page = 1, limit = 10 } = req.query;

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
          { 'status.ceo': status },
          { 'status.admin': status }
        ];
      }
    } else if (req.user.role === 'Admin' || req.user.role === 'CEO') {
      if (status && status !== 'all') {
        filter.$or = [
          { 'status.hod': status },
          { 'status.ceo': status },
          { 'status.admin': status }
        ];
      }
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    if (fromDate || toDate) {
      const dateConditions = [];
      if (fromDate) {
        dateConditions.push({ dateOut: { $gte: new Date(fromDate) } });
      }
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999999);
        dateConditions.push({ dateIn: toDateEnd });
      }
      if (dateConditions.length > 0) {
        filter.$and = dateConditions;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const odRecords = await OD.find(filter)
      .populate('department employee')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await OD.countDocuments(filter);

    res.json({ odRecords, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Error fetching OD records:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
