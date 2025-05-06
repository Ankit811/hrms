const express = require('express');
const Attendance = require('../models/Attendance');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const { generatePDF } = require('../utils/generatePDF');
const Department = require('../models/Department'); // Moved import to top
const router = express.Router();

router.get('/attendance', auth, role(['Admin', 'CEO']), async (req, res) => {
  try {
    const { type, department, date } = req.query; // type: daily, monthly, department-wise, yearly
    let filter = {};
    if (req.user.loginType === 'CEO') {
      filter.department = await Department.findOne({ name: 'Admin' }).select('_id');
    }
    if (department) filter.department = department;
    if (type === 'daily' && date) {
      filter.logDate = new Date(date);
    } else if (type === 'monthly' && date) {
      const [year, month] = date.split('-');
      filter.logDate = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0),
      };
    } else if (type === 'yearly' && date) {
      const year = date;
      filter.logDate = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31),
      };
    }

    const attendance = await Attendance.find(filter).populate('department');
    const pdfBuffer = await generatePDF(attendance, type);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=attendance_${type}.pdf`,
    });
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;