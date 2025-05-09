import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Grid, Button } from '@mui/material';
import { Skeleton } from '../components/ui/skeleton';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function Profile() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: '',
    dateOfBirth: '',
    mobileNumber: '',
    permanentAddress: '',
    aadharNumber: '',
    dateOfJoining: '',
    department: '',
    designation: '',
    loginType: '',
  });
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/employees/${user.id}`);
        setProfile({
          name: res.data.name || '',
          dateOfBirth: res.data.dateOfBirth ? new Date(res.data.dateOfBirth).toISOString().split('T')[0] : '',
          mobileNumber: res.data.mobileNumber || '',
          permanentAddress: res.data.permanentAddress || '',
          aadharNumber: res.data.aadharNumber || '',
          dateOfJoining: res.data.dateOfJoining ? new Date(res.data.dateOfJoining).toISOString().split('T')[0] : '',
          department: res.data.department?.name || '',
          designation: res.data.designation || '',
          loginType: res.data.loginType || '',
        });
        setIsLocked(res.data.locked || false);
      } catch (err) {
        console.error('Error fetching profile:', err.response?.data || err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Failed to fetch profile. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchProfile();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLocked) {
      alert('Profile is locked. Contact Admin to edit.');
      return;
    }
    api.put(`/employees/${user.id}`, profile)
      .then(res => alert('Profile updated successfully'))
      .catch(err => alert('Failed to update profile: ' + (err.response?.data?.message || err.message)));
  };

  if (loading) {
    return (
      <ContentLayout title="Profile">
        <Skeleton className="h-64 w-full max-w-4xl mx-auto" />
      </ContentLayout>
    );
  }

  if (error) {
    return (
      <ContentLayout title="Profile">
        <p className="text-red-500">{error}</p>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Profile">
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label="Name"
              name="name"
              value={profile.name}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={profile.dateOfBirth}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Mobile Number"
              name="mobileNumber"
              value={profile.mobileNumber}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Permanent Address"
              name="permanentAddress"
              value={profile.permanentAddress}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Aadhar Number"
              name="aadharNumber"
              value={profile.aadharNumber}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Date of Joining"
              name="dateOfJoining"
              type="date"
              value={profile.dateOfJoining}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Department"
              name="department"
              value={profile.department}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Designation"
              name="designation"
              value={profile.designation}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Role"
              name="loginType"
              value={profile.loginType}
              onChange={handleChange}
              fullWidth
              disabled={isLocked}
            />
          </Grid>
        </Grid>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          style={{ marginTop: 20 }}
          disabled={isLocked}
        >
          Save
        </Button>
      </form>
    </ContentLayout>
  );
}

export default Profile;