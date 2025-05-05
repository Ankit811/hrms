import React, { useEffect, useState } from 'react';
import { IconButton, Badge, Popover, List, ListItem, ListItemText } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import api from '../services/api';

function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    api.get('/notifications').then((res) => setNotifications(res.data));
  }, []);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    notifications.forEach((n) => {
      if (!n.read) {
        api.put(`/notifications/${n._id}/read`);
      }
    });
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const open = Boolean(anchorEl);

  return (
    <div>
      <IconButton
        onClick={handleClick}
        sx={{ color: '#ffffff' }} // Fixed white color
      >
        <Badge badgeContent={notifications.filter((n) => !n.read).length} color="error">
          <NotificationsIcon sx={{ fontSize: '28px' }} />
        </Badge>
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            mt: 1,
          },
        }}
      >
        <List sx={{ minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText primary="No notifications" primaryTypographyProps={{ fontWeight: 500 }} />
            </ListItem>
          ) : (
            notifications.map((n) => (
              <ListItem key={n._id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <ListItemText
                  primary={n.message}
                  secondary={new Date(n.createdAt).toLocaleString()}
                  primaryTypographyProps={{ fontWeight: 500, fontSize: '14px' }}
                  secondaryTypographyProps={{ fontSize: '12px', color: 'text.secondary' }}
                />
              </ListItem>
            ))
          )}
        </List>
      </Popover>
    </div>
  );
}

export default Notification;