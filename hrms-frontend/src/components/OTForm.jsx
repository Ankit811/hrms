// frontend/src/components/OTForm.jsx
import React, { useState, useEffect } from 'react';
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import api from '../services/api';

function OTForm({ open, onOpenChange, otRecord, onClaimSuccess }) {
  const [form, setForm] = useState({
    date: otRecord ? new Date(otRecord.date).toISOString().split('T')[0] : '',
    hours: otRecord ? otRecord.hours : '',
    projectDetails: '',
    claimType: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (otRecord) {
      setForm({
        date: new Date(otRecord.date).toISOString().split('T')[0],
        hours: otRecord.hours,
        projectDetails: '',
        claimType: otRecord.hours <= 4 ? 'Full' : ''
      });
    }
  }, [otRecord]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleClaimTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      claimType: value,
      hours: value === 'Partial' ? (otRecord.hours >= 8 ? (otRecord.hours - 8).toString() : (otRecord.hours - 4).toString()) : otRecord.hours.toString()
    }));
  };

  const validateForm = () => {
    if (!form.date) return 'Date is required';
    if (!form.hours) return 'Hours are required';
    if (!form.projectDetails) return 'Project details are required';
    const hours = parseFloat(form.hours);
    if (isNaN(hours) || hours <= 0 || hours > 24) return 'Hours must be between 0 and 24';
    const otDate = new Date(form.date);
    if (otDate.getDay() !== 0 && !otRecord) return 'OT claims are only allowed for Sundays for non-eligible departments';
    if (otRecord && hours > otRecord.hours) return `Claimed hours cannot exceed recorded OT (${otRecord.hours})`;
    if (otRecord && otRecord.hours > 4 && !form.claimType) return 'Claim type (Full/Partial) is required for OT > 4 hours';
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
        claimType: form.claimType || null
      };
      await api.post('/ot', otData);
      alert('OT claim submitted successfully');
      setForm({ date: '', hours: '', projectDetails: '', claimType: '' });
      onOpenChange(false);
      if (onClaimSuccess) onClaimSuccess();
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
              disabled={!!otRecord}
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
              disabled={!!otRecord && form.claimType !== ''}
            />
          </div>
          {otRecord && otRecord.hours > 4 && (
            <div>
              <Label htmlFor="claimType">Claim Type</Label>
              <Select
                onValueChange={handleClaimTypeChange}
                value={form.claimType}
                disabled={submitting}
              >
                <SelectTrigger id="claimType">
                  <SelectValue placeholder="Select claim type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full">Full ({otRecord.hours} hours)</SelectItem>
                  <SelectItem value="Partial">Partial ({(otRecord.hours - 4).toFixed(1)} hours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
