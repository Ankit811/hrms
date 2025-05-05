import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import Profile from '../components/Profile';
import LeaveForm from '../components/LeaveForm';

function Employee() {
  return (
    <div className="container">
      <Navbar />
      <Sidebar />
      <div className="content">
        <Routes>
          <Route path="profile" element={<Profile />} />
          <Route path="leave" element={<LeaveForm />} />
        </Routes>
      </div>
    </div>
  );
}

export default Employee;