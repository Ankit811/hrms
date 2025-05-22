const express = require('express');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.loginType === 'Employee') {
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.loginType === 'HOD') {
      const user = await Employee.findById(req.user.id).populate('department');
      const employees = await Employee.find({ department: user.department._id }).select('employeeId');
      filter = { employeeId: { $in: employees.map(e => e.employeeId) } };
    }

    // Add filter from query
    if (req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }
    if (req.query.departmentId) {
      const deptEmployees = await Employee.find({ department: req.query.departmentId }).select('employeeId');
      filter.employeeId = { $in: deptEmployees.map(e => e.employeeId) };
    }
    if (req.query.fromDate && req.query.toDate) {
      filter.logDate = {
        $gte: new Date(req.query.fromDate),
        $lte: new Date(req.query.toDate),
      };
    }

    const attendance = await Attendance.find(filter).sort({ logDate: -1 });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
