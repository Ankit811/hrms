"use client";

import React, { useEffect, useState, useContext } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function EmployeeDashboard() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({
    attendanceData: [],
    paidLeavesRemaining: { monthly: 0, yearly: 0 },
    unpaidLeavesTaken: 0,
    leaveRecords: [],
    overtimeHours: 0,
  });
  const [attendanceView, setAttendanceView] = useState('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        let fromDate, toDate;
        if (attendanceView === 'daily') {
          fromDate = new Date(today);
          toDate = new Date(today);
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);
        } else if (attendanceView === 'monthly') {
          fromDate = startOfMonth;
          toDate = endOfMonth;
        } else {
          fromDate = startOfYear;
          toDate = endOfYear;
        }

        const res = await api.get(`/dashboard/employee-stats?attendanceView=${attendanceView}&fromDate=${fromDate.toISOString()}&toDate=${toDate.toISOString()}`);
        setData(res.data);
      } catch (err) {
        console.error('Employee dashboard fetch error:', err);
        setError(err.response?.data?.message || 'Failed to fetch dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, attendanceView]);

  if (loading) {
    return (
      <ContentLayout title="My Dashboard">
        <div className="text-center py-8">Loading...</div>
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title="My Dashboard">
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="My Dashboard">
      <div className="flex flex-col items-center w-full">
        {/* Metric Cards */}
        <div className="flex items-center justify-around gap-6 w-full">
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-blue-800 text-center">
                Paid Leaves Remaining
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 text-center">
              <p className="text-xl font-bold text-blue-600">
                Monthly: {data.paidLeavesRemaining.monthly}
              </p>
              {console.log('User:', user, 'Paid Leaves Remaining:', data.paidLeavesRemaining)}
              {user.employeeType === 'Staff' && (
                <p className="text-xl font-bold text-blue-600 mt-2">
                  Yearly: {data.paidLeavesRemaining.yearly}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-purple-800 text-center">
                Unpaid Leaves Taken (Month)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-purple-600 text-center">{data.unpaidLeavesTaken}</p>
            </CardContent>
          </Card>
          <Card className="w-48 h-48 flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="p-2">
              <CardTitle className="text-lg font-semibold text-green-800 text-center">
                Overtime (Month)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <p className="text-3xl font-bold text-green-600 text-center">
                {data.overtimeHours.toFixed(1)} hrs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Chart */}
        <div className="mt-8 grid grid-cols-1 gap-6 w-full max-w-[900px]">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Attendance ({attendanceView.charAt(0).toUpperCase() + attendanceView.slice(1)})</CardTitle>
              <Select
                value={attendanceView}
                onValueChange={(value) => setAttendanceView(value)}
                aria-label="Select attendance view"
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Daily" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leave Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>Leave Application Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="font-semibold text">Type</TableHead>
                      <TableHead className="font-semibold text">Category</TableHead>
                      <TableHead className="font-semibold text">From</TableHead>
                      <TableHead className="font-semibold text">To</TableHead>
                      <TableHead className="font-semibold text">Status (HOD)</TableHead>
                      <TableHead className="font-semibold text">Status (Admin)</TableHead>
                      <TableHead className="font-semibold text">Status (CEO)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.leaveRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text py-4">
                          No leave records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.leaveRecords.map((leave) => (
                        <TableRow key={leave._id} className="hover:bg-gray-50">
                          <TableCell className="text">
                            {leave.isCompensatory ? 'Compensatory' : leave.leaveType}
                          </TableCell>
                          <TableCell className="text">{leave.category}</TableCell>
                          <TableCell className="text">
                            {(leave.fullDay?.from || leave.halfDay?.date)
                              ? new Date(leave.fullDay?.from || leave.halfDay?.date).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text">
                            {(leave.fullDay?.to || leave.halfDay?.date)
                              ? new Date(leave.fullDay?.to || leave.halfDay?.date).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text">{leave.status.hod || 'Pending'}</TableCell>
                          <TableCell className="text">{leave.status.admin || 'Pending'}</TableCell>
                          <TableCell className="text">{leave.status.ceo || 'Pending'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentLayout>
  );
}

export default EmployeeDashboard;
