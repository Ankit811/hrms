import React, { useEffect, useState, useContext } from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({ totalEmployees: 0, presentToday: 0, pendingLeaves: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.loginType === 'Admin') {
          const [employees, attendance, leaves] = await Promise.all([
            api.get('/employees'),
            api.get('/attendance'),
            api.get('/leaves'),
          ]);
          setData({
            totalEmployees: employees.data.length,
            presentToday: attendance.data.filter(
              (a) =>
                a.status === 'Present' &&
                new Date(a.logDate).toDateString() === new Date().toDateString()
            ).length,
            pendingLeaves: leaves.data.filter((l) => l.status.admin === 'Pending').length,
          });
        } else if (user.loginType === 'CEO') {
          const [employees, attendance] = await Promise.all([
            api.get('/employees'),
            api.get('/attendance'),
          ]);
          setData({
            totalEmployees: employees.data.length,
            presentToday: attendance.data.filter(
              (a) =>
                a.status === 'Present' &&
                new Date(a.logDate).toDateString() === new Date().toDateString()
            ).length,
            pendingLeaves: 0,
          });
        } else if (user.loginType === 'HOD') {
          const [attendance, leaves, departmentEmployees] = await Promise.all([
            api.get('/attendance'),
            api.get('/leaves'),
            api.get('/employees/department'),
          ]);

          const presentTodayCount = attendance.data.filter(
            (a) =>
              a.status === 'Present' &&
              departmentEmployees.data.some((e) => e.employeeId === a.employeeId) &&
              new Date(a.logDate).toDateString() === new Date().toDateString()
          ).length;

          const hodDepartmentId = departmentEmployees.data[0]?.department?._id;
          const hodPendingLeaves = leaves.data.filter(
            (l) => l.status.hod === 'Pending' && l.department?._id === hodDepartmentId
          );

          setData({
            totalEmployees: departmentEmployees.data.length,
            presentToday: presentTodayCount,
            pendingLeaves: hodPendingLeaves.length,
          });
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      }
    };

    fetchData();
  }, [user]);

  return (
    <ContentLayout title="Dashboard">
      <Box sx={{ p: 1, transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-4px)' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary">
              Total Employees
            </Typography>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
              {data.totalEmployees}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      <Box sx={{ p: 1, transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-4px)' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary">
              Present Today
            </Typography>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
              {data.presentToday}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      <Box sx={{ p: 1, transition: 'transform 0.3s', '&:hover': { transform: 'translateY(-4px)' } }}>
        <Card>
          <CardContent>
            <Typography variant="h6" color="text.secondary">
              Pending Leaves
            </Typography>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 700 }}>
              {data.pendingLeaves}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </ContentLayout>
  );
}

export default Dashboard;