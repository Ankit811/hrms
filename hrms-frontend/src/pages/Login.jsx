import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import logo from '../assets/logo1.png'; // Updated to Vite's asset import

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-600 to-blue-400 p-4">
      <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-500">
        <CardHeader className="flex flex-col items-center gap-2">
          <img src={logo} alt="Company Logo" className="w-24 h-auto mb-2" />
          <CardTitle className="text-center text-2xl font-bold text-gray-800">
            HR Management System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {password && password.length < 6 && (
                <p className="text-sm text-red-500 mt-1">Minimum 6 characters required</p>
              )}
            </div>
            <Button type="submit" className="w-full font-medium">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;