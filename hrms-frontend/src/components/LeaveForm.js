import React, { useState, useContext } from 'react';
import {
  TextField, FormControl, InputLabel, Select, MenuItem,
  Button, Box, Grid, Checkbox, FormControlLabel, Typography
} from '@mui/material';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

function LeaveForm() {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({
    leaveType: '',
    category: '',
    fullDay: { from: '', to: '' },
    halfDay: { date: '', session: 'forenoon' },
    reason: '',
    chargeGivenTo: '',
    emergencyContact: '',
    isCompensatory: false,
    compensatoryDetails: '',
    duration: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;

    if (name.includes('fullDay')) {
      setForm(prev => ({
        ...prev,
        fullDay: { ...prev.fullDay, [name.split('.')[1]]: value }
      }));
    } else if (name.includes('halfDay')) {
      setForm(prev => ({
        ...prev,
        halfDay: { ...prev.halfDay, [name.split('.')[1]]: value }
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = e => {
    setForm(prev => ({ ...prev, isCompensatory: e.target.checked }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const leaveData = {
        ...form,
        user: user.id,
      };
      await api.post('/leaves', leaveData);
      alert('Leave submitted successfully');
      setForm({
        leaveType: '',
        category: '',
        fullDay: { from: '', to: '' },
        halfDay: { date: '', session: 'forenoon' },
        reason: '',
        chargeGivenTo: '',
        emergencyContact: '',
        isCompensatory: false,
        compensatoryDetails: '',
        duration: '',
      });
    } catch (err) {
      console.error('Leave submit error:', err.response?.data || err.message);
      alert('Error submitting leave: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '600px', width: '100%', mx: 'auto', bgcolor: 'background.paper', borderRadius: '12px', boxShadow: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, textAlign: 'center', color: 'text.primary' }}>
        Apply for Leave
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Leave Type</InputLabel>
              <Select name="leaveType" value={form.leaveType} onChange={handleChange}>
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Unpaid">Unpaid</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select name="category" value={form.category} onChange={handleChange}>
                <MenuItem value="Sick">Sick</MenuItem>
                <MenuItem value="Casual">Casual</MenuItem>
                <MenuItem value="Emergency">Emergency</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={<Checkbox checked={form.isCompensatory} onChange={handleCheckboxChange} />}
              label="Compensatory Leave"
              sx={{ color: 'text.primary' }}
            />
          </Grid>

          {form.isCompensatory && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Compensatory Details"
                name="compensatoryDetails"
                value={form.compensatoryDetails}
                onChange={handleChange}
                multiline
                rows={2}
                sx={{ bgcolor: 'background.default' }}
              />
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Leave Duration</InputLabel>
              <Select
                name="duration"
                value={form.duration}
                onChange={e => {
                  const isHalf = e.target.value === 'half';
                  setForm(prev => ({
                    ...prev,
                    duration: e.target.value,
                    halfDay: isHalf ? { ...prev.halfDay } : { date: '', session: 'forenoon' },
                    fullDay: isHalf ? { from: '', to: '' } : { ...prev.fullDay },
                  }));
                }}
              >
                <MenuItem value="full">Full Day</MenuItem>
                <MenuItem value="half">Half Day</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {form.duration === 'half' ? (
            <>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Session</InputLabel>
                  <Select
                    name="halfDay.session"
                    value={form.halfDay.session}
                    onChange={handleChange}
                  >
                    <MenuItem value="forenoon">Forenoon</MenuItem>
                    <MenuItem value="afternoon">Afternoon</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Half Day Date"
                  name="halfDay.date"
                  type="date"
                  fullWidth
                  required
                  value={form.halfDay.date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: 'background.default' }}
                />
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="From Date"
                  name="fullDay.from"
                  type="date"
                  fullWidth
                  required
                  value={form.fullDay.from}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: 'background.default' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="To Date"
                  name="fullDay.to"
                  type="date"
                  fullWidth
                  required
                  value={form.fullDay.to}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: 'background.default' }}
                />
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              required
              label="Reason"
              name="reason"
              value={form.reason}
              onChange={handleChange}
              multiline
              rows={3}
              sx={{ bgcolor: 'background.default' }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Charge Given To"
              name="chargeGivenTo"
              value={form.chargeGivenTo}
              onChange={handleChange}
              sx={{ bgcolor: 'background.default' }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Emergency Contact"
              name="emergencyContact"
              value={form.emergencyContact}
              onChange={handleChange}
              sx={{ bgcolor: 'background.default' }}
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={submitting}
              fullWidth
              sx={{ py: 1.5, mt: 2 }}
            >
              Submit Leave
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}

export default LeaveForm;