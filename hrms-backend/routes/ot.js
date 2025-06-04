const express = require('express');
const OTClaim = require('../models/OTClaim');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Audit = require('../models/Audit');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Department = require('../models/Department'); // Ensure Department model is imported
const router = express.Router();

// Submit OT Claim
router.post('/', auth, role(['Employee', 'HOD', 'Admin']), async (req, res) => {
  try {
    const user = await Employee.findById(req.user.id).populate('department');
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    if (!user.department) return res.status(400).json({ message: 'Employee department is required' });

    const { date, hours, projectDetails } = req.body;
    if (!date || !hours || !projectDetails) {
      return res.status(400).json({ message: 'Date, hours, and project details are required' });
    }

    const otDate = new Date(date);
    if (isNaN(otDate.getTime())) return res.status(400).json({ message: 'Invalid date' });
    if (hours <= 0 || hours > 24) return res.status(400).json({ message: 'Hours must be between 0 and 24' });

    // Check if OT date is a Sunday (non-working day)
    if (otDate.getDay() !== 0) {
      return res.status(400).json({ message: 'OT claims are only allowed for Sundays' });
    }

    // Check department eligibility
    const eligibleDepartments = ['IT', 'HR', 'Sales', 'Marketing', 'Accounts'];
    const isEligible = eligibleDepartments.includes(user.department.name);
    let compensatoryHours = 0;
    let paymentAmount = 0;

    if (isEligible) {
      compensatoryHours = hours; // 1 hour OT = 1 hour compensatory leave
    } else {
      const hourlyRate = 500; // Example rate, adjust as needed
      paymentAmount = hours * hourlyRate * 1.5; // 1.5x hourly rate
    }

    // Check compensatory leave balance (for eligible departments)
    if (isEligible) {
      const totalCompensatoryHours = await OTClaim.aggregate([
        { $match: { employeeId: user.employeeId, 'status.ceo': 'Approved' } },
        { $group: { _id: null, total: { $sum: '$compensatoryHours' } } },
      ]);
      const currentBalance = totalCompensatoryHours[0]?.total || 0;
      if (currentBalance + compensatoryHours > 40) {
        return res.status(400).json({ message: 'Compensatory leave balance cannot exceed 40 hours' });
      }
    }

    const status = {
      hod: 'Pending',
      admin: 'Pending',
      ceo: 'Pending',
    };
    if (req.user.role === 'Admin') {
      status.hod = 'Approved';
      status.admin = 'Approved';
    } else if (req.user.role === 'HOD') {
      status.hod = 'Approved';
    }

    const otClaim = new OTClaim({
      employeeId: user.employeeId,
      employee: user._id,
      name: user.name,
      department: user.department._id,
      date: otDate,
      hours,
      projectDetails,
      compensatoryHours,
      paymentAmount,
      status,
    });

    await otClaim.save();

    // Notify approvers
    if (req.user.role === 'Admin') {
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({ userId: ceo.employeeId, message: `New OT claim from ${user.name}` });
        if (global._io) global._io.to(ceo.employeeId).emit('notification', { message: `New OT claim from ${user.name}` });
      }
    } else if (req.user.role === 'HOD') {
      const admin = await Employee.findOne({ loginType: 'Admin' });
      if (admin) {
        await Notification.create({ userId: admin.employeeId, message: `New OT claim from ${user.name}` });
        if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `New OT claim from ${user.name}` });
      }
    } else {
      const hod = await Employee.findOne({ department: user.department._id, loginType: 'HOD' });
      const admin = await Employee.findOne({ loginType: 'Admin' });
      if (hod) {
        await Notification.create({ userId: hod.employeeId, message: `New OT claim from ${user.name}` });
        if (global._io) global._io.to(hod.employeeId).emit('notification', { message: `New OT claim from ${user.name}` });
      } else if (admin) {
        await Notification.create({ userId: admin.employeeId, message: `New OT claim from ${user.name}` });
        if (global._io) global._io.to(admin.employeeId).emit('notification', { message: `New OT claim from ${user.name}` });
      }
    }

    await Audit.create({ user: user.employeeId, action: 'Submit OT Claim', details: `Submitted OT claim for ${hours} hours on ${otDate.toISOString()}` });

    res.status(201).json(otClaim);
  } catch (err) {
    console.error('OT claim submit error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Approve OT Claim
router.put('/:id/approve', auth, role(['HOD', 'Admin', 'CEO']), async (req, res) => {
  try {
    const otClaim = await OTClaim.findById(req.params.id);
    if (!otClaim) return res.status(404).json({ message: 'OT claim not found' });

    const user = await Employee.findOne({ employeeId: otClaim.employeeId });
    if (!user) return res.status(404).json({ message: 'Employee not found' });

    let nextStage = '';
    let approverMessage = '';

    if (req.user.role === 'HOD' && otClaim.status.hod === 'Pending') {
      otClaim.status.hod = req.body.status;
      if (req.body.status === 'Approved') {
        nextStage = 'admin';
        approverMessage = `OT claim from ${otClaim.name} approved by HOD`;
      } else {
        approverMessage = `Your OT claim for ${new Date(otClaim.date).toDateString()} was rejected by HOD`;
      }
    } else if (req.user.role === 'Admin' && otClaim.status.hod === 'Approved' && otClaim.status.admin === 'Pending') {
      otClaim.status.admin = req.body.status;
      if (req.body.status === 'Approved') {
        nextStage = 'ceo';
        approverMessage = `OT claim from ${otClaim.name} approved by Admin`;
      } else {
        approverMessage = `Your OT claim for ${new Date(otClaim.date).toDateString()} was rejected by Admin`;
      }
    } else if (req.user.role === 'CEO' && otClaim.status.admin === 'Approved' && otClaim.status.ceo === 'Pending') {
      otClaim.status.ceo = req.body.status;
      approverMessage = `Your OT claim for ${new Date(otClaim.date).toDateString()} was ${req.body.status.toLowerCase()} by CEO`;
      if (req.body.status === 'Approved') {
        // Update employee compensatory leave balance or payment
        const eligibleDepartments = ['Admin', 'AMETL', 'Testing', 'Production'];
        const department = await Department.findById(otClaim.department);
        if (eligibleDepartments.includes(department.name)) {
          user.compensatoryLeaves = (user.compensatoryLeaves || 0) + otClaim.compensatoryHours;
          await user.save();
        }
        // Payment processing for non-eligible departments can be handled separately
      }
    } else {
      return res.status(403).json({ message: 'Not authorized to approve this OT claim' });
    }

    await otClaim.save();

    // Notify employee
    await Notification.create({ userId: user.employeeId, message: approverMessage });
    if (global._io) {
      global._io.to(user.employeeId).emit('notification', {
        message: approverMessage,
      });
    }

    if (nextStage) {
      let nextApprover = null;
      if (nextStage === 'admin') {
        nextApprover = await Employee.findOne({ loginType: 'Admin' });
      } else if (nextStage === 'ceo') {
        nextApprover = await Employee.findOne({ loginType: 'CEO' });
      }
      if (nextApprover) {
        await Notification.create({ userId: nextApprover.employeeId, message: `New OT claim from ${otClaim.name} awaits your approval` });
        if (global._io) {
          global._io.to(nextApprover.employeeId).emit('notification', {
            message: `New OT claim from ${otClaim.name} awaits your approval`,
          });
        }
      }
    }

    await Audit.create({
      user: req.user.employeeId,
      action: `${req.body.status} OT Claim`,
      details: `${req.body.status} OT claim for ${otClaim.name} on ${new Date(otClaim.date).toDateString()}`,
    });

    res.json(otClaim);
  } catch (err) {
    console.error('OT claim approval error:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get OT Claims
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
    } else if (req.user.role === 'Admin' || req.user.role === 'CEO') {
      filter = {};
    } else {
      return res.status(403).json({ message: 'Unauthorized role' });
    }

    if (status && status !== 'all') {
      filter.$or = [
        { 'status.hod': status },
        { 'status.admin': status },
        { 'status.ceo': status },
      ];
    }

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate) {
        const toDateEnd = new Date(toDate);
        toDateEnd.setHours(23, 59, 59, 999);
        filter.date.$lte = toDateEnd;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const otClaims = await OTClaim.find(filter)
      .populate('department employee')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await OTClaim.countDocuments(filter);

    res.json({ otClaims, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Error fetching OT claims:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;

