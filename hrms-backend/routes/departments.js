const express = require('express');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const Audit = require('../models/Audit');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const router = express.Router();

router.get('/', auth, role(['Admin']), async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, role(['Admin']), async (req, res) => {
  try {
    const department = new Department({ name: req.body.name });
    await department.save();
    await Audit.create({ userId: req.user.employeeId, action: 'Create Department', details: `Created department ${req.body.name}` });
    res.status(201).json(department);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth, role(['Admin']), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    department.name = req.body.name;
    await department.save();
    await Audit.create({ userId: req.user.employeeId, action: 'Update Department', details: `Updated department ${department.name}` });
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, role(['Admin']), async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found' });

    const employees = await Employee.find({ department: req.params.id });
    if (employees.length > 0) return res.status(400).json({ message: 'Cannot delete department with assigned employees' });

    await Department.deleteOne({ _id: req.params.id });
    await Audit.create({ userId: req.user.employeeId, action: 'Delete Department', details: `Deleted department ${department.name}` });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;