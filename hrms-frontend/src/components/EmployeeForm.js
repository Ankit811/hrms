import React, { useState, useEffect } from 'react';
import { TextField, Button, Select, MenuItem, FormControl, InputLabel, Box, Stack } from '@mui/material';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import ContentLayout from './ContentLayout';

function EmployeeForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    employeeId: '', userId: '', email: '', password: '', name: '',
    dateOfBirth: '', mobileNumber: '', address: '', aadharNumber: '',
    dateOfJoining: '', department: '', position: '', role: '', loginType: ''
  });
  const [departments, setDepartments] = useState([]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.name === 'profilePicture') {
      setProfilePicture(e.target.files[0]);
    } else if (e.target.name === 'documents') {
      setDocuments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all required fields
    const requiredFields = ['employeeId', 'userId', 'email', 'password', 'name', 'dateOfBirth', 'mobileNumber', 'address', 'aadharNumber', 'dateOfJoining', 'department', 'position', 'role', 'loginType'];
    for (const field of requiredFields) {
      if (!form[field] || form[field].trim() === '') {
        alert(`${field.charAt(0).toUpperCase() + field.slice(1)} is required and cannot be empty`);
        return;
      }
    }

    // Validate Aadhar Number format
    if (!/^\d{12}$/.test(form.aadharNumber)) {
      alert('Aadhar Number must be exactly 12 digits');
      return;
    }

    const formData = new FormData();
    Object.keys(form).forEach(key => {
      formData.append(key, form[key]);
    });
    if (profilePicture) formData.append('profilePicture', profilePicture);
    documents.forEach(doc => formData.append('documents', doc));

    // Log FormData entries for debugging
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value}`);
    }

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
      alert('Creation failed: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <ContentLayout title="Add Employee">
      <form onSubmit={handleSubmit}>
        <Box sx={{ width: '100%' }}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="Employee ID" name="employeeId" value={form.employeeId} onChange={handleChange} fullWidth required />
              <TextField label="User ID" name="userId" value={form.userId} onChange={handleChange} fullWidth required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Email" name="email" value={form.email} onChange={handleChange} fullWidth required />
              <TextField label="Password" name="password" value={form.password} onChange={handleChange} fullWidth margin="normal" type="password" inputProps={{ minLength: 6 }} helperText={form.password && form.password.length < 6 ? 'Password must be at least 6 characters' : ''} required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Name" name="name" value={form.name} onChange={handleChange} fullWidth required />
              <TextField label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Mobile Number" name="mobileNumber" value={form.mobileNumber} onChange={handleChange} fullWidth required />
              <TextField label="Address" name="address" value={form.address} onChange={handleChange} fullWidth required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Aadhar Number" name="aadharNumber" value={form.aadharNumber} onChange={handleChange} fullWidth required inputProps={{ pattern: '[0-9]{12}' }} />
              <TextField label="Date of Joining" name="dateOfJoining" type="date" value={form.dateOfJoining} onChange={handleChange} fullWidth required InputLabelProps={{ shrink: true }} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Department</InputLabel>
                <Select name="department" value={form.department} onChange={handleChange}>
                  {departments.map(d => <MenuItem key={d._id} value={d._id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField label="Position" name="position" value={form.position} onChange={handleChange} fullWidth required />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Role" name="role" value={form.role} onChange={handleChange} fullWidth required />
              <FormControl fullWidth required>
                <InputLabel>Login Type</InputLabel>
                <Select name="loginType" value={form.loginType} onChange={handleChange}>
                  <MenuItem value="Employee">Employee</MenuItem>
                  <MenuItem value="HOD">HOD</MenuItem>
                  <MenuItem value="Admin">Admin</MenuItem>
                  <MenuItem value="CEO">CEO</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Profile Picture"
                name="profilePicture"
                type="file"
                onChange={handleFileChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Documents"
                name="documents"
                type="file"
                inputProps={{ multiple: true }}
                onChange={handleFileChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>
            <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
              Submit
            </Button>
          </Stack>
        </Box>
      </form>
    </ContentLayout>
  );
}

export default EmployeeForm;