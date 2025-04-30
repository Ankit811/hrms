import React, { useEffect, useState } from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, TextField, FormControl, InputLabel,
  Select, MenuItem, Grid
} from '@mui/material';
import api from '../services/api';
import ContentLayout from './ContentLayout';

function LeaveList() {
  const [leaves, setLeaves] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    leaveType: '',
    status: '',
    fromDate: '',
    toDate: ''
  });

  useEffect(() => {
    api.get('/leaves')
      .then(res => {
        setLeaves(res.data);
        setFiltered(res.data);
      })
      .catch(err => {
        console.error('Error fetching leave list:', err);
      });
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (filterSet) => {
    let data = [...leaves];

    if (filterSet.leaveType) {
      data = data.filter(leave => leave.leaveType === filterSet.leaveType);
    }

    if (filterSet.status) {
      data = data.filter(leave =>
        leave.status.hod === filterSet.status ||
        leave.status.admin === filterSet.status ||
        leave.status.ceo === filterSet.status
      );
    }

    if (filterSet.fromDate) {
      const from = new Date(filterSet.fromDate);
      data = data.filter(leave => new Date(leave.createdAt) >= from);
    }

    if (filterSet.toDate) {
      const to = new Date(filterSet.toDate);
      data = data.filter(leave => new Date(leave.createdAt) <= to);
    }

    setFiltered(data);
  };

  return (
    <ContentLayout title="Leave List">
      <Grid container spacing={2} style={{ marginBottom: '1rem' }}>
        <Grid item xs={3}>
          <FormControl fullWidth>
            <InputLabel>Leave Type</InputLabel>
            <Select name="leaveType" value={filters.leaveType} onChange={handleFilterChange}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Unpaid">Unpaid</MenuItem>
              <MenuItem value="Compensatory">Compensatory</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select name="status" value={filters.status} onChange={handleFilterChange}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={3}>
          <TextField
            name="fromDate"
            label="From Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={filters.fromDate}
            onChange={handleFilterChange}
          />
        </Grid>
        <Grid item xs={3}>
          <TextField
            name="toDate"
            label="To Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={filters.toDate}
            onChange={handleFilterChange}
          />
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Status (HOD)</TableCell>
              <TableCell>Status (Admin)</TableCell>
              <TableCell>Status (CEO)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((leave, index) => (
              <TableRow key={index}>
                <TableCell>{leave.name}</TableCell>
                <TableCell>{leave.leaveType}</TableCell>
                <TableCell>{leave.fullDay?.from?.split('T')[0]}</TableCell>
                <TableCell>{leave.fullDay?.to?.split('T')[0]}</TableCell>
                <TableCell>{leave.status.hod}</TableCell>
                <TableCell>{leave.status.admin}</TableCell>
                <TableCell>{leave.status.ceo}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {filtered.length === 0 && (
        <Typography variant="body2" align="center" style={{ marginTop: 16 }}>
          No leave records found.
        </Typography>
      )}
    </ContentLayout>
  );
}

export default LeaveList;
