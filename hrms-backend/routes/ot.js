const express = require('express');
const OTClaim = require('../models/OTClaim');
const Employee = require('../models/Employee');
const Notification = require('../models/Notification');
const Audit = require('../models/Audit');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Department = require('../models/Department');
const router = express.Router();

// Submit OT Claim
router.post('/', auth, role(['Employee', 'HOD', 'Admin']), async (req, res) => {
  try {
    const user = await Employee.findById(req.user.id).populate('department');
    if (!user) return res.status(404).json({ message: 'Employee not found' });
    if (!user.department) return res.status(400).json({ message: 'Employee department is required' });

    const { date, hours, projectDetails, claimType } = req.body;
    if (!date || !hours || !projectDetails) {
      return res.status(400).json({ message: 'Date, hours, and project details are required' });
    }

    const otDate = new Date(date);
    if (isNaN(otDate.getTime())) return res.status(400).json({ message: 'Invalid date' });
    if (hours <= 0 || hours > 24) return res.status(400).json({ message: 'Hours must be between 0 and 24' });

    // Normalize date for comparison
    const normalizeDate = (d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date;
    };
    const normalizedOtDate = normalizeDate(otDate);
    const now = new Date();
    const claimDeadline = new Date(normalizedOtDate.getTime() + 24 * 60 * 60 * 1000);
    claimDeadline.setHours(23, 59, 59, 999);

    // Check if claim is within 24 hours
    if (now > claimDeadline && user.department.name !== 'Production' && user.department.name !== 'Store' && user.department.name !== 'AMETL' && user.department.name !== 'Admin') {
      return res.status(400).json({ message: 'OT claim must be submitted within 24 hours' });
    }

    // Validate OT hours against Attendance
    const eligibleDepartments = ['Production', 'Store', 'AMETL', 'Admin'];
    const isEligible = eligibleDepartments.includes(user.department.name);
    let attendanceRecord;
    if (isEligible) {
      attendanceRecord = await Attendance.findOne({
        employeeId: user.employeeId,
        logDate: { $gte: normalizedOtDate, $lte: normalizedOtDate },
        ot: { $gt: 0 }
      });
      if (!attendanceRecord) {
        return res.status(400).json({ message: 'No OT recorded for this date' });
      }
      const recordedOtHours = attendanceRecord.ot / 60;
      if (hours > recordedOtHours) {
        return res.status(400).json({ message: `Claimed hours (${hours}) exceed recorded OT (${recordedOtHours.toFixed(1)})` });
      }
      if (recordedOtHours > 4 && !claimType) {
        return res.status(400).json({ message: 'Claim type (Full/Partial) is required for OT > 4 hours' });
      }
      if (claimType === 'Partial' && hours !== recordedOtHours - (recordedOtHours >= 8 ? 8 : 4)) {
        return res.status(400).json({ message: `Partial claim must be for ${recordedOtHours - (recordedOtHours >= 8 ? 8 : 4)} hours` });
      }
    } else {
      // Non-eligible departments: only Sundays
      if (otDate.getDay() !== 0) {
        return res.status(400).json({ message: 'OT claims for non-eligible departments are only allowed for Sundays' });
      }
      attendanceRecord = await Attendance.findOne({
        employeeId: user.employeeId,
        logDate: { $gte: normalizedOtDate, $lte: normalizedOtDate }
      });
      if (!attendanceRecord) {
        return res.status(400).json({ message: 'No attendance recorded for this date' });
      }
      const recordedOtHours = attendanceRecord.ot / 60;
      if (hours > recordedOtHours) {
        return res.status(400).json({ message: `Claimed hours (${hours}) exceed recorded OT (${recordedOtHours.toFixed(1)})` });
      }
      if (hours < 4) {
        return res.status(400).json({ message: 'Compensatory leave requires at least 4 hours' });
      }
    }

    let compensatoryHours = 0;
    let paymentAmount = 0;
    if (isEligible) {
      if (!claimType || claimType === 'Full') {
        paymentAmount = hours * 500 * 1.5; // Example rate
      } else if (claimType === 'Partial') {
        paymentAmount = (hours - (attendanceRecord.ot >= 8 * 60 ? 8 : 4)) * 500 * 1.5;
        compensatoryHours = attendanceRecord.ot >= 8 * 60 ? 8 : 4;
      }
    } else {
      compensatoryHours = hours >= 4 && hours < 8 ? 4 : hours >= 8 ? 8 : 0;
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
      claimType: isEligible ? (claimType || 'Full') : null
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

    const user = await Employee.findOne({ employeeId: otClaim.employeeId }).populate('department');
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
        const eligibleDepartments = ['Production', 'Store', 'AMETL', 'Admin'];
        const isEligible = eligibleDepartments.includes(user.department.name);
        if (isEligible) {
          const attendance = await Attendance.findOne({
            employeeId: user.employeeId,
            logDate: { $gte: new Date(otClaim.date).setHours(0, 0, 0, 0), $lte: new Date(otClaim.date).setHours(23, 59, 59, 999) }
          });
          if (attendance) {
            attendance.ot = 0; // Mark OT as claimed
            await attendance.save();
          }
          if (otClaim.compensatoryHours > 0) {
            await user.addCompensatoryLeave(otClaim.date, otClaim.compensatoryHours);
          }
        } else {
          if (otClaim.compensatoryHours > 0) {
            await user.addCompensatoryLeave(otClaim.date, otClaim.compensatoryHours);
          }
        }
      }
    } else {
      return res.status(403).json({ message: 'Not authorized to approve this OT claim' });
    }

    await otClaim.save();

    // Notify employee
    await Notification.create({ userId: user.employeeId, message: approverMessage });
    if (global._io) {
      global._io.to(user.employeeId).emit('notification', { message: approverMessage });
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
          global._io.to(nextApprover.employeeId).emit('notification', { message: `New OT claim from ${otClaim.name} awaits your approval` });
        }
      }
    }

    await Audit.create({
      user: req.user.employeeId,
      action: `${req.body.status} OT Claim`,
      details: `${req.body.status} OT claim for ${otClaim.name} on ${new Date(otClaim.date).toDateString()}`
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

