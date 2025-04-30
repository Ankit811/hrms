import React, { useContext, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Notification from './Notification';
import { AuthContext } from '../context/AuthContext';
import logo from '../logo.png';
import io from 'socket.io-client';

function Navbar() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const socketRef = useRef(null);

  // Navigate to default page based on user type
  const handleLogoClick = () => {
    if (!user) return;
    const defaultPaths = {
      Admin: '/admin/dashboard',
      CEO: '/ceo/dashboard',
      HOD: '/hod/dashboard',
      Employee: '/employee/profile',
    };
    navigate(defaultPaths[user.loginType] || '/');
  };

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io('http://localhost:5000', { withCredentials: true });
    }

    const socket = socketRef.current;

    if (user?.employeeId) {
      socket.emit('join', user.employeeId);
    }

    socket.on('notification', (data) => {
      alert('🔔 New Notification: ' + data.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  return (
    <Box className="navbar">
      <Box className="navbar-content">
        <img
          src={logo}
          alt="Company Logo"
          className="navbar-logo"
          onClick={handleLogoClick}
          style={{ cursor: 'pointer' }}
        />
        <Box className="navbar-right">
          <Box className="notification-bell">
            <Notification />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default Navbar;