import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import LeaveList from '../components/LeaveList';
import EmployeeList from '../components/EmployeeList';

function CEO() {
  return (
    <div className="container">
      <Navbar />
      <Sidebar />
      <div className="content">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="approve-leaves" element={<LeaveList />} />
          <Route path="admin-employees" element={<EmployeeList />} />
        </Routes>
      </div>
    </div>
  );
}

export default CEO;