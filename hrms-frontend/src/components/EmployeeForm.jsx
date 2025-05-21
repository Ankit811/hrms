import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import api from '../services/api';
import ContentLayout from './ContentLayout';

function EmployeeForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    employeeId: '',
    userId: '',
    name: '',
    dateOfBirth: '',
    fatherName: '',
    motherName: '',
    mobileNumber: '',
    permanentAddress: '',
    currentAddress: '',
    email: '',
    password: '',
    aadharNumber: '',
    gender: '',
    maritalStatus: '',
    spouseName: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    dateOfJoining: '',
    reportingManager: '',
    status: '',
    probationPeriod: '',
    confirmationDate: '',
    referredBy: '',
    loginType: '',
    designation: '',
    location: '',
    department: '',
    employeeType: '',
    panNumber: '',
    pfNumber: '',
    uanNumber: '',
    esiNumber: '',
    paymentType: '',
    bankName: '',
    bankBranch: '',
    accountNumber: '',
    ifscCode: '',
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
        setDepartments(deptRes.data);
        setManagers(empRes.data.filter(emp => ['HOD', 'Admin', 'CEO', 'CIO'].includes(emp.loginType)));
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
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: '' });

    if (name === 'status' && value !== 'Probation') {
      setForm(prev => ({ ...prev, probationPeriod: '', confirmationDate: '' }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    setFiles({ ...files, [name]: fileList[0] });
    setErrors({ ...errors, [name]: '' });
  };

  const validateStep = () => {
    const newErrors = {};
    if (step === 1) {
      const requiredFields = [
        'employeeId', 'userId', 'name', 'dateOfBirth', 'fatherName', 'motherName',
        'mobileNumber', 'permanentAddress', 'currentAddress', 'email', 'password', 
        'aadharNumber', 'gender', 'maritalStatus', 'emergencyContactName', 
        'emergencyContactNumber', 'dateOfJoining', 'reportingManager', 'status', 
        'loginType'
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
    } else if (step === 2) {
      const requiredFields = ['designation', 'location', 'department', 'employeeType'];
      requiredFields.forEach(field => {
        if (!form[field] || form[field].trim() === '') {
          newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
        }
      });
    } else if (step === 3) {
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
    } else if (step === 4) {
      // const requiredFiles = ['tenthTwelfthDocs', 'graduationDocs', 'panCard', 'aadharCard', 'bankPassbook', 'medicalCertificate', 'backgroundVerification'];
      // requiredFiles.forEach(field => {
      //   if (!files[field]) {
      //     newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
      //   }
      // });
      // if (files.experienceCertificate && !files.salarySlips) {
      //   newErrors.salarySlips = 'Last 3 Months Salary Slips is required';
      // }
      // Object.keys(files).forEach(field => {
      //   if (files[field] && files[field].type !== 'application/pdf') {
      //     newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} must be a PDF file`;
      //   }
      // });
      if (files.profilePicture) {
        if (files.profilePicture.type !== 'image/jpeg') {
          newErrors.profilePicture = 'Profile Picture must be a JPEG image';
        }
        if (files.profilePicture.size > 5 * 1024 * 1024) {
          newErrors.profilePicture = 'Profile Picture must be less than 5MB';
        }
      }
    } else if (step === 5) {
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
      if (form[key]) formData.append(key, form[key]);
    });
    Object.keys(files).forEach(key => {
      if (files[key]) formData.append(key, files[key]);
    });

    try {
      const response = await api.post('/employees', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.status === 201) {
        alert('Employee created successfully');
        navigate('/admin/employees');
      }
    } catch (error) {
      console.error('Error creating employee:', error.response?.data || error.message);
      setErrors({ submit: error.response?.data?.message || 'Creation failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
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
                />
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.80 }}>
              <Label htmlFor="gender">Gender</Label>
              <Select name="gender" value={form.gender} onValueChange={(value) => handleSelectChange('gender', value)} required>
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
              <Select name="maritalStatus" value={form.maritalStatus} onValueChange={(value) => handleSelectChange('maritalStatus', value)} required>
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
                />
                {errors.spouseName && <p className="mt-1 text-sm text-red-500">{errors.spouseName}</p>}
              </motion.div>
            )}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.95 }}>
              <Label htmlFor="reportingManager">Reporting Manager</Label>
              <Select name="reportingManager" value={form.reportingManager} onValueChange={(value) => handleSelectChange('reportingManager', value)} required>
                <SelectTrigger className={errors.reportingManager ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select reporting manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map(m => (
                    <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.reportingManager && <p className="mt-1 text-sm text-red-500">{errors.reportingManager}</p>}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 1.00 }}>
              <Label htmlFor="status">Status</Label>
              <Select name="status" value={form.status} onValueChange={(value) => handleSelectChange('status', value)} required>
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Probation">Probation</SelectItem>
                  <SelectItem value="Contractual">Contractual</SelectItem>
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
                  />
                  {errors.confirmationDate && <p className="mt-1 text-sm text-red-500">{errors.confirmationDate}</p>}
                </motion.div>
              </>
            )}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 1.15 }}>
              <Label htmlFor="loginType">Login Type</Label>
              <Select name="loginType" value={form.loginType} onValueChange={(value) => handleSelectChange('loginType', value)} required>
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
                />
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.10 }}>
              <Label htmlFor="department">Department</Label>
              <Select name="department" value={form.department} onValueChange={(value) => handleSelectChange('department', value)} required>
                <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && <p className="mt-1 text-sm text-red-500">{errors.department}</p>}
            </motion.div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
              <Label htmlFor="employeeType">Employee Type</Label>
              <Select name="employeeType" value={form.employeeType} onValueChange={(value) => handleSelectChange('employeeType', value)} required>
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
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'panNumber', label: 'PAN Number', type: 'text', pattern: '[A-Z0-9]{10}' },
              { id: 'pfNumber', label: 'PF Number (Optional)', type: 'text', pattern: '[0-9]{18}' },
              { id: 'uanNumber', label: 'UAN Number (Optional)', type: 'text', pattern: '[0-9]{12}' },
              { id: 'esiNumber', label: 'ESI Number (Optional)', type: 'text', pattern: '[0-9]{12}' },
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
                  required={field.id === 'panNumber'}
                />
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
          </div>
        );
      case 4:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: 'tenthTwelfthDocs', label: '10th & 12th Certificates', maxSize: '5MB' },
              { id: 'graduationDocs', label: 'Graduation Certificates', maxSize: '5MB' },
              { id: 'postgraduationDocs', label: 'Postgraduation/PhD Certificates (Optional)', maxSize: '5MB' },
              { id: 'experienceCertificate', label: 'Experience Certificate (Optional)', maxSize: '5MB' },
              { id: 'salarySlips', label: 'Last 3 Months Salary Slips', maxSize: '1MB' },
              { id: 'panCard', label: 'PAN Card', maxSize: '1MB' },
              { id: 'aadharCard', label: 'Aadhar Card', maxSize: '1MB' },
              { id: 'bankPassbook', label: 'Bank Passbook/Cancelled Cheque', maxSize: '1MB' },
              { id: 'medicalCertificate', label: 'Medical Fitness Certificate', maxSize: '2MB' },
              { id: 'backgroundVerification', label: 'Background Verification', maxSize: '2MB' },
            ].map((field, index) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={field.id === 'salarySlips' && !files.experienceCertificate ? 'hidden' : ''}
              >
                <Label htmlFor={field.id}>{field.label}</Label>
                <Input
                  id={field.id}
                  name={field.id}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className={errors[field.id] ? 'border-red-500' : ''}
                  required={field.id !== 'postgraduationDocs' && field.id !== 'experienceCertificate' && field.id !== 'salarySlips'}
                />
                {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.50 }}>
              <Label htmlFor="profilePicture">Profile Picture</Label>
              <Input
                id="profilePicture"
                name="profilePicture"
                type="file"
                accept="image/jpeg"
                onChange={handleFileChange}
                className={errors.profilePicture ? 'border-red-500' : ''}
              />
              {errors.profilePicture && <p className="mt-1 text-sm text-red-500">{errors.profilePicture}</p>}
            </motion.div>
          </div>
        );
      case 5:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select name="paymentType" value={form.paymentType} onValueChange={(value) => handleSelectChange('paymentType', value)} required>
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
                    />
                    {errors[field.id] && <p className="mt-1 text-sm text-red-500">{errors[field.id]}</p>}
                  </motion.div>
                ))}
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <ContentLayout title="Add Employee">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl mx-auto"
      >
        <Card className=" shadow-lg border">
          <CardContent className="p-6">
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
            <form onSubmit={step === 5 ? handleSubmit : handleNext}>
              {renderStep()}
              {errors.submit && (
                <p className="mt-4 text-sm text-red-500 text-center">{errors.submit}</p>
              )}
              <div className="mt-6 flex justify-between">
                {step > 1 && (
                  <Button
                    type="button"
                    onClick={handlePrevious}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Previous
                  </Button>
                )}
                <Button
                  type={step === 5 ? 'submit' : 'button'}
                  onClick={step < 5 ? handleNext : undefined}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
                >
                  {loading ? 'Submitting...' : step === 5 ? 'Submit' : 'Next'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </ContentLayout>
  );
}

export default EmployeeForm;