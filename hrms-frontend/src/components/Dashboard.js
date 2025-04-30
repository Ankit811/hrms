import React, { useEffect, useState, useContext } from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({ totalEmployees: 0, presentToday: 0, pendingLeaves: 0 });

  useEffect(() => {
    const fetchData = async () => {
      if (user.loginType === 'Admin') {
        const [employees, attendance, leaves] = await Promise.all([
          api.get('/employees'),
          api.get('/attendance'),
          api.get('/leaves'),
        ]);
        setData({
          totalEmployees: employees.data.length,
          presentToday: attendance.data.filter(a => a.status === 'Present' && new Date(a.logDate).toDateString() === new Date().toDateString()).length,
          pendingLeaves: leaves.data.filter(l => l.status.admin === 'Pending').length,
        });
      } else if (user.loginType === 'CEO') {
        const [employees, attendance] = await Promise.all([
          api.get('/employees'),
          api.get('/attendance'),
        ]);
        setData({
          totalEmployees: employees.data.length,
          presentToday: attendance.data.filter(a => a.status === 'Present' && new Date(a.logDate).toDateString() === new Date().toDateString()).length,
          pendingLeaves: 0,
        });
      } else if (user.loginType === 'HOD') {
        const [attendance, leaves] = await Promise.all([
          api.get('/attendance'),
          api.get('/leaves'),
        ]);
        setData({
          totalEmployees: 0,
          presentToday: attendance.data.filter(a => a.status === 'Present' && new Date(a.logDate).toDateString() === new Date().toDateString()).length,
          pendingLeaves: leaves.data.filter(l => l.status.hod === 'Pending').length,
        });
      }
    };
    fetchData();
  }, [user]);

  return (
    <ContentLayout title="Dashboard">
      <Card>
        <CardContent>
          <Typography variant="h6">Total Employees</Typography>
          <Typography variant="h4">{data.totalEmployees}</Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Present Today</Typography>
          <Typography variant="h4">{data.presentToday}</Typography>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Typography variant="h6">Pending Leaves</Typography>
          <Typography variant="h4">{data.pendingLeaves}</Typography>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default Dashboard;