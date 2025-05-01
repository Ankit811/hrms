import React, { useContext, useState } from 'react';
import { List, ListItem, ListItemIcon, ListItemText, Divider, IconButton, Box } from '@mui/material';
import { Dashboard, People, Assignment, Event, Report, ExitToApp, Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = {
    Admin: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/admin/dashboard' },
      { text: 'Employees', icon: <People />, path: '/admin/employees' },
      { text: 'Add Employee', icon: <Assignment />, path: '/admin/add-employee' },
      { text: 'Attendance', icon: <Event />, path: '/admin/attendance' },
      { text: 'Approve Leave', icon: <Assignment />, path: '/admin/approve-leave' },
      { text: 'Reports', icon: <Report />, path: '/admin/reports' },
    ],
    CEO: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/ceo/dashboard' },
      { text: 'Approve Leaves', icon: <Assignment />, path: '/ceo/approve-leaves' },
      { text: 'Employees', icon: <People />, path: '/ceo/admin-employees' },
    ],
    HOD: [
      { text: 'Dashboard', icon: <Dashboard />, path: '/hod/dashboard' },
      { text: 'Profile', icon: <People />, path: '/hod/profile' },
      { text: 'Apply Leave', icon: <Assignment />, path: '/hod/leave' },
      { text: 'Approve Leave', icon: <Assignment />, path: '/hod/approve-leave' },
    ],
    Employee: [
      { text: 'Profile', icon: <People />, path: '/employee/profile' },
      { text: 'Apply Leave', icon: <Assignment />, path: '/employee/leave' },
    ],
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Box
      sx={{
        width: isCollapsed ? '64px' : '240px',
        bgcolor: 'background.paper',
        color: 'text.primary',
        position: 'fixed',
        top: '64px',
        height: 'calc(100vh - 64px)',
        p: isCollapsed ? 1 : 2,
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        transition: 'width 0.3s',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end', mb: 2 }}>
        <IconButton onClick={toggleSidebar}>
          <MenuIcon sx={{ color: 'text.primary' }} />
        </IconButton>
      </Box>
      <List>
        {user &&
          menuItems[user.loginType]?.map((item, index) => (
            <ListItem
              button
              key={index}
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: '8px',
                mb: 1,
                bgcolor: location.pathname === item.path ? 'primary.main' : 'transparent',
                color: location.pathname === item.path ? 'white' : 'text.primary',
                '&:hover': {
                  bgcolor: location.pathname === item.path ? 'primary.dark' : 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'white' : 'text.primary', minWidth: '40px' }}>
                {item.icon}
              </ListItemIcon>
              {!isCollapsed && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{ fontWeight: 500, fontSize: '14px' }}
                />
              )}
            </ListItem>
          ))}
      </List>
      <Divider sx={{ bgcolor: 'divider', my: 2 }} />
      <List>
        <ListItem
          button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          sx={{
            borderRadius: '8px',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <ListItemIcon sx={{ color: 'text.primary', minWidth: '40px' }}>
            <ExitToApp />
          </ListItemIcon>
          {!isCollapsed && (
            <ListItemText
              primary="Logout"
              primaryTypographyProps={{ fontWeight: 500, fontSize: '14px' }}
            />
          )}
        </ListItem>
      </List>
    </Box>
  );
}

export default Sidebar;