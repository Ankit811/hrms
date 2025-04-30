import React from 'react';
import { Typography } from '@mui/material';

function ContentLayout({ title, children }) {
  return (
    <div className="content-section">
      <Typography variant="h4" className="content-title">{title}</Typography>
      <div className="content-cards">
        {children}
      </div>
    </div>
  );
}

export default ContentLayout;