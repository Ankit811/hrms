import React, { useEffect, useState, useContext } from 'react';
import {
  Card, CardContent, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, FormControl,
  InputLabel, Select, MenuItem, Grid, Button
} from '@mui/material';
import api from '../services/api';
import ContentLayout from './ContentLayout';
import { AuthContext } from '../context/AuthContext';

function LeaveList() {
  const { user } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    leaveType: '',
    status: '',
    fromDate: '',
    toDate: '',
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
      data = data.filter(leave => {
        const leaveFrom = new Date(leave.fullDay?.from || leave.halfDay?.date || leave.createdAt);
        return leaveFrom >= from;
      });
    }

    if (filterSet.toDate) {
      const to = new Date(filterSet.toDate);
      data = data.filter(leave => {
        const leaveTo = new Date(leave.fullDay?.to || leave.halfDay?.date || leave.createdAt);
        return leaveTo <= to;
      });
    }

    setFiltered(data);
  };

  const handleApproval = async (id, status, currentStage) => {
    try {
      let nextStage = '';
      if (currentStage === 'hod') nextStage = 'admin';
      else if (currentStage === 'admin') nextStage = 'ceo';

      const leaveData = { status, nextStage };
      await api.put(`/leaves/${id}/approve`, leaveData);
      setLeaves(prev => prev.map(l => l._id === id ? { ...l, status: { ...l.status, [currentStage]: status, [nextStage]: 'Pending' } } : l));
      setFiltered(prev => prev.map(l => l._id === id ? { ...l, status: { ...l.status, [currentStage]: status, [nextStage]: 'Pending' } } : l));
      alert(`Leave ${status.toLowerCase()} successfully.`);
    } catch (err) {
      console.error('Approval error:', err);
      alert('Error processing leave approval.');
    }
  };

  return (
    <ContentLayout title="Leave List">
      <Card sx={{ boxShadow: 3, borderRadius: '12px', p: { xs: 2, md: 3 }, bgcolor: 'background.paper' }}>
        <CardContent>
          <Grid container spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Leave Type</InputLabel>
                <Select
                  name="leaveType"
                  value={filters.leaveType}
                  onChange={handleFilterChange}
                  label="Leave Type"
                  sx={{ bgcolor: 'background.default' }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Paid">Paid</MenuItem>
                  <MenuItem value="Unpaid">Unpaid</MenuItem>
                  <MenuItem value="Compensatory">Compensatory</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  label="Status"
                  sx={{ bgcolor: 'background.default' }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Pending">Pending</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                name="fromDate"
                label="From Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.fromDate}
                onChange={handleFilterChange}
                variant="outlined"
                sx={{ bgcolor: 'background.default' }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                name="toDate"
                label="To Date"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={filters.toDate}
                onChange={handleFilterChange}
                variant="outlined"
                sx={{ bgcolor: 'background.default' }}
              />
            </Grid>
          </Grid>

          <Table sx={{ minWidth: 650, bgcolor: 'background.paper' }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>From</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>To</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Status (HOD)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Status (Admin)</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Status (CEO)</TableCell>
                {['HOD', 'Admin', 'CEO'].includes(user?.loginType) && (
                  <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Action</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={['HOD', 'Admin', 'CEO'].includes(user?.loginType) ? 8 : 7} sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                    No leave records found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((leave) => (
                  <TableRow key={leave._id} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                    <TableCell sx={{ color: 'text.primary' }}>{leave.name}</TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>{leave.leaveType}</TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>
                      {new Date(leave.fullDay?.from || leave.halfDay?.date || leave.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>
                      {new Date(leave.fullDay?.to || leave.halfDay?.date || leave.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>{leave.status.hod || 'Pending'}</TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>{leave.status.admin || 'Pending'}</TableCell>
                    <TableCell sx={{ color: 'text.primary' }}>{leave.status.ceo || 'Pending'}</TableCell>
                    {['HOD', 'Admin', 'CEO'].includes(user?.loginType) && (
                      <TableCell>
                        {user.loginType === 'HOD' && leave.status.hod === 'Pending' && (
                          <>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              onClick={() => handleApproval(leave._id, 'Approved', 'hod')}
                              disabled={leave.status.hod !== 'Pending'}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              sx={{ mb: 1 }}
                              onClick={() => handleApproval(leave._id, 'Rejected', 'hod')}
                              disabled={leave.status.hod !== 'Pending'}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {user.loginType === 'Admin' && leave.status.hod === 'Approved' && leave.status.admin === 'Pending' && (
                          <>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              onClick={() => handleApproval(leave._id, 'Approved', 'admin')}
                              disabled={leave.status.admin !== 'Pending'}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              sx={{ mb: 1 }}
                              onClick={() => handleApproval(leave._id, 'Rejected', 'admin')}
                              disabled={leave.status.admin !== 'Pending'}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {user.loginType === 'CEO' && leave.status.admin === 'Approved' && leave.status.ceo === 'Pending' && (
                          <>
                            <Button
                              variant="contained"
                              color="success"
                              size="small"
                              sx={{ mr: 1, mb: 1 }}
                              onClick={() => handleApproval(leave._id, 'Approved', 'ceo')}
                              disabled={leave.status.ceo !== 'Pending'}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              sx={{ mb: 1 }}
                              onClick={() => handleApproval(leave._id, 'Rejected', 'ceo')}
                              disabled={leave.status.ceo !== 'Pending'}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default LeaveList;