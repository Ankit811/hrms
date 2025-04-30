import React, { useEffect, useState, useContext } from 'react';
import { TextField, Grid, Button } from '@mui/material';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import ContentLayout from './ContentLayout';

function Profile() {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({
    name: '', dateOfBirth: '', mobileNumber: '', address: '', aadharNumber: '',
    dateOfJoining: '', department: '', position: '', role: '',
  });
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    api.get(`/employees/${user.id}`).then(res => {
      setProfile({
        name: res.data.name,
        dateOfBirth: new Date(res.data.dateOfBirth).toISOString().split('T')[0],
        mobileNumber: res.data.mobileNumber,
        address: res.data.address,
        aadharNumber: res.data.aadharNumber,
        dateOfJoining: new Date(res.data.dateOfJoining).toISOString().split('T')[0],
        department: res.data.department.name,
        position: res.data.position,
        role: res.data.role,
      });
      setIsLocked(res.data.locked);
    });
  }, [user.id]);

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
      .catch(err => alert('Failed to update profile: ' + err.response?.data?.message || err.message));
  };

  return (
    <ContentLayout title="Profile">
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField label="Name" name="name" value={profile.name} onChange={handleChange} fullWidth disabled={isLocked} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Date of Birth" name="dateOfBirth" type="date" value={profile.dateOfBirth} onChange={handleChange} fullWidth disabled={isLocked} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Mobile Number" name="mobileNumber" value={profile.mobileNumber} onChange={handleChange} fullWidth disabled={isLocked} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Address" name="address" value={profile.address} onChange={handleChange} fullWidth disabled={isLocked} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Aadhar Number" name="aadharNumber" value={profile.aadharNumber} onChange={handleChange} fullWidth disabled={isLocked} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Date of Joining" name="dateOfJoining" type="date" value={profile.dateOfJoining} onChange={handleChange} fullWidth disabled={isLocked} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Department" name="department" value={profile.department} onChange={handleChange} fullWidth disabled={isLocked} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Position" name="position" value={profile.position} onChange={handleChange} fullWidth disabled={isLocked} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Role" name="role" value={profile.role} onChange={handleChange} fullWidth disabled={isLocked} />
          </Grid>
        </Grid>
        <Button type="submit" variant="contained" color="primary" style={{ marginTop: 20 }} disabled={isLocked}>
          Save
        </Button>
      </form>
    </ContentLayout>
  );
}

export default Profile;