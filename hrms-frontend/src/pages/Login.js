import React, { useState, useContext } from 'react';
import { TextField, Button, Typography, Container, Box } from '@mui/material';
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
    <Container maxWidth="xs" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #1976d2, #ffffff)' }}>
      <Box textAlign="center" sx={{ backgroundColor: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <img src={logo} alt="Company Logo" style={{ width: '150px', height: 'auto', marginBottom: '20px' }} />
        <Typography variant="h4" gutterBottom>HR Management System</Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            margin="normal"
            variant="outlined"
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
          />
          <Button type="submit" variant="contained" color="primary" fullWidth style={{ marginTop: '30px', padding: '10px' }}>
            Login
          </Button>
        </form>
      </Box>
    </Container>
  );
}

export default Login;