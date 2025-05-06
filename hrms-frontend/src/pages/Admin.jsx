import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import EmployeeList from '../components/EmployeeList';
import EmployeeForm from '../components/EmployeeForm';
import Attendance from '../components/Attendance';
import LeaveList from '../components/LeaveList';
import Report from '../components/Report';

function Admin() {
  return (
    <div className="container">
      <Navbar />
      <Sidebar />
      <div className="content">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<EmployeeList />} />
          <Route path="add-employee" element={<EmployeeForm />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="approve-leave" element={<LeaveList />} />
          <Route path="reports" element={<Report />} />
        </Routes>
      </div>
    </div>
  );
}

export default Admin;