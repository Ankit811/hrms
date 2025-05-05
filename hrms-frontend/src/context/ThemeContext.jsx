import React, { useMemo } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export default function ThemeContextProvider({ children }) {
  const theme = useMemo(() => createTheme({
    palette: {
      primary: { main: '#1976d2' },
      secondary: { main: '#4caf50' },
      background: {
        default: '#f0f2f5',
        paper: '#ffffff',
      },
      text: {
        primary: '#1f2937',
        secondary: '#6b7280',
      },
      navbar: {
        main: '#1a202c', // Fixed Navbar background color
      },
    },
    typography: {
      fontFamily: "'Inter', sans-serif",
      h4: { fontWeight: 700 },
      body1: { fontWeight: 500 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: '8px',
          },
        },
      },
    },
  }), []);

  return (
    <ThemeProvider theme={theme}>
      {children}
    </ThemeProvider>
  );
}