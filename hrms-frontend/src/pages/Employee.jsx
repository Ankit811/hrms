import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Profile from '../components/Profile';
import LeaveForm from '../components/LeaveForm';

function Employee() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1 pt-16">
        <Routes>
          <Route path="profile" element={<Profile />} />
          <Route path="leave" element={<LeaveForm />} />
        </Routes>
      </div>
    </div>
  );
}

export default Employee;