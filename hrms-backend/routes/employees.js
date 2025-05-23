// routes/employees.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const Audit = require('../models/Audit');
const { upload, uploadToGridFS, gfsReady } = require('../middleware/fileupload');
const { getGfs, gfsReady: gridFsReady } = require('../utils/gridfs');

require('dotenv').config();

// Middleware to check gfs readiness
const ensureGfs = (req, res, next) => {
  if (!gfsReady()) {
    console.error('GridFS not initialized');
    return res.status(503).json({ message: 'GridFS not initialized. Please try again later.' });
  }
  next();
};

// Middleware to ensure MongoDB connection is open
const ensureDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    console.error('MongoDB connection is not open, state:', mongoose.connection.readyState);
    return res.status(500).json({ message: 'Database connection is not open' });
  }
  next();
};

// Middleware to check if request contains files
const checkForFiles = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.fields([
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
      { name: 'backgroundVerification', maxCount: 1 },
    ])(req, res, async (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: `Multer error: ${err.message}` });
      }
      if (err) {
        console.error('Upload error:', err);
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      // Manually upload files to GridFS
      req.uploadedFiles = {};
      try {
        if (!req.files || Object.keys(req.files).length === 0) {
          return next();
        }
        for (const field of Object.keys(req.files)) {
          req.uploadedFiles[field] = [];
          for (const file of req.files[field]) {
            if (!file.buffer || !file.originalname || !file.mimetype) {
              return res.status(400).json({ message: `Invalid file data for ${field}` });
            }
            const uploadedFile = await uploadToGridFS(file, {
              originalname: file.originalname,
              mimetype: file.mimetype,
              fieldname: file.fieldname,
              employeeId: req.body.employeeId || req.params.id || 'unknown',
            });
            if (!uploadedFile || !uploadedFile._id) {
              return res.status(500).json({ message: `GridFS upload failed for ${file.originalname}` });
            }
            req.uploadedFiles[field].push({
              id: uploadedFile._id,
              filename: uploadedFile.filename,
            });
          }
        }
        next();
      } catch (uploadErr) {
        console.error('GridFS upload error:', uploadErr);
        return res.status(500).json({ message: 'File upload to GridFS failed', error: uploadErr.message });
      }
    });
  } else {
    req.uploadedFiles = {};
    next();
  }
};

// Get document metadata for an employee
router.get('/:id/documents', auth, ensureGfs, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    const gfs = getGfs();
    if (!gfs) {
      return res.status(503).json({ message: 'GridFS not initialized' });
    }
    const documentMetadata = [];
    for (const docId of employee.documents) {
      const file = await gfs.find({ _id: new mongoose.Types.ObjectId(docId) }).toArray();
      if (file[0]) {
        documentMetadata.push({
          id: file[0]._id,
          filename: file[0].filename,
          fieldname: file[0].metadata?.fieldname || 'unknown',
        });
      }
    }
    res.json(documentMetadata);
  } catch (err) {
    console.error('Error fetching document metadata:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
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
router.post('/', auth, role(['Admin']), ensureGfs, ensureDbConnection, checkForFiles, async (req, res) => {
  try {
    console.log('Received POST request body:', req.body);
    console.log('Received files:', req.uploadedFiles);
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
        console.log(`Validation failed: ${field} is missing`);
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
    if (password && password.length < 6) {
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

    const files = req.uploadedFiles || {};
    console.log('Processed files:', files);
    if (!files.profilePicture && Object.keys(files).length === 0) {
      console.warn('No files uploaded');
    }
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
    console.log('Employee created:', newEmployee.employeeId);

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
router.put('/:id', auth, ensureGfs, ensureDbConnection, checkForFiles, async (req, res) => {
  try {
    console.log('Received PUT request body:', req.body);
    console.log('Received files:', req.uploadedFiles);
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const isAdmin = req.user.role === 'Admin';
    const isSelf = req.user.employeeId === employee.employeeId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Unauthorized to update this employee' });
    }

    const updates = req.body;
    const files = req.uploadedFiles || {};

    // Log file details for debugging
    if (files.profilePicture) {
      console.log('Profile picture details:', files.profilePicture);
      if (!files.profilePicture[0]?.id) {
        console.error('Profile picture file ID is missing');
        return res.status(500).json({ message: 'Failed to process profile picture upload' });
      }
    }

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
      console.log('Processing profile picture upload:', files.profilePicture);
      if (employee.profilePicture) {
        console.log('Deleting old profile picture:', employee.profilePicture);
        try {
          await getGfs().delete(new mongoose.Types.ObjectId(employee.profilePicture));
        } catch (err) {
          console.warn(`Failed to delete old profile picture: ${err.message}`);
        }
      }
      if (files.profilePicture[0]?.id) {
        employee.profilePicture = files.profilePicture[0].id;
      } else {
        console.error('Profile picture file ID is missing:', files.profilePicture);
        return res.status(500).json({ message: 'Failed to process profile picture upload' });
      }
    }

    const docFields = [
      'tenthTwelfthDocs', 'graduationDocs', 'postgraduationDocs', 'experienceCertificate',
      'salarySlips', 'panCard', 'aadharCard', 'bankPassbook', 'medicalCertificate',
      'backgroundVerification'
    ];
    const newDocumentIds = docFields
      .map(field => {
        if (files[field] && files[field][0]?.id) {
          return files[field][0].id;
        }
        return null;
      })
      .filter(id => id !== null);
    if (newDocumentIds.length > 0) {
      console.log('Processing new document uploads:', newDocumentIds);
      if (employee.documents.length > 0) {
        for (const docId of employee.documents) {
          console.log('Deleting old document:', docId);
          try {
            await getGfs().delete(new mongoose.Types.ObjectId(docId));
          } catch (err) {
            console.warn(`Failed to delete old document ${docId}: ${err.message}`);
          }
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
    const populatedEmployee = await Employee.findById(employee._id).populate('department reportingManager');
    console.log('Employee updated:', updatedEmployee.employeeId);

    try {
      await Audit.create({
        action: 'update_employee',
        user: req.user?.id || 'unknown',
        details: `Updated employee ${employee.employeeId}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.json(populatedEmployee);
  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete employee (Admin only)
router.delete('/:id', auth, role(['Admin']), ensureGfs, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    if (employee.profilePicture) {
      console.log('Deleting profile picture:', employee.profilePicture);
      try {
        await getGfs().delete(new mongoose.Types.ObjectId(employee.profilePicture));
      } catch (err) {
        console.warn(`Failed to delete profile picture: ${err.message}`);
      }
    }
    if (employee.documents && employee.documents.length > 0) {
      await Promise.all(
        employee.documents.map(docId => {
          console.log('Deleting document:', docId);
          try {
            return getGfs().delete(new mongoose.Types.ObjectId(docId));
          } catch (err) {
            console.warn(`Failed to delete document ${docId}: ${err.message}`);
            return null;
          }
        })
      );
    }

    await Employee.findByIdAndDelete(req.params.id);
    console.log('Employee deleted:', req.params.id);

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
router.get('/files/:fileId', auth, ensureGfs, async (req, res) => {
  try {
    const gfs = getGfs();
    let fileId;
    try {
      fileId = new mongoose.Types.ObjectId(req.params.fileId);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid file ID' });
    }

    const files = await gfs.find({ _id: fileId }).toArray();
    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    console.log('Streaming file:', fileId);
    res.set('Content-Type', files[0].contentType);
    const downloadStream = gfs.openDownloadStream(fileId);
    downloadStream.on('error', (err) => {
      console.error('Download stream error:', err);
      res.status(500).json({ message: 'Error streaming file' });
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('Error fetching file:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Lock/Unlock employee (Admin only)
router.patch('/:id/lock', auth, role(['Admin']), async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    employee.locked = !employee.locked;
    const updatedEmployee = await employee.save();
    const populatedEmployee = await Employee.findById(employee._id).populate('department reportingManager');
    console.log(`Employee ${employee.employeeId} lock toggled to: ${employee.locked}`);

    try {
      await Audit.create({
        action: 'lock_unlock_employee',
        user: req.user?.id || 'unknown',
        details: `Toggled lock for employee ${employee.employeeId} to ${employee.locked}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.json(populatedEmployee);
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
    const populatedEmployee = await Employee.findById(employee._id).populate('department reportingManager');
    console.log(`Section ${section} lock toggled for employee ${employee.employeeId} to: ${employee[lockField]}`);

    try {
      await Audit.create({
        action: 'lock_unlock_section',
        user: req.user?.id || 'unknown',
        details: `Toggled ${section} lock for employee ${employee.employeeId} to ${employee[lockField]}`
      });
    } catch (auditErr) {
      console.warn('Audit logging failed:', auditErr.message);
    }

    res.json(populatedEmployee);
  } catch (err) {
    console.error('Error toggling section lock:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;