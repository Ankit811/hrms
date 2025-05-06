import React, { useEffect, useRef, useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import Notification from './Notification';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/logo1.png';
import io from 'socket.io-client';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const socketRef = useRef(null);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 120 }}
      className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg z-50"
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        <motion.img
          src={logo}
          alt="Company Logo"
          className="h-12 cursor-pointer"
          whileHover={{ scale: 1.05 }}
          onClick={handleLogoClick}
        />
        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="text-white font-medium cursor-pointer"
                >
                  {user.name || 'Guest'}
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white rounded-lg shadow-xl">
                <DropdownMenuItem
                  className="hover:bg-blue-100"
                  onClick={() => navigate(`/${user?.loginType.toLowerCase()}/profile`)}
                >
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="hover:bg-blue-100" onClick={handleLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="text-white font-medium">Guest</span>
          )}
          <Notification />
        </div>
      </div>
    </motion.header>
  );
}

export default Navbar;