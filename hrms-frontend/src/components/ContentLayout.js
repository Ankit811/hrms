import React from 'react';
import { Typography, Box } from '@mui/material';

function ContentLayout({ title, children }) {
  return (
    <Box
      sx={{
        ml: { xs: 0, md: '240px' }, /* Adjust for Sidebar width */
        p: { xs: 2, md: 4 },
        bgcolor: 'background.default',
        minHeight: 'calc(100vh - 64px)',
        mt: '64px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', /* Center children horizontally */
        width: '100%', /* Ensure full width within container */
        transition: 'margin-left 0.3s',
      }}
    >
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, textAlign: 'center', color: 'text.primary' }}>
        {title}
      </Typography>
      <Box
        sx={{
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'center', /* Center the form */
          '& > *': { margin: '0 auto' }, /* Force centering on direct children */
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default ContentLayout;