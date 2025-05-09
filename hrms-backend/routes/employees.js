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
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'Uploads' });
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
          bucketName: 'Uploads',
          metadata: { employeeId: req.body.employeeId || req.params.id }
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB default limit
  },
  fileFilter: (req, file, cb) => {
    const fileTypes = /pdf/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    const fieldName = file.fieldname;
    let maxSize;

    if (fieldName === 'salarySlips' || fieldName === 'panCard' || fieldName === 'aadharCard' || fieldName === 'bankPassbook') {
      maxSize = 1 * 1024 * 1024; // 1MB
    } else if (fieldName === 'medicalCertificate' || fieldName === 'backgroundVerification') {
      maxSize = 2 * 1024 * 1024; // 2MB
    } else {
      maxSize = 5 * 1024 * 1024; // 5MB
    }

    if (extname && mimetype && file.size <= maxSize) {
      return cb(null, true);
    }
    cb(new Error(`Invalid file type or size for ${fieldName}. Only PDF files up to ${maxSize / 1024 / 1024}MB are allowed.`));
  }
});

// Get all employees (Admin and CEO only)
router.get('/', auth, role(['Admin', 'CEO']), async (req, res) => {
  try {
    const employees = await Employee.find().populate('department reportingManager');
    console.log('Fetching employees for role:', req.user.role);
    console.log('Employees found:', employees.length);
    res.json(employees);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get employees in HOD's department
router.get('/department', auth, role(['HOD']), async (req, res) => {
  try {
    const { employeeId } = req.user;
    const hod = await Employee.findOne({ employeeId }).populate('department');
    if (!hod?.department?._id) {
      return res.status(400).json({ message: 'HOD department not found' });
    }
    const employees = await Employee.find({ department: hod.department._id }).populate('department reportingManager');
    console.log('Fetching department employees for HOD:', hod.department._id);
    console.log('Employees found:', employees.length);
    res.json(employees);
  } catch (err) {
    console.error('Error fetching department employees:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all departments
router.get('/departments', auth, role(['Admin', 'CEO']), async (req, res) => {
  try {
    const departments = await Department.find({}, '_id name');
    console.log('Fetching departments:', departments.length);
    res.json(departments);
  } catch (err) {
    console.error('Error fetching departments:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get single employee by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('department reportingManager');
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create employee (Admin only)
router.post('/', auth, role(['Admin']), upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'tenthTwelfthDocs', maxCount: 1 },
  { name: 'graduationDocs', maxCount: 1 },
  { name: 'postgraduationDocs', maxCount: 1 },
  { name: 'experienceCertificate', maxCount: 1 },
  { name: 'salarySlips', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 },
  { name: 'bankPassbook', maxCount: 1 },
  { name: 'medicalCertificate', maxCount: 1 },
  { name: 'backgroundVerification', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      employeeId, userId, email, password, name, dateOfBirth, fatherName, motherName,
      mobileNumber, permanentAddress, currentAddress, aadharNumber, gender, maritalStatus, 
      spouseName, emergencyContactName, emergencyContactNumber, dateOfJoining, reportingManager,
      status, probationPeriod, confirmationDate, referredBy, loginType,
      designation, location, department, employeeType, panNumber, pfNumber,
      uanNumber, esiNumber, paymentType, bankName, bankBranch, accountNumber, ifscCode
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'employeeId', 'userId', 'email', 'password', 'name', 'dateOfBirth', 'fatherName',
      'motherName', 'mobileNumber', 'permanentAddress', 'currentAddress', 'aadharNumber', 
      'gender', 'maritalStatus', 'emergencyContactName', 'emergencyContactNumber', 
      'dateOfJoining', 'reportingManager', 'status', 'loginType', 'designation', 
      'location', 'department', 'employeeType', 'panNumber', 'paymentType'
    ];
    for (const field of requiredFields) {
      if (!req.body[field] || req.body[field].trim() === '') {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    if (maritalStatus === 'Married' && (!spouseName || spouseName.trim() === '')) {
      return res.status(400).json({ message: 'Spouse name is required for married employees' });
    }

    if (status === 'Probation' && (!probationPeriod || !confirmationDate)) {
      return res.status(400).json({ message: 'Probation period and confirmation date are required for probation status' });
    }

    if (paymentType === 'Bank Transfer' && (!bankName || !bankBranch || !accountNumber || !ifscCode)) {
      return res.status(400).json({ message: 'Bank details are required for bank transfer payment type' });
    }

    if (!/^\d{12}$/.test(aadharNumber)) {
      return res.status(400).json({ message: 'Aadhar Number must be exactly 12 digits' });
    }
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({ message: 'Mobile Number must be exactly 10 digits' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    if (!/^[A-Z0-9]{10}$/.test(panNumber)) {
      return res.status(400).json({ message: 'PAN Number must be 10 alphanumeric characters' });
    }
    if (pfNumber && !/^\d{18}$/.test(pfNumber)) {
      return res.status(400).json({ message: 'PF Number must be 18 digits' });
    }
    if (uanNumber && !/^\d{12}$/.test(uanNumber)) {
      return res.status(400).json({ message: 'UAN Number must be 12 digits' });
    }
    if (esiNumber && !/^\d{12}$/.test(esiNumber)) {
      return res.status(400).json({ message: 'ESI Number must be 12 digits' });
    }

    const departmentExists = await Department.findById(department);
    if (!departmentExists) return res.status(400).json({ message: 'Invalid department' });

    const reportingManagerExists = await Employee.findById(reportingManager);
    if (!reportingManagerExists) return res.status(400).json({ message: 'Invalid reporting manager' });

    const files = req.files || {};
    const documentIds = [
      files.tenthTwelfthDocs ? files.tenthTwelfthDocs[0].id : null,
      files.graduationDocs ? files.graduationDocs[0].id : null,
      files.postgraduationDocs ? files.postgraduationDocs[0].id : null,
      files.experienceCertificate ? files.experienceCertificate[0].id : null,
      files.salarySlips ? files.salarySlips[0].id : null,
      files.panCard ? files.panCard[0].id : null,
      files.aadharCard ? files.aadharCard[0].id : null,
      files.bankPassbook ? files.bankPassbook[0].id : null,
      files.medicalCertificate ? files.medicalCertificate[0].id : null,
      files.backgroundVerification ? files.backgroundVerification[0].id : null
    ].filter(id => id !== null);

    const employee = new Employee({
      employeeId,
      userId,
      email,
      password,
      name,
      dateOfBirth: new Date(dateOfBirth),
      fatherName,
      motherName,
      mobileNumber,
      permanentAddress,
      currentAddress,
      aadharNumber,
      gender,
      maritalStatus,
      spouseName,
      emergencyContactName,
      emergencyContactNumber,
      dateOfJoining: new Date(dateOfJoining),
      reportingManager,
      status,
      probationPeriod: status === 'Probation' ? probationPeriod : null,
      confirmationDate: status === 'Probation' ? new Date(confirmationDate) : null,
      referredBy,
      loginType,
      designation,
      location,
      department,
      employeeType,
      panNumber,
      pfNumber,
      uanNumber,
      esiNumber,
      profilePicture: files.profilePicture ? files.profilePicture[0].id : null,
      documents: documentIds,
      paymentType,
      bankDetails: paymentType === 'Bank Transfer' ? {
        bankName,
        bankBranch,
        accountNumber,
        ifscCode
      } : {},
      locked: true,
      basicInfoLocked: true,
      positionLocked: true,
      statutoryLocked: true,
      documentsLocked: true,
      paymentLocked: true,
      paidLeaves: 12,
      unpaidLeavesTaken: 0
    });

    const newEmployee = await employee.save();

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

// Update employee (Admin or authorized Employee)
router.put('/:id', auth, upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'tenthTwelfthDocs', maxCount: 1 },
  { name: 'graduationDocs', maxCount: 1 },
  { name: 'postgraduationDocs', maxCount: 1 },
  { name: 'experienceCertificate', maxCount: 1 },
  { name: 'salarySlips', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'aadharCard', maxCount: 1 },
  { name: 'bankPassbook', maxCount: 1 },
  { name: 'medicalCertificate', maxCount: 1 },
  { name: 'backgroundVerification', maxCount: 1 }
]), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const isAdmin = req.user.role === 'Admin';
    const isSelf = req.user.employeeId === employee.employeeId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Unauthorized to update this employee' });
    }

    const updates = req.body;
    const files = req.files || {};

    // Define fields by section
    const basicInfoFields = [
      'employeeId', 'userId', 'email', 'password', 'name', 'dateOfBirth', 'fatherName',
      'motherName', 'mobileNumber', 'permanentAddress', 'currentAddress', 'aadharNumber',
      'gender', 'maritalStatus', 'spouseName', 'emergencyContactName', 'emergencyContactNumber',
      'dateOfJoining', 'reportingManager', 'status', 'probationPeriod', 'confirmationDate',
      'referredBy', 'loginType'
    ];
    const positionFields = ['designation', 'location', 'department', 'employeeType'];
    const statutoryFields = ['panNumber', 'pfNumber', 'uanNumber', 'esiNumber'];
    const documentFields = [
      'tenthTwelfthDocs', 'graduationDocs', 'postgraduationDocs', 'experienceCertificate',
      'salarySlips', 'panCard', 'aadharCard', 'bankPassbook', 'medicalCertificate',
      'backgroundVerification', 'profilePicture'
    ];
    const paymentFields = ['paymentType', 'bankName', 'bankBranch', 'accountNumber', 'ifscCode'];

    // Check lock status for each section
    if (!isAdmin) {
      const unauthorizedFields = [];
      if (employee.basicInfoLocked && basicInfoFields.some(field => updates[field] || files[field])) {
        unauthorizedFields.push('Basic Information');
      }
      if (employee.positionLocked && positionFields.some(field => updates[field])) {
        unauthorizedFields.push('Employee Position');
      }
      if (employee.statutoryLocked && statutoryFields.some(field => updates[field])) {
        unauthorizedFields.push('Statutory Information');
      }
      if (employee.documentsLocked && documentFields.some(field => files[field])) {
        unauthorizedFields.push('Document Upload');
      }
      if (employee.paymentLocked && paymentFields.some(field => updates[field])) {
        unauthorizedFields.push('Payment Information');
      }
      if (unauthorizedFields.length > 0) {
        return res.status(403).json({ message: `Cannot update locked sections: ${unauthorizedFields.join(', ')}` });
      }
    }

    // Validate updates
    if (updates.department) {
      const departmentExists = await Department.findById(updates.department);
      if (!departmentExists) return res.status(400).json({ message: 'Invalid department' });
    }
    if (updates.reportingManager) {
      const reportingManagerExists = await Employee.findById(updates.reportingManager);
      if (!reportingManagerExists) return res.status(400).json({ message: 'Invalid reporting manager' });
    }
    if (updates.aadharNumber && !/^\d{12}$/.test(updates.aadharNumber)) {
      return res.status(400).json({ message: 'Aadhar Number must be exactly 12 digits' });
    }
    if (updates.mobileNumber && !/^\d{10}$/.test(updates.mobileNumber)) {
      return res.status(400).json({ message: 'Mobile Number must be exactly 10 digits' });
    }
    if (updates.password && updates.password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }
    if (updates.panNumber && !/^[A-Z0-9]{10}$/.test(updates.panNumber)) {
      return res.status(400).json({ message: 'PAN Number must be 10 alphanumeric characters' });
    }
    if (updates.pfNumber && !/^\d{18}$/.test(updates.pfNumber)) {
      return res.status(400).json({ message: 'PF Number must be 18 digits' });
    }
    if (updates.uanNumber && !/^\d{12}$/.test(updates.uanNumber)) {
      return res.status(400).json({ message: 'UAN Number must be 12 digits' });
    }
    if (updates.esiNumber && !/^\d{12}$/.test(updates.esiNumber)) {
      return res.status(400).json({ message: 'ESI Number must be 12 digits' });
    }
    if (updates.dateOfBirth) updates.dateOfBirth = new Date(updates.dateOfBirth);
    if (updates.dateOfJoining) updates.dateOfJoining = new Date(updates.dateOfJoining);
    if (updates.confirmationDate) updates.confirmationDate = new Date(updates.confirmationDate);
    if (updates.paymentType === 'Bank Transfer' && (!updates.bankName || !updates.bankBranch || !updates.accountNumber || !updates.ifscCode)) {
      return res.status(400).json({ message: 'Bank details are required for bank transfer payment type' });
    }

    // Handle file uploads
    if (files.profilePicture) {
      if (employee.profilePicture) {
        await gfs.delete(new mongoose.Types.ObjectId(employee.profilePicture))
          .catch(err => console.warn(`Failed to delete profile picture: ${err.message}`));
      }
      employee.profilePicture = files.profilePicture[0].id;
    }

    const docFields = [
      'tenthTwelfthDocs', 'graduationDocs', 'postgraduationDocs', 'experienceCertificate',
      'salarySlips', 'panCard', 'aadharCard', 'bankPassbook', 'medicalCertificate',
      'backgroundVerification'
    ];
    const newDocumentIds = docFields.map(field => files[field] ? files[field][0].id : null).filter(id => id !== null);
    if (newDocumentIds.length > 0) {
      if (employee.documents.length > 0) {
        for (const docId of employee.documents) {
          await gfs.delete(new mongoose.Types.ObjectId(docId))
            .catch(err => console.warn(`Failed to delete old document ${docId}: ${err.message}`));
        }
      }
      employee.documents = newDocumentIds;
    }

    // Apply updates
    Object.assign(employee, updates);
    if (updates.paymentType) {
      employee.bankDetails = updates.paymentType === 'Bank Transfer' ? {
        bankName: updates.bankName,
        bankBranch: updates.bankBranch,
        accountNumber: updates.accountNumber,
        ifscCode: updates.ifscCode
      } : {};
    }

    const updatedEmployee = await employee.save();

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

    if (employee.profilePicture) {
      await gfs.delete(new mongoose.Types.ObjectId(employee.profilePicture))
        .catch(err => console.warn(`Failed to delete profile picture: ${err.message}`));
    }
    if (employee.documents && employee.documents.length > 0) {
      await Promise.all(
        employee.documents.map(docId =>
          gfs.delete(new mongoose.Types.ObjectId(docId))
            .catch(err => console.warn(`Failed to delete document ${docId}: ${err.message}`))
        )
      );
    }

    await Employee.findByIdAndDelete(req.params.id);

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
    const file = await conn.db.collection('Uploads.files').findOne({ _id: new mongoose.Types.ObjectId(req.params.fileId) });
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

// Toggle section-specific locks (Admin only)
router.patch('/:id/lock-section', auth, role(['Admin']), async (req, res) => {
  try {
    const { section } = req.body;
    const validSections = ['basicInfo', 'position', 'statutory', 'documents', 'payment'];
    if (!validSections.includes(section)) {
      return res.status(400).json({ message: 'Invalid section' });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const lockField = `${section}Locked`;
    employee[lockField] = !employee[lockField];
    const updatedEmployee = await employee.save();

    try {
      await Audit.create({
        action: 'lock_unlock_section',
        user: req.user?.id || 'unknown',
        details: `Toggled ${section} lock for employee ${employee.employeeId} to ${employee[lockField]}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.json(updatedEmployee);
  } catch (err) {
    console.error('Error toggling section lock:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;