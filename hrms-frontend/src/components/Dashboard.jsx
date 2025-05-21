import React, { useEffect, useState, useContext } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({
    confirmedEmployees: 0,
    probationEmployees: 0,
    contractualEmployees: 0,
    presentToday: 0,
    pendingLeaves: 0,
  });
  const [genderData, setGenderData] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [attendanceView, setAttendanceView] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setError('User not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);

        const attendanceQuery = attendanceView === 'monthly'
          ? `?fromDate=${startOfMonth.toISOString()}&toDate=${endOfMonth.toISOString()}`
          : `?fromDate=${startOfYear.toISOString()}&toDate=${endOfYear.toISOString()}`;

        if (user.loginType === 'Admin') {
          const [employees, attendance, leaves] = await Promise.all([
            api.get('/employees'),
            api.get(`/attendance${attendanceQuery}`),
            api.get('/leaves'),
          ]);
          console.log('Admin API responses:', {
            employees: employees.data,
            attendance: attendance.data,
            leaves: leaves.data,
          });

          const allEmployees = employees.data.map(emp => {
            if (
              emp.status === 'Probation' &&
              emp.confirmationDate &&
              new Date(emp.confirmationDate) <= new Date()
            ) {
              return { ...emp, status: 'Confirmed' };
            }
            return emp;
          });
          
          const dashboardData = {
            confirmedEmployees: allEmployees.filter(emp => emp.status === 'Confirmed').length,
            probationEmployees: allEmployees.filter(emp => emp.status === 'Probation').length,
            contractualEmployees: allEmployees.filter(emp => emp.status === 'Contractual').length,
            presentToday: attendance.data.filter(
              (a) =>
                a.status === 'Present' &&
                new Date(a.logDate).toDateString() === new Date().toDateString()
            ).length,
            pendingLeaves: leaves.data.leaves.filter((l) => l.status.admin === 'Pending').length,
          };
          setData(dashboardData);

          // Gender Data
          const genderCounts = employees.data.reduce((acc, emp) => {
            const gender = emp.gender || 'Other';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
          }, {});
          setGenderData([
            { name: 'Male', value: genderCounts.Male || 0 },
            { name: 'Female', value: genderCounts.Female || 0 },
            { name: 'Other', value: genderCounts.Other || 0 },
          ]);

          // Attendance Data
          const attendanceByDate = attendanceView === 'monthly'
            ? Array.from({ length: endOfMonth.getDate() }, (_, i) => {
                const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
                const count = attendance.data.filter(
                  (a) =>
                    a.status === 'Present' &&
                    new Date(a.logDate).toDateString() === date.toDateString()
                ).length;
                return { name: `${i + 1}`, count };
              })
            : Array.from({ length: 12 }, (_, i) => {
                const month = new Date(today.getFullYear(), i, 1);
                const count = attendance.data.filter(
                  (a) =>
                    a.status === 'Present' &&
                    new Date(a.logDate).getMonth() === i &&
                    new Date(a.logDate).getFullYear() === today.getFullYear()
                ).length;
                return { name: month.toLocaleString('default', { month: 'short' }), count };
              });
          setAttendanceData(attendanceByDate);

          // Department Data
          const departmentCounts = employees.data.reduce((acc, emp) => {
            const deptName = emp.department?.name || 'Unknown';
            acc[deptName] = (acc[deptName] || 0) + 1;
            return acc;
          }, {});
          setDepartmentData(Object.entries(departmentCounts).map(([name, count]) => ({ name, count })));
        } else if (user.loginType === 'CEO') {
          const [employees, attendance] = await Promise.all([
            api.get('/employees'),
            api.get(`/attendance${attendanceQuery}`),
          ]);
          console.log('CEO API responses:', {
            employees: employees.data,
            attendance: attendance.data,
          });

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

          // Gender Data
          const genderCounts = employees.data.reduce((acc, emp) => {
            const gender = emp.gender || 'Other';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
          }, {});
          setGenderData([
            { name: 'Male', value: genderCounts.Male || 0 },
            { name: 'Female', value: genderCounts.Female || 0 },
            { name: 'Other', value: genderCounts.Other || 0 },
          ]);

          // Attendance Data
          const attendanceByDate = attendanceView === 'monthly'
            ? Array.from({ length: endOfMonth.getDate() }, (_, i) => {
                const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
                const count = attendance.data.filter(
                  (a) =>
                    a.status === 'Present' &&
                    new Date(a.logDate).toDateString() === date.toDateString()
                ).length;
                return { name: `${i + 1}`, count };
              })
            : Array.from({ length: 12 }, (_, i) => {
                const month = new Date(today.getFullYear(), i, 1);
                const count = attendance.data.filter(
                  (a) =>
                    a.status === 'Present' &&
                    new Date(a.logDate).getMonth() === i &&
                    new Date(a.logDate).getFullYear() === today.getFullYear()
                ).length;
                return { name: month.toLocaleString('default', { month: 'short' }), count };
              });
          setAttendanceData(attendanceByDate);

          // Department Data
          const departmentCounts = employees.data.reduce((acc, emp) => {
            const deptName = emp.department?.name || 'Unknown';
            acc[deptName] = (acc[deptName] || 0) + 1;
            return acc;
          }, {});
          setDepartmentData(Object.entries(departmentCounts).map(([name, count]) => ({ name, count })));
        } else if (user.loginType === 'HOD') {
          const [attendance, leaves, departmentEmployees] = await Promise.all([
            api.get(`/attendance${attendanceQuery}`),
            api.get('/leaves'),
            api.get('/employees/department'),
          ]);
          console.log('HOD API responses:', {
            attendance: attendance.data,
            leaves: leaves.data,
            departmentEmployees: departmentEmployees.data,
          });

          const presentTodayCount = attendance.data.filter(
            (a) =>
              a.status === 'Present' &&
              departmentEmployees.data.some((e) => e.employeeId === a.employeeId) &&
              new Date(a.logDate).toDateString() === new Date().toDateString()
          ).length;

          const hodDepartmentId = departmentEmployees.data[0]?.department?._id;
          const hodPendingLeaves = leaves.data.leaves.filter(
            (l) => l.status.hod === 'Pending' && l.department?._id === hodDepartmentId
          );

          const dashboardData = {
            totalEmployees: departmentEmployees.data.length,
            presentToday: presentTodayCount,
            pendingLeaves: hodPendingLeaves.length,
          };
          setData(dashboardData);

          // Gender Data
          const genderCounts = departmentEmployees.data.reduce((acc, emp) => {
            const gender = emp.gender || 'Other';
            acc[gender] = (acc[gender] || 0) + 1;
            return acc;
          }, {});
          setGenderData([
            { name: 'Male', value: genderCounts.Male || 0 },
            { name: 'Female', value: genderCounts.Female || 0 },
            { name: 'Other', value: genderCounts.Other || 0 },
          ]);

          // Attendance Data
          const attendanceByDate = attendanceView === 'monthly'
            ? Array.from({ length: endOfMonth.getDate() }, (_, i) => {
                const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
                const count = attendance.data.filter(
                  (a) =>
                    a.status === 'Present' &&
                    departmentEmployees.data.some((e) => e.employeeId === a.employeeId) &&
                    new Date(a.logDate).toDateString() === date.toDateString()
                ).length;
                return { name: `${i + 1}`, count };
              })
            : Array.from({ length: 12 }, (_, i) => {
                const month = new Date(today.getFullYear(), i, 1);
                const count = attendance.data.filter(
                  (a) =>
                    a.status === 'Present' &&
                    departmentEmployees.data.some((e) => e.employeeId === a.employeeId) &&
                    new Date(a.logDate).getMonth() === i &&
                    new Date(a.logDate).getFullYear() === today.getFullYear()
                ).length;
                return { name: month.toLocaleString('default', { month: 'short' }), count };
              });
          setAttendanceData(attendanceByDate);

          // Department Data
          const deptName = departmentEmployees.data[0]?.department?.name || 'Department';
          setDepartmentData([{ name: deptName, count: departmentEmployees.data.length }]);
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error);
        setError('Failed to fetch dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, attendanceView]);

  if (loading) {
    return (
      <ContentLayout title="Dashboard">
        <div className="text-center py-8">Loading...</div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title="Dashboard">
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Dashboard">
      <div className="flex flex-col items-center w-full ">
        {/* First Three Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 w-full max-w-[1200px]">
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-blue-800 text-center">Confirmed</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-blue-600 text-center">{data.confirmedEmployees}</p>
            </CardContent>
          </Card>
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-purple-800 text-center">Probation</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-purple-600 text-center">{data.probationEmployees}</p>
            </CardContent>
          </Card>
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-pink-800 text-center">Contractual</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-pink-600 text-center">{data.contractualEmployees}</p>
            </CardContent>
          </Card>
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-green-800 text-center">Present Today</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-green-600 text-center">{data.presentToday}</p>
            </CardContent>
          </Card>
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-yellow-800 text-center">Pending Leaves</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-yellow-600 text-center">{data.pendingLeaves}</p>
            </CardContent>
          </Card>
        </div>

        {/* Graphs */}
        <div className="mt-8 grid grid-cols-1 gap-6 w-full max-w-[900px]">
          <Card>
            <CardHeader>
              <CardTitle>Gender Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={genderData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    fill="#8884d8"
                    label
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Attendance ({attendanceView === 'monthly' ? 'Monthly' : 'Yearly'})</CardTitle>
              <Select
                value={attendanceView}
                onValueChange={(value) => setAttendanceView(value)}
                aria-label="Select attendance view"
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Monthly" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Employees by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}

export default Dashboard;