import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Dashboard from '../components/Dashboard';
import Profile from '../components/Profile';
import LeaveForm from '../components/LeaveForm';
import LeaveList from '../components/LeaveList';

function HOD() {
  return (
    <div className="container">
      <Navbar />
      <Sidebar />
      <div className="content">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="leave" element={<LeaveForm />} />
          <Route path="approve-leave" element={<LeaveList />} />
        </Routes>
      </div>
    </div>
  );
}

export default HOD;