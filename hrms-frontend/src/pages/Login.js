import React, { useState, useContext } from 'react';
import { TextField, Button, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import logo from '../logo.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const loggedInUser = await login(email, password);
      if (!loggedInUser || !loggedInUser.loginType) {
        alert('Login failed: Invalid user type');
        return;
      }

      const userType = loggedInUser.loginType.toLowerCase();
      if (userType === 'employee') {
        navigate(`/${userType}/profile`);
      } else {
        navigate(`/${userType}/dashboard`);
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
        p: 2,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          p: 4,
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          animation: 'fadeIn 0.5s ease-in-out',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(20px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <img
          src={logo}
          alt="Company Logo"
          style={{
            width: '120px',
            height: 'auto',
            mb: 2,
            backgroundColor: 'transparent',
          }}
        />
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>
          HR Management System
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
            inputProps={{ minLength: 6 }}
            helperText={password && password.length < 6 ? 'Minimum 6 characters required' : ''}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
              },
            }}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3, py: 1.5, fontWeight: 500 }}
          >
            Login
          </Button>
        </form>
      </Box>
    </Box>
  );
}

export default Login;