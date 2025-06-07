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
    const employee = await Employee.findById(req.user.id).populate('department');
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (!employee.department) return res.status(400).json({ error: 'Employee department is required' });

    const { date, hours, projectDetails, claimType } = req.body;
    if (!date || !hours || !projectDetails) {
      return res.status(400).json({ error: 'Date, hours, and project details are required' });
    }

    const otDate = new Date(date);
    if (isNaN(otDate.getTime())) return res.status(400).json({ error: 'Invalid date' });
    if (hours <= 0 || hours > 24) return res.status(400).json({ error: 'Hours must be between 0 and 24' });
    if (hours < 1) return res.status(400).json({ error: 'Hours must be at least 1' });

    // Use date as-is for comparison
    const normalizeDate = (d) => {
      const date = new Date(d);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };
    const normalizedOtDate = normalizeDate(otDate);
    const now = new Date();
    const claimDeadline = new Date(normalizedOtDate);
    claimDeadline.setDate(claimDeadline.getDate() + 1);
    claimDeadline.setHours(23, 59, 59, 999); // 11:59:59.999 PM

    // Check if claim is within deadline
    if (now > claimDeadline) {
      return res.status(400).json({ error: 'OT claim must be submitted by 11:59 PM the next day' });
    }

    // Validate OT hours against Attendance
    const eligibleDepartments = ['Production', 'Testing', 'AMETL', 'Admin'];
    const isEligible = eligibleDepartments
      .map(d => d.toLowerCase())
      .includes(employee.department?.name?.toLowerCase());
    let attendanceRecord;
    if (isEligible) {
      attendanceRecord = await Attendance.findOne({
        employeeId: employee.employeeId,
        logDate: { $gte: normalizedOtDate, $lte: normalizedOtDate },
        ot: { $gte: 60 } // At least 1 hour
      });
      if (!attendanceRecord) {
        return res.status(400).json({ error: 'No OT recorded for this date' });
      }
      const recordedOtHours = attendanceRecord.ot / 60;
      if (hours > recordedOtHours) {
        return res.status(400).json({ error: `Claimed hours (${hours}) exceed recorded OT (${recordedOtHours.toFixed(1)})` });
      }
      if (recordedOtHours > 4 && !claimType) {
        return res.status(400).json({ error: 'Claim type (Full/Partial) is required for OT > 4 hours' });
      }
      if (claimType === 'Partial' && hours !== recordedOtHours - (recordedOtHours >= 8 ? 8 : 4)) {
        return res.status(400).json({ error: `Partial claim must be for ${recordedOtHours - (recordedOtHours >= 8 ? 8 : 4)} hours` });
      }
    } else {
      if (otDate.getDay() !== 0) {
        return res.status(400).json({ error: 'OT claims for non-eligible departments are only allowed for Sundays' });
      }
      attendanceRecord = await Attendance.findOne({
        employeeId: employee.employeeId,
        logDate: { $gte: normalizedOtDate, $lte: normalizedOtDate },
      });
      if (!attendanceRecord) {
        return res.status(400).json({ error: 'No attendance recorded for this date' });
      }
      const recordedOtHours = attendanceRecord.ot / 60;
      if (hours > recordedOtHours) {
        return res.status(400).json({ error: `Claimed hours (${hours}) exceed recorded OT (${recordedOtHours.toFixed(1)})` });
      }
      if (hours < 4) {
        return res.status(400).json({ error: 'Compensatory leave requires at least 4 hours' });
      }
    }

    let compensatoryHours = 0;
    let paymentAmount = 0;
    if (isEligible) {
      if (!claimType || claimType === 'Full') {
        paymentAmount = hours * 500 * 1.5;
      } else if (claimType === 'Partial') {
        paymentAmount = (hours - (attendanceRecord.ot >= 8 * 60 ? 8 : 4)) * 500 * 1.5;
        compensatoryHours = attendanceRecord.ot >= 8 * 60 ? 8 : 4;
      }
    } else {
      compensatoryHours = hours >= 4 && hours < 8 ? 4 : hours >= 8 ? 8 : 0;
    }

    const status = {
      hod: req.user.role === 'Employee' ? 'Pending' : 'Approved',
      admin: 'Pending',
      ceo: 'Pending',
    };
    if (req.user.role === 'HOD' || req.user.role === 'Admin') {
      status.hod = 'Approved';
    }

    const otClaim = new OTClaim({
      employeeId: employee.employeeId,
      employee: employee._id,
      name: employee.name,
      department: employee.department._id,
      date: otDate,
      hours,
      projectDetails,
      compensatoryHours,
      paymentAmount,
      status,
      claimType: isEligible ? (claimType || 'Full') : null
    });

    await otClaim.save();

    // Notify based on user role
    if (req.user.role === 'HOD' || req.user.role === 'Admin') {
      const ceo = await Employee.findOne({ loginType: 'CEO' });
      if (ceo) {
        await Notification.create({
          userId: ceo.employeeId,
          message: `New OT claim from ${employee.name}`,
        });
        if (global._io)
          global._io
            .to(ceo.employeeId)
            .emit('notification', {
              message: `New OT claim from ${employee.name}`,
            });
      }
    } else {
      const hod = await Employee.findOne({
        department: employee.department._id,
        loginType: 'HOD',
      });
      if (hod) {
        await Notification.create({
          userId: hod.employeeId,
          message: `New OT claim from ${employee.name}`,
        });
        if (global._io)
          global._io
            .to(hod.employeeId)
            .emit('notification', {
              message: `New OT claim from ${employee.name}`,
            });
      }
    }

    await Audit.create({
      user: employee.employeeId,
      action: 'Submit OT Claim',
      details: `Submitted OT claim for ${hours} hours on ${otDate.toISOString()}`,
    });

    res.status(201).json(otClaim);
  } catch (err) {
    console.error('OT claim submit error:', err.stack);
    res.status(500).json({ error: 'Server error', error: err.message });
  }
});

// Approve OT Claim
router.put('/:id/approve', auth, role(['HOD', 'Admin', 'CEO']), async (req, res) => {
    try {
      const otClaim = await OTClaim.findById(req.params.id);
    if (!otClaim) return res.status(404).json({ error: 'OT claim not found' });

    const employee = await Employee.findOne({ employeeId: otClaim.employeeId }).populate('department');
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

      let nextStage = '';
      let approverMessage = '';

      if (req.user.role === 'HOD' && otClaim.status.hod === 'Pending') {
      otClaim.status.hod = req.body.status;
        if (req.body.status === 'Approved') {
          nextStage = 'ceo';
          approverMessage = `OT claim from ${otClaim.name} approved by HOD`;
        } else {
        approverMessage = `Your OT claim for ${new Date(otClaim.date).toDateString()} was rejected by HOD`;
        }
      } else if (
        req.user.role === 'CEO' &&
        otClaim.status.hod === 'Approved' &&
        otClaim.status.ceo === 'Pending'
      ) {
        otClaim.status.ceo = req.body.status;
        if (req.body.status === 'Approved') {
          nextStage = employee.loginType === 'Admin' ? '' : 'admin';
          approverMessage = `OT claim from ${otClaim.name} approved by CEO`;
        } else {
          approverMessage = `Your OT claim for ${new Date(
            otClaim.date
          ).toDateString()} was rejected by CEO`;
        }
      } else if (
        req.user.role === 'Admin' &&
        otClaim.status.ceo === 'Approved' &&
        otClaim.status.admin === 'Pending'
      ) {
        otClaim.status.admin = req.body.status;
        approverMessage = `Your OT claim for ${new Date(otClaim.date).toDateString()} was ${req.body.status.toLowerCase()} by Admin`;
        if (req.body.status === 'Approved') {
          const eligibleDepartments = [
            'Production',
            'Testing',
            'AMETL',
            'Admin',
          ];
          const isEligible = eligibleDepartments.includes(
            employee.department.departmentName
          );
          if (isEligible) {
            const attendance = await Attendance.findOne({
              employeeId: employee.employeeId,
              logDate: {
                $gte: new Date(otClaim.date).setHours(0, 0, 0, 0),
                $lte: new Date(otClaim.date).setHours(23, 59, 9999),
              },
            });
            if (attendance) {
              attendance.ot = 0;
              await attendance.save();
            }
            if (otClaim.compensatoryHours > 0) {
              await employee.addCompensatoryLeave(
                otClaim.date,
                otClaim.compensatoryHours
              );
            }
          } else {
            if (otClaim.compensatoryHours > 0) {
              await employee.addCompensatoryLeave(
                otClaim.date,
                otClaim.compensatoryHours
              );
            }
          }
        }
      } else {
        return res
          .status(403)
          .json({ error: 'Not authorized to approve this OT claim' });
      }

      await otClaim.save();
      await Notification.create({
        userId: employee.employeeId,
        message: approverMessage,
      });
      if (global._io) {
        global._io
          .to(employee.employeeId)
          .emit('employeeId')
          .emit('notification', { message: approverMessage });
      }

      if (nextStage) {
        let nextApprover = null;
        if (nextStage === 'ceo') {
          nextApprover = await Employee.findOne({ loginType: 'CEO' });
        } else if (nextStage === 'admin') {
          nextApprover = await Employee.findOne({ loginType: 'Admin' });
        } else if (nextApprover) {
          await Notification.create({
            userId: nextApprover.employeeId,
            message: `New OT claim from ${otClaim.name} awaits your approval`,
          });
          if (global._io) {
            global._io
              .to(nextApprover.employeeId)
              .emit('notification', {
                message: `New OT claim from ${otClaim.name} awaits your approval`,
              });
          }
        }
      }
      await Audit.create({
        user: req.user.employeeId,
        action: `${req.body.status} OT Claim`,
        details: `${req.body.status} OT claim for ${otClaim.name} on ${new Date(
          otClaim.date
        ).toDateString()})}`,
      });

      res.json(otClaim);
    } catch (err) {
      console.error('OT claim approval error:', err.stack);
      res.status(500).json({ error: 'Server error', error: err.message });
    }
  }
);

// Get OT Claims
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};
    const { status, fromDate, toDate, page = 1, limit = 10 } = req.query;

    if (req.user.role === 'Employee') {
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.role === 'HOD') {
      const hod = await Employee.findOne({ employeeId: req.user.employeeId })
        .populate('department')
        .populate('employee.employeeId');
      if (
        !hod ||
        !employeeId ||
        !hod.department ||
        !departmentId._id.department._id
      ) {
        return res
          .status(400)
          .json({ message: 'HOD approval has no valid department assigned' });
      }
      filter = { departmentId: hod.department._id };
    } else if (req.user.role === 'Admin' || req.user.role === 'CEO') {
      filter = {};
    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
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

    const unclaimedOTRecords = await Attendance.find({
      employeeId: req.user.employeeId,
      ot: { $gt: 0 }, // Any OT
      logDate: { $gte: new Date().setDate(new Date().getDate() - 7) },
    }).lean();

    const unclaimedWithDeadline = unclaimedOTRecords.map(record => {
      console.log(`Processing logDate: ${record.logDate}, OT: ${record.ot} minutes`);
      // Use logDate as-is
      const logDate = new Date(record.logDate);
      // Set claimDeadline to next day 11:59:59.999 PM
      const claimDeadline = new Date(logDate);
      claimDeadline.setDate(claimDeadline.getDate() + 1);
      claimDeadline.setHours(23, 59, 59, 999); // Match logDate format
      console.log(`Calculated claimDeadline: ${claimDeadline.toISOString()}`);
      return {
        _id: record._id,
        date: logDate, // OT date
        hours: (record.ot / 60).toFixed(1),
        day: logDate.toLocaleDateString('en-US', { weekday: 'long' }),
        claimDeadline,
      };
    });

    const total = await OTClaim.countDocuments(filter);

    res.json({ otClaims, unclaimedOTRecords: unclaimedWithDeadline, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Error fetching OT claims:', err.stack);
    res.status(500).json({ error: 'Server error', error: err.message });
  }
});

module.exports = router;
