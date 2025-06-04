// frontend/src/components/OTForm.jsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import api from '../services/api';

function OTForm({ open, onOpenChange }) {
  const [form, setForm] = useState({
    date: '',
    hours: '',
    projectDetails: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.date) return 'Date is required';
    if (!form.hours) return 'Hours are required';
    if (!form.projectDetails) return 'Project details are required';
    const hours = parseFloat(form.hours);
    if (isNaN(hours) || hours <= 0 || hours > 24) return 'Hours must be between 0 and 24';
    const otDate = new Date(form.date);
    if (otDate.getDay() !== 0) return 'OT claims are only allowed for Sundays';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const otData = {
        date: new Date(form.date).toISOString(),
        hours: parseFloat(form.hours),
        projectDetails: form.projectDetails,
      };
      await api.post('/ot', otData);
      alert('OT claim submitted successfully');
      setForm({ date: '', hours: '', projectDetails: '' });
      onOpenChange(false);
    } catch (err) {
      console.error('OT submit error:', err.response?.data || err.message);
      alert(`Error: ${err.response?.data?.message || 'An error occurred while submitting the OT claim'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for Overtime</DialogTitle>
          <DialogDescription>Submit your overtime claim details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="hours">Hours</Label>
            <Input
              id="hours"
              name="hours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={form.hours}
              onChange={handleChange}
              placeholder="Enter hours"
            />
          </div>
          <div>
            <Label htmlFor="projectDetails">Project Details</Label>
            <Textarea
              id="projectDetails"
              name="projectDetails"
              value={form.projectDetails}
              onChange={handleChange}
              rows={3}
              placeholder="Enter project details"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OTForm;
