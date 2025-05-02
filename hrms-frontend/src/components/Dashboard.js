import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({ totalEmployees: 0, presentToday: 0, pendingLeaves: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user.loginType === 'Admin') {
          const [employees, attendance, leaves] = await Promise.all([
            api.get('/employees'),
            api.get('/attendance'),
            api.get('/leaves'),
          ]);
          const dashboardData = {
            totalEmployees: employees.data.length,
            presentToday: attendance.data.filter(
              (a) =>
                a.status === 'Present' &&
                new Date(a.logDate).toDateString() === new Date().toDateString()
            ).length,
            pendingLeaves: leaves.data.filter((l) => l.status.admin === 'Pending').length,
          };
          setData(dashboardData);
          setChartData([
            { name: 'Employees', value: dashboardData.totalEmployees },
            { name: 'Present', value: dashboardData.presentToday },
            { name: 'Pending Leaves', value: dashboardData.pendingLeaves },
          ]);
        } else if (user.loginType === 'CEO') {
          const [employees, attendance] = await Promise.all([
            api.get('/employees'),
            api.get('/attendance'),
          ]);
          const dashboardData = {
            totalEmployees: employees.data.length,
            presentToday: attendance.data.filter(
              (a) =>
                a.status === 'Present' &&
                new Date(a.logDate).toDateString() === new Date().toDateString()
            ).length,
            pendingLeaves: 0,
          };
          setData(dashboardData);
          setChartData([
            { name: 'Employees', value: dashboardData.totalEmployees },
            { name: 'Present', value: dashboardData.presentToday },
          ]);
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

          const dashboardData = {
            totalEmployees: departmentEmployees.data.length,
            presentToday: presentTodayCount,
            pendingLeaves: hodPendingLeaves.length,
          };
          setData(dashboardData);
          setChartData([
            { name: 'Employees', value: dashboardData.totalEmployees },
            { name: 'Present', value: dashboardData.presentToday },
            { name: 'Pending Leaves', value: dashboardData.pendingLeaves },
          ]);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
      }
    };

    fetchData();
  }, [user]);

  return (
    <ContentLayout title="Dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-800">Total Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{data.totalEmployees}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-green-800">Present Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{data.presentToday}</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-yellow-800">Pending Leaves</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{data.pendingLeaves}</p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#1976d2" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
    </ContentLayout>
  );
}

export default Dashboard;