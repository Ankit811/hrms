const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Audit = require('../models/Audit');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

// Initialize GridFS
let gfs;
const conn = mongoose.connection;
conn.once('open', () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'uploads' });
});

// Configure Multer with GridFS Storage
const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) return reject(err);
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads',
          metadata: { employeeId: req.body.employeeId || req.params.id }
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({ storage });

// Get all employees (Admin and CEO only)
router.get('/', auth, role(['Admin', 'CEO']), async (req, res) => {
  try {
    const employees = await Employee.find().populate('department');
    console.log('Fetched employees:', employees); // Debug log
    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single employee by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('department');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create employee (Admin only)
router.post('/', auth, role(['Admin']), upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]), async (req, res) => {
  try {
    console.log('Received req.body:', req.body); // Debug log

    const {
      employeeId, userId, email, password, name, dateOfBirth, mobileNumber,
      address, aadharNumber, dateOfJoining, department, position, role, loginType
    } = req.body;

    // Validate required fields and ensure no empty strings
    if (!employeeId || !userId || !email || !password || !name || !dateOfBirth || !mobileNumber || !address || !aadharNumber || !dateOfJoining || !department || !position || !role || !loginType) {
      return res.status(400).json({ message: 'All fields are required: employeeId, userId, email, password, name, dateOfBirth, mobileNumber, address, aadharNumber, dateOfJoining, department, position, role, loginType' });
    }
    if (aadharNumber.trim() === '') {
      return res.status(400).json({ message: 'Aadhar Number cannot be empty' });
    }
    if (!/^\d{12}$/.test(aadharNumber)) {
      return res.status(400).json({ message: 'Aadhar Number must be exactly 12 digits' });
    }
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const departmentExists = await Department.findById(department);
    if (!departmentExists) return res.status(400).json({ message: 'Invalid department' });

    const files = req.files || {};
    const profilePictureId = files.profilePicture ? files.profilePicture[0].id : null;
    const documentIds = files.documents ? files.documents.map(file => file.id) : [];

    const employee = new Employee({
      employeeId,
      userId,
      email,
      password, // Password will be hashed by the pre('save') middleware
      name,
      dateOfBirth: new Date(dateOfBirth),
      mobileNumber,
      address,
      aadharNumber,
      dateOfJoining: new Date(dateOfJoining),
      department,
      position,
      role,
      loginType,
      profilePicture: profilePictureId,
      documents: documentIds,
      locked: true,
      paidLeaves: 12,
      unpaidLeavesTaken: 0
    });

    const newEmployee = await employee.save();

    // Log audit (handle failure gracefully)
    try {
      await Audit.create({
        action: 'create_employee',
        user: req.user?.id || 'unknown',
        details: `Created employee ${employeeId}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.status(201).json(newEmployee);
  } catch (err) {
    console.error('Error creating employee:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update employee (Admin only)
router.put('/:id', auth, role(['Admin']), upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]), async (req, res) => {
  try {
    console.log('Received req.body for update:', req.body); // Debug log

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const updates = req.body;
    if (updates.department) {
      const departmentExists = await Department.findById(updates.department);
      if (!departmentExists) return res.status(400).json({ message: 'Invalid department' });
    }
    if (updates.aadharNumber && updates.aadharNumber.trim() === '') {
      return res.status(400).json({ message: 'Aadhar Number cannot be empty' });
    }
    if (updates.aadharNumber && !/^\d{12}$/.test(updates.aadharNumber)) {
      return res.status(400).json({ message: 'Aadhar Number must be exactly 12 digits' });
    }
    // Validate password strength if provided
    if (updates.password && updates.password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth);
    if (updates.dateOfJoining) updates.dateOfJoining = new Date(updates.dateOfJoining);

    const files = req.files || {};
    if (files.profilePicture) {
      if (employee.profilePicture) {
        await gfs
          .delete(new mongoose.Types.ObjectId(employee.profilePicture))
          .catch(err => console.warn(`Failed to delete profile picture: ${err.message}`));
      }
      employee.profilePicture = files.profilePicture[0].id;
    }
    if (files.documents) {
      if (employee.documents.length > 0) {
        for (const docId of employee.documents) {
          await gfs
            .delete(new mongoose.Types.ObjectId(docId))
            .catch(err => console.warn(`Failed to delete old document ${docId}: ${err.message}`));
        }
      }
      employee.documents = files.documents.map(file => file.id);
    }

    Object.assign(employee, updates);
    const updatedEmployee = await employee.save(); // Password will be hashed by the middleware if updated

    // Log audit (handle failure gracefully)
    try {
      await Audit.create({
        action: 'update_employee',
        user: req.user?.id || 'unknown',
        details: `Updated employee ${employee.employeeId}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.json(updatedEmployee);
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(400).json({ message: err.message });
  }
});

// Delete employee (Admin only)
router.delete('/:id', auth, role(['Admin']), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Delete associated files from GridFS
    if (employee.profilePicture) {
      await gfs
        .delete(new mongoose.Types.ObjectId(employee.profilePicture))
        .catch(err => console.warn(`Failed to delete profile picture: ${err.message}`));
    }
    if (employee.documents && employee.documents.length > 0) {
      await Promise.all(
        employee.documents.map(docId =>
          gfs
            .delete(new mongoose.Types.ObjectId(docId))
            .catch(err => console.warn(`Failed to delete document ${docId}: ${err.message}`))
        )
      );
    }

    // Delete the employee record
    await Employee.findByIdAndDelete(req.params.id);

    // Log audit (handle failure gracefully)
    try {
      await Audit.create({
        action: 'delete_employee',
        user: req.user?.id || 'unknown',
        details: `Deleted employee ${employee.employeeId}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('Error deleting employee:', err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get file by ID (e.g., profile picture or document)
router.get('/files/:fileId', auth, async (req, res) => {
  try {
    const file = await conn.db.collection('uploads.files').findOne({ _id: new mongoose.Types.ObjectId(req.params.fileId) });
    if (!file) return res.status(404).json({ message: 'File not found' });

    const downloadStream = gfs.openDownloadStream(new mongoose.Types.ObjectId(req.params.fileId));
    res.set('Content-Type', file.contentType);
    downloadStream.pipe(res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Lock/Unlock employee (Admin only)
router.patch('/:id/lock', auth, role(['Admin']), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    employee.locked = !employee.locked;
    const updatedEmployee = await employee.save();

    // Log audit (handle failure gracefully)
    try {
      await Audit.create({
        action: 'lock_unlock_employee',
        user: req.user?.id || 'unknown',
        details: `Toggled lock for employee ${employee.employeeId} to ${employee.locked}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.json(updatedEmployee);
  } catch (err) {
    console.error('Error locking/unlocking employee:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;