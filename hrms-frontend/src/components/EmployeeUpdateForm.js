import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button-old';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent } from '../components/ui/dialog';
import api from '../services/api';

function EmployeeUpdateForm({ employee, onClose, onUpdate, isAdmin }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    employeeId: employee.employeeId || '',
    userId: employee.userId || '',
    name: employee.name || '',
    dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
    fatherName: employee.fatherName || '',
    motherName: employee.motherName || '',
    mobileNumber: employee.mobileNumber || '',
    permanentAddress: employee.permanentAddress || '',
    currentAddress: employee.currentAddress || '',
    email: employee.email || '',
    password: '',
    aadharNumber: employee.aadharNumber || '',
    gender: employee.gender || '',
    maritalStatus: employee.maritalStatus || '',
    spouseName: employee.spouseName || '',
    emergencyContactName: employee.emergencyContactName || '',
    emergencyContactNumber: employee.emergencyContactNumber || '',
    dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '',
    reportingManager: employee.reportingManager?._id || null, // Use null instead of ''
    status: employee.status || '',
    probationPeriod: employee.probationPeriod || '',
    confirmationDate: employee.confirmationDate ? new Date(employee.confirmationDate).toISOString().split('T')[0] : '',
    referredBy: employee.referredBy || '',
    loginType: employee.loginType || '',
    designation: employee.designation || '',
    location: employee.location || '',
    department: employee.department?._id || null, // Use null instead of ''
    employeeType: employee.employeeType || '',
    panNumber: employee.panNumber || '',
    pfNumber: employee.pfNumber || '',
    uanNumber: employee.uanNumber || '',
    esiNumber: employee.esiNumber || '',
    paymentType: employee.paymentType || '',
    bankName: employee.bankDetails?.bankName || '',
    bankBranch: employee.bankDetails?.bankBranch || '',
    accountNumber: employee.bankDetails?.accountNumber || '',
    ifscCode: employee.bankDetails?.ifscCode || '',
  });
  const [files, setFiles] = useState({
    profilePicture: null,
    tenthTwelfthDocs: null,
    graduationDocs: null,
    postgraduationDocs: null,
    experienceCertificate: null,
    salarySlips: null,
    panCard: null,
    aadharCard: null,
    bankPassbook: null,
    medicalCertificate: null,
    backgroundVerification: null,
  });
  const [departments, setDepartments] = useState([]);
  const [managers, setManagers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, empRes] = await Promise.all([
          api.get('/departments'),
          api.get('/employees')
        ]);
        // Filter out departments with empty _id
        setDepartments(deptRes.data.filter(dept => dept._id && dept._id.trim() !== ''));
        // Filter out managers with empty _id and valid loginType
        setManagers(
          empRes.data
            .filter(emp => ['HOD', 'Admin', 'CEO'].includes(emp.loginType) && emp._id && emp._id.trim() !== '')
        );
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: '' });

    if (name === 'dateOfJoining' || name === 'probationPeriod') {
      const dateOfJoining = name === 'dateOfJoining' ? value : form.dateOfJoining;
      const probationPeriod = name === 'probationPeriod' ? value : form.probationPeriod;
      if (dateOfJoining && probationPeriod) {
        const joiningDate = new Date(dateOfJoining);
        const confirmationDate = new Date(joiningDate.setMonth(joiningDate.getMonth() + parseInt(probationPeriod)));
        setForm(prev => ({ ...prev, confirmationDate: confirmationDate.toISOString().split('T')[0] }));
      }
    }
  };

  const handleSelectChange = (name, value) => {
    setForm({ ...form, [name]: value === '' ? null : value }); // Convert empty string to null
    setErrors({ ...errors, [name]: '' });

    if (name === 'status' && value !== 'Probation') {
      setForm(prev => ({ ...prev, probationPeriod: '', confirmationDate: '' }));
    }
    if (name === 'paymentType' && value !== 'Bank Transfer') {
      setForm(prev => ({ ...prev, bankName: '', bankBranch: '', accountNumber: '', ifscCode: '' }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles({ ...files, [name]: fileList[0] });
    setErrors({ ...errors, [name]: '' });
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 1 && (isAdmin || !employee.basicInfoLocked)) {
      const requiredFields = [
        'employeeId', 'userId', 'name', 'dateOfBirth', 'fatherName', 'motherName',
        'mobileNumber', 'permanentAddress', 'currentAddress', 'email', 'aadharNumber',
        'gender', 'maritalStatus', 'emergencyContactName', 'emergencyContactNumber',
        'dateOfJoining', 'reportingManager', 'status', 'loginType'
      ];
      requiredFields.forEach(field => {
        if (!form[field] || form[field].trim() === '') {
          newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
        }
      });
      if (form.maritalStatus === 'Married' && (!form.spouseName || form.spouseName.trim() === '')) {
        newErrors.spouseName = 'Spouse Name is required';
      }
      if (form.status === 'Probation' && (!form.probationPeriod || !form.confirmationDate)) {
        newErrors.probationPeriod = 'Probation Period is required';
        newErrors.confirmationDate = 'Confirmation Date is required';
      }
      if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
        newErrors.email = 'Valid email is required';
      }
      if (form.password && form.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
      if (form.aadharNumber && !/^\d{12}$/.test(form.aadharNumber)) {
        newErrors.aadharNumber = 'Aadhar Number must be exactly 12 digits';
      }
      if (form.mobileNumber && !/^\d{10}$/.test(form.mobileNumber)) {
        newErrors.mobileNumber = 'Mobile Number must be exactly 10 digits';
      }
    } else if (step === 2 && (isAdmin || !employee.positionLocked)) {
      const requiredFields = ['designation', 'location', 'department', 'employeeType'];
      requiredFields.forEach(field => {
        if (!form[field] || form[field].trim() === '') {
          newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
        }
      });
    } else if (step === 3 && (isAdmin || !employee.statutoryLocked)) {
      if (!form.panNumber || form.panNumber.trim() === '') {
        newErrors.panNumber = 'PAN Number is required';
      } else if (!/^[A-Z0-9]{10}$/.test(form.panNumber)) {
        newErrors.panNumber = 'PAN Number must be 10 alphanumeric characters';
      }
      if (form.pfNumber && !/^\d{18}$/.test(form.pfNumber)) {
        newErrors.pfNumber = 'PF Number must be 18 digits';
      }
      if (form.uanNumber && !/^\d{12}$/.test(form.uanNumber)) {
        newErrors.uanNumber = 'UAN Number must be 12 digits';
      }
      if (form.esiNumber && !/^\d{12}$/.test(form.esiNumber)) {
        newErrors.esiNumber = 'ESI Number must be 12 digits';
      }
    } else if (step === 4 && (isAdmin || !employee.documentsLocked)) {
      // Optional: Add validation for new file uploads if required
    } else if (step === 5 && (isAdmin || !employee.paymentLocked)) {
      if (!form.paymentType) {
        newErrors.paymentType = 'Payment Type is required';
      }
      if (form.paymentType === 'Bank Transfer') {
        const bankFields = ['bankName', 'bankBranch', 'accountNumber', 'ifscCode'];
        bankFields.forEach(field => {
          if (!form[field] || form[field].trim() === '') {
            newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
          }
        });
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);

    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if (form[key] && form[key] !== null && (isAdmin || !employee[`${stepToSection(step)}Locked`])) {
        formData.append(key, form[key]);
      }
    });
    Object.keys(files).forEach(key => {
      if (files[key] && (isAdmin || !employee.documentsLocked)) {
        formData.append(key, files[key]);
      }
    });

    try {
      const response = await api.put(`/employees/${employee._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUpdate(response.data);
      alert('Employee updated successfully');
    } catch (error) {
      console.error('Error updating employee:', error.response?.data || error.message);
      setErrors({ submit: error.response?.data?.message || 'Update failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const stepToSection = (step) => {
    switch (step) {
      case 1: return 'basicInfo';
      case 2: return 'position';
      case 3: return 'statutory';
      case 4: return 'documents';
      case 5: return 'payment';
      default: return '';
    }
  };

  const renderStep = () => {
    const isEditable = isAdmin || !employee[`${stepToSection(step)}Locked`];
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'employeeId', label: 'Employee No.', type: 'text' },
              { id: 'userId', label: 'User ID', type: 'text' },
              { id: 'name', label: 'Name', type: 'text' },
              { id: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
              { id: 'fatherName', label: 'Father Name', type: 'text' },
              { id: 'motherName', label: 'Mother Name', type: 'text' },
              { id: 'mobileNumber', label: 'Mobile Number', type: 'tel', pattern: '[0-9]{10}' },
              { id: 'permanentAddress', label: 'Permanent Address', type: 'text' },
              { id: 'currentAddress', label: 'Current Address', type: 'text' },
              { id: 'email', label: 'Email', type: 'email' },
              { id: 'password', label: 'Password', type: 'password', minLength: 6 },
              { id: 'aadharNumber', label: 'Aadhar Number', type: 'text', pattern: '[0-9]{12}' },
              { id: 'emergencyContactName', label: 'Emergency Contact Name', type: 'text' },
              { id: 'emergencyContactNumber', label: 'Emergency Contact Number', type: 'tel' },
              { id: 'dateOfJoining', label: 'Date of Joining', type: 'date' },
              { id: 'referredBy', label: 'Referred By', type: 'text' },
            ].map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  value={form[field.id]}
                  onChange={handleChange}
                  className={errors[field.id] ? 'border-red-500' : ''}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  minLength={field.minLength}
                  pattern={field.pattern}
                  required
                  disabled={!isEditable}
                />
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.80 }}>
              <Label htmlFor="gender">Gender</Label>
              <Select name="gender" value={form.gender} onValueChange={(value) => handleSelectChange('gender', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.gender ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="mt-1 text-sm text-red-500">{errors.gender}</p>}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.85 }}>
              <Label htmlFor="maritalStatus">Marital Status</Label>
              <Select name="maritalStatus" value={form.maritalStatus} onValueChange={(value) => handleSelectChange('maritalStatus', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.maritalStatus ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                </SelectContent>
              </Select>
              {errors.maritalStatus && <p className="mt-1 text-sm text-red-500">{errors.maritalStatus}</p>}
            </motion.div>
            {form.maritalStatus === 'Married' && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.90 }}>
                <Label htmlFor="spouseName">Spouse Name</Label>
                <Input
                  id="spouseName"
                  name="spouseName"
                  type="text"
                  value={form.spouseName}
                  onChange={handleChange}
                  className={errors.spouseName ? 'border-red-500' : ''}
                  placeholder="Enter spouse name"
                  required
                  disabled={!isEditable}
                />
                {errors.spouseName && <p className="mt-1 text-sm text-red-500">{errors.spouseName}</p>}
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.95 }}>
              <Label htmlFor="reportingManager">Reporting Manager</Label>
              <Select name="reportingManager" value={form.reportingManager || ''} onValueChange={(value) => handleSelectChange('reportingManager', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.reportingManager ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select reporting manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map(m => (
                    m._id && <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reportingManager && <p className="mt-1 text-sm text-red-500">{errors.reportingManager}</p>}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 1.00 }}>
              <Label htmlFor="status">Status</Label>
              <Select name="status" value={form.status} onValueChange={(value) => handleSelectChange('status', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Probation">Probation</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
            </motion.div>
            {form.status === 'Probation' && (
              <>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 1.05 }}>
                  <Label htmlFor="probationPeriod">Probation Period (Months)</Label>
                  <Input
                    id="probationPeriod"
                    name="probationPeriod"
                    type="number"
                    value={form.probationPeriod}
                    onChange={handleChange}
                    className={errors.probationPeriod ? 'border-red-500' : ''}
                    placeholder="Enter probation period"
                    required
                    disabled={!isEditable}
                  />
                  {errors.probationPeriod && <p className="mt-1 text-sm text-red-500">{errors.probationPeriod}</p>}
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 1.10 }}>
                  <Label htmlFor="confirmationDate">Confirmation Date</Label>
                  <Input
                    id="confirmationDate"
                    name="confirmationDate"
                    type="date"
                    value={form.confirmationDate}
                    onChange={handleChange}
                    className={errors.confirmationDate ? 'border-red-500' : ''}
                    required
                    disabled={!isEditable}
                  />
                  {errors.confirmationDate && <p className="mt-1 text-sm text-red-500">{errors.confirmationDate}</p>}
                </motion.div>
              </>
            )}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 1.15 }}>
              <Label htmlFor="loginType">Login Type</Label>
              <Select name="loginType" value={form.loginType} onValueChange={(value) => handleSelectChange('loginType', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.loginType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select login type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Employee">Employee</SelectItem>
                  <SelectItem value="HOD">HOD</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="CEO">CEO</SelectItem>
                </SelectContent>
              </Select>
              {errors.loginType && <p className="mt-1 text-sm text-red-500">{errors.loginType}</p>}
            </motion.div>
            {!isEditable && (
              <motion.div
                className="col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 1.20 }}
              >
                <p className="text-red-500">This section is locked. Contact an admin to unlock.</p>
              </motion.div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'designation', label: 'Designation', type: 'text' },
              { id: 'location', label: 'Location', type: 'text' },
            ].map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  value={form[field.id]}
                  onChange={handleChange}
                  className={errors[field.id] ? 'border-red-500' : ''}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  required
                  disabled={!isEditable}
                />
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.10 }}>
              <Label htmlFor="department">Department</Label>
              <Select name="department" value={form.department || ''} onValueChange={(value) => handleSelectChange('department', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    dept._id && <SelectItem key={dept._id} value={dept._id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && <p className="mt-1 text-sm text-red-500">{errors.department}</p>}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
              <Label htmlFor="employeeType">Employee Type</Label>
              <Select name="employeeType" value={form.employeeType} onValueChange={(value) => handleSelectChange('employeeType', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.employeeType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select employee type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              {errors.employeeType && <p className="mt-1 text-sm text-red-500">{errors.employeeType}</p>}
            </motion.div>
            {!isEditable && (
              <motion.div
                className="col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.20 }}
              >
                <p className="text-red-500">This section is locked. Contact an admin to unlock.</p>
              </motion.div>
            )}
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'panNumber', label: 'PAN Number', type: 'text', pattern: '[A-Z0-9]{10}' },
              { id: 'pfNumber', label: 'PF Number', type: 'text', pattern: '[0-9]{18}', required: false },
              { id: 'uanNumber', label: 'UAN Number', type: 'text', pattern: '[0-9]{12}', required: false },
              { id: 'esiNumber', label: 'ESI Number', type: 'text', pattern: '[0-9]{12}', required: false },
            ].map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  value={form[field.id]}
                  onChange={handleChange}
                  className={errors[field.id] ? 'border-red-500' : ''}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  pattern={field.pattern}
                  required={field.required !== false}
                  disabled={!isEditable}
                />
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
            {!isEditable && (
              <motion.div
                className="col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.20 }}
              >
                <p className="text-red-500">This section is locked. Contact an admin to unlock.</p>
              </motion.div>
            )}
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'profilePicture', label: 'Profile Picture' },
              { id: 'tenthTwelfthDocs', label: '10th & 12th Certificates' },
              { id: 'graduationDocs', label: 'Graduation Certificates' },
              { id: 'postgraduationDocs', label: 'Postgraduation/PhD Certificates' },
              { id: 'experienceCertificate', label: 'Experience Certificate' },
              { id: 'salarySlips', label: 'Last 3 Months Salary Slips' },
              { id: 'panCard', label: 'PAN Card' },
              { id: 'aadharCard', label: 'Aadhar Card' },
              { id: 'bankPassbook', label: 'Bank Passbook/Cancelled Cheque' },
              { id: 'medicalCertificate', label: 'Medical Fitness Certificate' },
              { id: 'backgroundVerification', label: 'Background Verification' },
            ].map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  name={field.id}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className={errors[field.id] ? 'border-red-500' : ''}
                  disabled={!isEditable}
                />
                {employee[field.id] && (
                  <a
                    href={`/api/employees/files/${employee[field.id]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View Current {field.label}
                  </a>
                )}
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
            {!isEditable && (
              <motion.div
                className="col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.55 }}
              >
                <p className="text-red-500">This section is locked. Contact an admin to unlock.</p>
              </motion.div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select name="paymentType" value={form.paymentType} onValueChange={(value) => handleSelectChange('paymentType', value)} required disabled={!isEditable}>
                <SelectTrigger className={errors.paymentType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentType && <p className="mt-1 text-sm text-red-500">{errors.paymentType}</p>}
            </motion.div>
            {form.paymentType === 'Bank Transfer' && (
              <>
                {[
                  { id: 'bankName', label: 'Bank Name', type: 'text' },
                  { id: 'bankBranch', label: 'Bank Branch', type: 'text' },
                  { id: 'accountNumber', label: 'Account Number', type: 'text' },
                  { id: 'ifscCode', label: 'IFSC Code', type: 'text' },
                ].map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: (index + 1) * 0.05 }}
                  >
                    <Label htmlFor={field.id}>{field.label}</Label>
                    <Input
                      id={field.id}
                      name={field.id}
                      type={field.type}
                      value={form[field.id]}
                      onChange={handleChange}
                      className={errors[field.id] ? 'border-red-500' : ''}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      required
                      disabled={!isEditable}
                    />
                    {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
                  </motion.div>
                ))}
              </>
            )}
            {!isEditable && (
              <motion.div
                className="col-span-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.30 }}
              >
                <p className="text-red-500">This section is locked. Contact an admin to unlock.</p>
              </motion.div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white shadow-lg border-none">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold">
                    {step === 1 && 'Basic Information'}
                    {step === 2 && 'Employee Position'}
                    {step === 3 && 'Statutory Information'}
                    {step === 4 && 'Document Upload'}
                    {step === 5 && 'Payment Information'}
                  </h2>
                  <div className="flex justify-between mt-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <div key={s} className={`h-2 w-1/5 rounded ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
                {renderStep()}
                {errors.submit && <p className="mt-4 text-red-500">{errors.submit}</p>}
                <div className="mt-6 flex justify-between">
                  {step > 1 && (
                    <Button
                      type="button"
                      onClick={handlePrevious}
                      className="bg-gray-600 hover:bg-gray-700 text-white"
                      disabled={loading}
                    >
                      Previous
                    </Button>
                  )}
                  <div className="flex gap-2">
                    {step < 5 ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={loading}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={loading}
                      >
                        {loading ? 'Updating...' : 'Update'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={onClose}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

export default EmployeeUpdateForm;