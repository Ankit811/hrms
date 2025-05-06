import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper } from '@mui/material';
import api from '../services/api';
import ContentLayout from './ContentLayout';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await api.get('/attendance');
        console.log('Attendance data:', response.data); // Debug log
        setAttendance(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError('Failed to load attendance data');
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  if (loading) return <Typography>Loading...</Typography>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <ContentLayout title="Attendance">
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee ID</TableCell>
              <TableCell>User ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {attendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">No attendance records found</TableCell>
              </TableRow>
            ) : (
              attendance.map((a) => (
                <TableRow key={a._id}>
                  <TableCell>{a.employeeId}</TableCell>
                  <TableCell>{a.userId}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{new Date(a.logDate).toDateString()}</TableCell>
                  <TableCell>{a.logTime}</TableCell>
                  <TableCell>{a.direction}</TableCell>
                  <TableCell>{a.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </ContentLayout>
  );
}

export default Attendance;