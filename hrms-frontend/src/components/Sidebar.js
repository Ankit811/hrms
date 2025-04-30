import React, { useContext } from 'react';
import { List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Dashboard, People, Assignment, Event, Report, ExitToApp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

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
      { text: 'Reports', icon: <Report />, path: '/ceo/reports' },
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

  return (
    <div className="sidebar">
      <List>
        {user && menuItems[user.loginType]?.map((item, index) => (
          <ListItem button key={index} onClick={() => handleNavigation(item.path)} className="sidebar-item">
            <ListItemIcon className="sidebar-icon">{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} className="sidebar-text" />
          </ListItem>
        ))}
      </List>
      <Divider className="sidebar-divider" />
      <List>
        <ListItem button onClick={logout} className="sidebar-item">
          <ListItemIcon className="sidebar-icon"><ExitToApp /></ListItemIcon>
          <ListItemText primary="Logout" className="sidebar-text" />
        </ListItem>
      </List>
    </div>
  );
}

export default Sidebar;