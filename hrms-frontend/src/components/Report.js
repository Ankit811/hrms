import React, { useState, useEffect } from 'react';
import { TextField, Button, FormControl, InputLabel, Select, MenuItem} from '@mui/material';
import api from '../services/api';
import ContentLayout from './ContentLayout';

function Report() {
  const [form, setForm] = useState({ type: 'daily', date: '', department: '' });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.get('/reports/attendance', {
        params: { type: form.type, date: form.date, department: form.department },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${form.type}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Error generating report');
    }
  };

  return (
    <ContentLayout title="Generate Report">
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Type</InputLabel>
          <Select name="type" value={form.type} onChange={handleChange}>
            <MenuItem value="daily">Daily</MenuItem>
            <MenuItem value="monthly">Monthly</MenuItem>
            <MenuItem value="department-wise">Department-wise</MenuItem>
            <MenuItem value="yearly">Yearly</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Date"
          name="date"
          type={form.type === 'monthly' ? 'month' : form.type === 'yearly' ? 'number' : 'date'}
          value={form.date}
          onChange={handleChange}
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Department</InputLabel>
          <Select name="department" value={form.department} onChange={handleChange}>
            <MenuItem value="">All</MenuItem>
            {departments.map(d => <MenuItem key={d._id} value={d._id}>{d.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button type="submit" variant="contained" color="primary">Generate PDF</Button>
      </form>
    </ContentLayout>
  );
}

export default Report;