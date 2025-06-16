const express = require('express');
const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Leave = require('../models/Leave');
const OD = require('../models/OD');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const XLSX = require('xlsx');
const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    let filter = {};

    // Apply role-based restrictions
    if (req.user.loginType === 'Employee') {
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.loginType === 'HOD') {
      const user = await Employee.findById(req.user.id).populate('department');
      if (!user.department?._id) {
        return res.status(400).json({ message: 'HOD department not found' });
      }
      const employees = await Employee.find({ department: user.department._id }).select('employeeId');
      filter = { employeeId: { $in: employees.map(e => e.employeeId) } };
    }

    // Apply employeeId filter if provided
    if (req.query.employeeId) {
      const employee = await Employee.findOne({ employeeId: req.query.employeeId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee ID not found' });
      }
      if (req.query.departmentId) {
        const department = await Department.findById(req.query.departmentId);
        if (!department) {
          return res.status(400).json({ message: 'Invalid department ID' });
        }
        if (!employee.department.equals(req.query.departmentId)) {
          return res.status(400).json({ message: 'Employee does not belong to the selected department' });
        }
      }
      filter.employeeId = req.query.employeeId;
    } else if (req.query.departmentId) {
      const department = await Department.findById(req.query.departmentId);
      if (!department) {
        return res.status(400).json({ message: 'Invalid department ID' });
      }
      const deptEmployees = await Employee.find({ department: req.query.departmentId }).select('employeeId');
      if (deptEmployees.length === 0) {
        return res.status(404).json({ message: 'No employees found in the selected department' });
      }
      filter.employeeId = { $in: deptEmployees.map(e => e.employeeId) };
    }

    // Apply date range filter
    if (req.query.fromDate) {
      const fromDate = new Date(req.query.fromDate);
      if (isNaN(fromDate)) {
        return res.status(400).json({ message: 'Invalid fromDate format' });
      }
      // Adjust to UTC equivalent of IST start of day
      const fromDateUTC = new Date(fromDate.getTime() - (5.5 * 60 * 60 * 1000));
      fromDateUTC.setUTCHours(0, 0, 0, 0);
      const toDate = req.query.toDate ? new Date(req.query.toDate) : new Date(fromDate);
      if (isNaN(toDate)) {
        return res.status(400).json({ message: 'Invalid toDate format' });
      }
      // Adjust to UTC equivalent of IST end of day
      const toDateUTC = new Date(toDate.getTime() - (5.5 * 60 * 60 * 1000));
      toDateUTC.setUTCHours(23, 59, 59, 999);
      filter.logDate = { $gte: fromDateUTC, $lte: toDateUTC };
    }

    // Apply status filter
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const attendance = await Attendance.find(filter).lean();

    // Log duplicates for debugging
    const keyCounts = {};
    attendance.forEach((record) => {
      const key = `${record.employeeId}-${new Date(record.logDate).toISOString().split('T')[0]}`;
      keyCounts[key] = (keyCounts[key] || 0) + 1;
      if (keyCounts[key] > 1) {
        console.warn(`Duplicate attendance record found in backend for key: ${key}`, record);
      }
    });

    console.log(`Fetched ${attendance.length} attendance records for filter:`, filter);
    res.json({ attendance, total: attendance.length });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/download', auth, async (req, res) => {
  try {
    let filter = {};

    // Apply role-based restrictions
    if (req.user.loginType === 'Employee') {
      filter = { employeeId: req.user.employeeId };
    } else if (req.user.loginType === 'HOD') {
      const user = await Employee.findById(req.user.id).populate('department');
      if (!user.department?._id) {
        return res.status(400).json({ message: 'HOD department not found' });
      }
      const employees = await Employee.find({ department: user.department._id }).select('employeeId');
      filter = { employeeId: { $in: employees.map(e => e.employeeId) } };
    }

    // Apply employeeId filter if provided
    if (req.query.employeeId) {
      const employee = await Employee.findOne({ employeeId: req.query.employeeId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee ID not found' });
      }
      if (req.query.departmentId) {
        const department = await Department.findById(req.query.departmentId);
        if (!department) {
          return res.status(400).json({ message: 'Invalid department ID' });
        }
        if (!employee.department.equals(req.query.departmentId)) {
          return res.status(400).json({ message: 'Employee does not belong to the selected department' });
        }
      }
      filter.employeeId = req.query.employeeId;
    } else if (req.query.departmentId) {
      const department = await Department.findById(req.query.departmentId);
      if (!department) {
        return res.status(400).json({ message: 'Invalid department ID' });
      }
      const deptEmployees = await Employee.find({ department: req.query.departmentId }).select('employeeId');
      if (deptEmployees.length === 0) {
        return res.status(404).json({ message: 'No employees found in the selected department' });
      }
      filter.employeeId = { $in: deptEmployees.map(e => e.employeeId) };
    }

    // Apply date range filter
    if (req.query.fromDate) {
      const fromDate = new Date(req.query.fromDate);
      if (isNaN(fromDate)) {
        return res.status(400).json({ message: 'Invalid fromDate format' });
      }
      // Adjust to UTC equivalent of IST start of day
      const fromDateUTC = new Date(fromDate.getTime() - (5.5 * 60 * 60 * 1000));
      fromDateUTC.setUTCHours(0, 0, 0, 0);
      const toDate = req.query.toDate ? new Date(req.query.toDate) : new Date(fromDate);
      if (isNaN(toDate)) {
        return res.status(400).json({ message: 'Invalid toDate format' });
      }
      // Adjust to UTC equivalent of IST end of day
      const toDateUTC = new Date(toDate.getTime() - (5.5 * 60 * 60 * 1000));
      toDateUTC.setUTCHours(23, 59, 59, 999);
      filter.logDate = { $gte: fromDateUTC, $lte: toDateUTC };
    }

    // Apply status filter
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const attendance = await Attendance.find(filter).lean();

    // Log duplicates for debugging
    const keyCounts = {};
    attendance.forEach((record) => {
      const key = `${record.employeeId}-${new Date(record.logDate).toISOString().split('T')[0]}`;
      keyCounts[key] = (keyCounts[key] || 0) + 1;
      if (keyCounts[key] > 1) {
        console.warn(`Duplicate attendance record found in backend for key: ${key}`, record);
      }
    });

    console.log(`Fetched ${attendance.length} attendance records for download with filter:`, filter);

    // Fetch employee details for department information
    const employeeIds = [...new Set(attendance.map(record => record.employeeId))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } })
      .populate('department')
      .lean();
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.employeeId] = emp.department ? emp.department.name : 'Unknown';
      return map;
    }, {});

    // Fetch approved leaves
    const leaves = await Leave.find({
      $or: [
        { 'fullDay.from': { $gte: filter.logDate?.$gte, $lte: filter.logDate?.$lte } },
        { 'halfDay.date': { $gte: filter.logDate?.$gte, $lte: filter.logDate?.$lte } },
      ],
      'status.ceo': 'Approved',
    }).lean();

    // Fetch approved ODs
    const ods = await OD.find({
      dateOut: { $lte: filter.logDate?.$lte },
      dateIn: { $gte: filter.logDate?.$gte },
      'status.ceo': 'Approved',
    }).lean();

    // Create leave map
    const leaveMap = {};
    leaves.forEach(leave => {
      const dateKey = leave.halfDay?.date
        ? new Date(leave.halfDay.date).toISOString().split('T')[0]
        : new Date(leave.fullDay.from).toISOString().split('T')[0];
      const employeeKey = leave.employeeId;
      if (!leaveMap[employeeKey]) leaveMap[employeeKey] = {};
      leaveMap[employeeKey][dateKey] = leave.halfDay ? `(L) ${leave.halfDay.session === 'forenoon' ? 'First Half' : 'Second Half'}` : '(L)';
    });

    // Create OD map
    const odMap = {};
    ods.forEach(od => {
      const startDate = new Date(od.dateOut);
      const endDate = new Date(od.dateIn);
      const employeeKey = od.employeeId;
      if (!odMap[employeeKey]) odMap[employeeKey] = {};
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0];
        odMap[employeeKey][dateKey] = '(OD)';
      }
    });

    const data = attendance.map((record, index) => {
      const dateStr = new Date(record.logDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const leaveStatus = leaveMap[record.employeeId]?.[new Date(record.logDate).toISOString().split('T')[0]] || '';
      const odStatus = odMap[record.employeeId]?.[new Date(record.logDate).toISOString().split('T')[0]] || '';
      const status = leaveStatus || odStatus || (record.status === 'Absent' ? '(A)' : '');
      return {
        'Serial Number': index + 1,
        'Name of Employee': record.name,
        'Department': employeeMap[record.employeeId] || 'Unknown',
        'Date': `${dateStr} ${status}`,
        'Time In': record.timeIn || '-',
        'Time Out': record.timeOut || '-',
        'Status': record.status + (record.halfDay ? ` (${record.halfDay})` : ''),
        'OT': record.ot ? `${Math.floor(record.ot / 60)}:${(record.ot % 60).toString().padStart(2, '0')}` : '00:00',
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=attendance_${req.query.status || 'all'}_${req.query.fromDate}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating Excel:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
