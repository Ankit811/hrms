import React, { useEffect, useRef, useState, useContext } from 'react';
import { Box, Typography, Menu, MenuItem } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import Notification from './Notification';
import { AuthContext } from '../context/AuthContext';
import logo from '../logo.png';
import io from 'socket.io-client'

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [anchorEl, setAnchorEl] = useState(null);

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

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        bgcolor: 'navbar.main',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={logo}
            alt="Company Logo"
            style={{
              height: '48px',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              transition: 'transform 0.2s',
              '&:hover': { transform: 'scale(1.05)' },
            }}
            onClick={handleLogoClick}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {user ? (
            <Typography
              variant="body1"
              sx={{
                mr: 2,
                fontWeight: 500,
                color: '#ffffff',
                cursor: 'pointer',
                '&:hover': { color: 'primary.main' },
              }}
              onClick={handleMenuOpen}
            >
              {user.name || 'Guest'}
            </Typography>
          ) : (
            <Typography
              variant="body1"
              sx={{
                mr: 2,
                fontWeight: 500,
                color: '#ffffff',
              }}
            >
              Guest
            </Typography>
          )}
          <Notification />
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => navigate(`/${user?.loginType.toLowerCase()}/profile`)}>
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Box>
    </Box>
  );
}

export default Navbar;