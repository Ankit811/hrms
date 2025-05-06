import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';
import { jwtDecode } from 'jwt-decode'; // Corrected import

// Create the AuthContext
export const AuthContext = createContext();

// AuthProvider to manage authentication state
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper function to check token expiration
  const isTokenExpired = (token) => {
    try {
      const decoded = jwtDecode(token);  // Use jwtDecode
      return decoded.exp * 1000 < Date.now();
    } catch (err) {
      return true;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !isTokenExpired(token)) {
      try {
        const decoded = jwtDecode(token);  // Use jwtDecode
        setUser({ id: decoded.id, loginType: decoded.loginType, name: decoded.name });
        api.defaults.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        localStorage.removeItem('token');
        console.error('Token decoding error:', err);
      }
    } else {
      localStorage.removeItem('token'); // Remove expired or invalid token
    }
    setLoading(false); // Stop loading once authentication check is done
  }, []);

  // Login function to authenticate the user and set token
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(user);
      return user; // Return user data so caller can redirect correctly
    } catch (err) {
      console.error('Login error:', err);
      throw new Error('Login failed, please check your credentials and try again.');
    }
  };

  // Logout function to clear user and token
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
