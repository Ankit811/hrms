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
      // Employees can see only their own records
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.loginType === 'HOD') {
      // HOD sees records of their department
      const user = await Employee.findById(req.user.id).populate('department');
      const employees = await Employee.find({ department: user.department._id }).select('employeeId');
      filter = { employeeId: { $in: employees.map(e => e.employeeId) } };
    }
    // Admin and CEO see all records (no filter)

    const attendance = await Attendance.find(filter).sort({ logDate: -1 });
    console.log('Fetched attendance:', attendance);
    res.json(attendance);
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
