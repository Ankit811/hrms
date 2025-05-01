import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import api from '../services/api';
import ContentLayout from './ContentLayout';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/employees');
      console.log('Fetched employees:', res.data); // Debug log
      setEmployees(res.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        const response = await api.delete(`/employees/${id}`);
        setEmployees(employees.filter(e => e._id !== id));
        fetchEmployees(); // Refresh to ensure consistency
        alert(response.data.message);
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Failed to delete employee: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setOpenDialog(true);
  };

  const handleLockUnlock = async (id, locked) => {
    try {
      const response = await api.patch(`/employees/${id}/lock`);
      const updatedEmployee = response.data; // Assuming response.data contains the updated employee
      setEmployees(employees.map(emp => emp._id === id ? { ...emp, locked: updatedEmployee.locked } : emp));
      alert(`Employee ${updatedEmployee.locked ? 'locked' : 'unlocked'} successfully`);
    } catch (error) {
      console.error('Error locking/unlocking employee:', error);
      alert('Failed to lock/unlock employee: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
  };

  return (
    <ContentLayout title="Employees">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Position</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.map(employee => (
            <TableRow key={employee._id}>
              <TableCell>{employee.employeeId}</TableCell>
              <TableCell>{employee.name}</TableCell>
              <TableCell>{employee.department?.name || 'N/A'}</TableCell>
              <TableCell>{employee.position}</TableCell>
              <TableCell>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  onClick={() => handleViewDetails(employee)}
                  style={{ marginRight: 8 }}
                >
                  View Details
                </Button>
                <Button
                  variant="contained"
                  color={employee.locked ? 'success' : 'error'}
                  size="small"
                  onClick={() => handleLockUnlock(employee._id, employee.locked)}
                  style={{ marginRight: 8 }}
                >
                  {employee.locked ? 'Unlock' : 'Lock'}
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={() => handleDelete(employee._id)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Employee Details</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <div>
              <Typography><strong>Employee ID:</strong> {selectedEmployee.employeeId}</Typography>
              <Typography><strong>User ID:</strong> {selectedEmployee.userId}</Typography>
              <Typography><strong>Name:</strong> {selectedEmployee.name}</Typography>
              <Typography><strong>Date of Birth:</strong> {new Date(selectedEmployee.dateOfBirth).toDateString()}</Typography>
              <Typography><strong>Mobile Number:</strong> {selectedEmployee.mobileNumber}</Typography>
              <Typography><strong>Address:</strong> {selectedEmployee.address}</Typography>
              <Typography><strong>Aadhar Number:</strong> {selectedEmployee.aadharNumber}</Typography>
              <Typography><strong>Date of Joining:</strong> {new Date(selectedEmployee.dateOfJoining).toDateString()}</Typography>
              <Typography><strong>Department:</strong> {selectedEmployee.department?.name || 'N/A'}</Typography>
              <Typography><strong>Position:</strong> {selectedEmployee.position}</Typography>
              <Typography><strong>Role:</strong> {selectedEmployee.role}</Typography>
              <Typography><strong>Locked:</strong> {selectedEmployee.locked ? 'Yes' : 'No'}</Typography>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </ContentLayout>
  );
}

export default EmployeeList;
