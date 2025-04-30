import React, { useEffect, useState } from 'react';
import { IconButton, Badge, Popover, List, ListItem, ListItemText } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import api from '../services/api';

function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    api.get('/notifications').then(res => setNotifications(res.data));
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    notifications.forEach(n => {
      if (!n.read) {
        api.put(`/notifications/${n._id}/read`);
      }
    });
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const open = Boolean(anchorEl);

  return (
    <div className="notification-bell">
      <IconButton onClick={handleClick}>
        <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <List>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText primary="No notifications" />
            </ListItem>
          ) : (
            notifications.map(n => (
              <ListItem key={n._id}>
                <ListItemText primary={n.message} secondary={new Date(n.createdAt).toLocaleString()} />
              </ListItem>
            ))
          )}
        </List>
      </Popover>
    </div>
  );
}

export default Notification;