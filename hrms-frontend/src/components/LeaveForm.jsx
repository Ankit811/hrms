"use client";

import React, { useState, useContext } from 'react';
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
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
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import ContentLayout from './ContentLayout';
import io from 'socket.io-client'

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

  const handleCheckboxChange = (checked) => {
    setForm(prev => ({ ...prev, isCompensatory: checked }));
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
    <ContentLayout title="Apply for Leave">
      <Card className="max-w-lg mx-auto bg-white shadow-lg border-none">
        <CardContent className="p-6">
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Leave Type */}
            <div>
              <Label htmlFor="leaveType" className="text-sm font-medium text-gray-700">
                Leave Type
              </Label>
              <Select
                onValueChange={(value) => handleChange({ target: { name: 'leaveType', value } })}
                value={form.leaveType}
                aria-label="Select leave type"
              >
                <SelectTrigger id="leaveType" className="mt-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                Category
              </Label>
              <Select
                onValueChange={(value) => handleChange({ target: { name: 'category', value } })}
                value={form.category}
                aria-label="Select category"
              >
                <SelectTrigger id="category" className="mt-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Casual">Casual</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Compensatory Leave */}
            <div className="col-span-1 md:col-span-2 flex items-center space-x-2">
              <Checkbox
                id="isCompensatory"
                checked={form.isCompensatory}
                onCheckedChange={handleCheckboxChange}
                className="border-gray-300 focus:ring-blue-500"
                aria-label="Compensatory Leave"
              />
              <Label htmlFor="isCompensatory" className="text-sm font-medium text-gray-700">
                Compensatory Leave
              </Label>
            </div>

            {/* Compensatory Details */}
            {form.isCompensatory && (
              <div className="col-span-1 md:col-span-2">
                <Label htmlFor="compensatoryDetails" className="text-sm font-medium text-gray-700">
                  Compensatory Details
                </Label>
                <Textarea
                  id="compensatoryDetails"
                  name="compensatoryDetails"
                  value={form.compensatoryDetails}
                  onChange={handleChange}
                  className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
              </div>
            )}

            {/* Leave Duration */}
            <div>
              <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
                Leave Duration
              </Label>
              <Select
                onValueChange={(value) => {
                  const isHalf = value === 'half';
                  setForm(prev => ({
                    ...prev,
                    duration: value,
                    halfDay: isHalf ? { ...prev.halfDay } : { date: '', session: 'forenoon' },
                    fullDay: isHalf ? { from: '', to: '' } : { ...prev.fullDay },
                  }));
                }}
                value={form.duration}
                aria-label="Select leave duration"
              >
                <SelectTrigger id="duration" className="mt-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="full">Full Day</SelectItem>
                  <SelectItem value="half">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Fields */}
            {form.duration === 'half' ? (
              <>
                {/* Session */}
                <div>
                  <Label htmlFor="halfDay.session" className="text-sm font-medium text-gray-700">
                    Session
                  </Label>
                  <Select
                    onValueChange={(value) => handleChange({ target: { name: 'halfDay.session', value } })}
                    value={form.halfDay.session}
                    aria-label="Select session"
                  >
                    <SelectTrigger id="halfDay.session" className="mt-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="forenoon">Forenoon</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Half Day Date */}
                <div>
                  <Label htmlFor="halfDay.date" className="text-sm font-medium text-gray-700">
                    Half Day Date
                  </Label>
                  <Input
                    id="halfDay.date"
                    name="halfDay.date"
                    type="date"
                    value={form.halfDay.date}
                    onChange={handleChange}
                    className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            ) : (
              <>
                {/* From Date */}
                <div>
                  <Label htmlFor="fullDay.from" className="text-sm font-medium text-gray-700">
                    From Date
                  </Label>
                  <Input
                    id="fullDay.from"
                    name="fullDay.from"
                    type="date"
                    value={form.fullDay.from}
                    onChange={handleChange}
                    className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* To Date */}
                <div>
                  <Label htmlFor="fullDay.to" className="text-sm font-medium text-gray-700">
                    To Date
                  </Label>
                  <Input
                    id="fullDay.to"
                    name="fullDay.to"
                    type="date"
                    value={form.fullDay.to}
                    onChange={handleChange}
                    className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Reason */}
            <div className="col-span-1 md:col-span-2">
              <Label htmlFor="reason" className="text-sm font-medium text-gray-700">
                Reason
              </Label>
              <Textarea
                id="reason"
                name="reason"
                value={form.reason}
                onChange={handleChange}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Enter reason..."
                aria-label="Reason"
              />
            </div>

            {/* Charge Given To */}
            <div>
              <Label htmlFor="chargeGivenTo" className="text-sm font-medium text-gray-700">
                Charge Given To
              </Label>
              <Input
                id="chargeGivenTo"
                name="chargeGivenTo"
                type="text"
                value={form.chargeGivenTo}
                onChange={handleChange}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter charge given to"
                aria-label="Charge Given To"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <Label htmlFor="emergencyContact" className="text-sm font-medium text-gray-700">
                Emergency Contact
              </Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                type="text"
                value={form.emergencyContact}
                onChange={handleChange}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter emergency contact"
                aria-label="Emergency Contact"
              />
            </div>

            {/* Submit Button */}
            <div className="col-span-1 md:col-span-2 flex justify-center mt-4">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md"
                aria-label="Submit leave"
              >
                {submitting ? 'Submitting...' : 'Submit Leave'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default LeaveForm;