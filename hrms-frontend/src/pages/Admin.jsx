import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import Profile from '../components/Profile'
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';
import Attendance from '../components/Attendance';
import LeaveForm from '../components/LeaveForm';
import LeaveList from '../components/LeaveList';
import MyDashboard from '../components/EmployeeDashboard'
import ApproveOT from '../components/OTApproval'

function Admin() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 pt-16">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employee-dashboard" element={<MyDashboard/>} />
          <Route path="profile" element = { <Profile />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="add-employee" element={<EmployeeForm />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leave" element={<LeaveForm />} />
          <Route path="approve-leave" element={<LeaveList />} />
          <Route path="approve-ot" element={<ApproveOT />} />
        </Routes>
      </div>
    </div>
  );
}

export default Admin;