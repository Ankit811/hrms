"use client";

import React, { useEffect, useState, useContext } from 'react';
import {
  Card,
  CardContent,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import api from '../services/api';
import ContentLayout from './ContentLayout';
import { AuthContext } from '../context/AuthContext';

function LeaveList() {
  const { user } = useContext(AuthContext);
  const [leaves, setLeaves] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filters, setFilters] = useState({
    leaveType: 'all',
    status: 'all',
    fromDate: '',
    toDate: '',
  });

  useEffect(() => {
    api.get('/leaves')
      .then(res => {
        setLeaves(res.data);
        setFiltered(res.data);
      })
      .catch(err => {
        console.error('Error fetching leave list:', err);
      });
  }, []);

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (filterSet) => {
    let data = [...leaves];

    if (filterSet.leaveType && filterSet.leaveType !== 'all') {
      data = data.filter(leave => leave.leaveType === filterSet.leaveType);
    }

    if (filterSet.status && filterSet.status !== 'all') {
      data = data.filter(leave =>
        leave.status.hod === filterSet.status ||
        leave.status.admin === filterSet.status ||
        leave.status.ceo === filterSet.status
      );
    }

    if (filterSet.fromDate) {
      const from = new Date(filterSet.fromDate);
      data = data.filter(leave => {
        const leaveFrom = new Date(leave.fullDay?.from || leave.halfDay?.date || leave.createdAt);
        return leaveFrom >= from;
      });
    }

    if (filterSet.toDate) {
      const to = new Date(filterSet.toDate);
      data = data.filter(leave => {
        const leaveTo = new Date(leave.fullDay?.to || leave.halfDay?.date || leave.createdAt);
        return leaveTo <= to;
      });
    }

    setFiltered(data);
  };

  const handleApproval = async (id, status, currentStage) => {
    try {
      let nextStage = '';
      if (currentStage === 'hod') nextStage = 'admin';
      else if (currentStage === 'admin') nextStage = 'ceo';

      const leaveData = { status, nextStage };
      await api.put(`/leaves/${id}/approve`, leaveData);
      setLeaves(prev => prev.map(l => l._id === id ? { ...l, status: { ...l.status, [currentStage]: status, [nextStage]: 'Pending' } } : l));
      setFiltered(prev => prev.map(l => l._id === id ? { ...l, status: { ...l.status, [currentStage]: status, [nextStage]: 'Pending' } } : l));
      alert(`Leave ${status.toLowerCase()} successfully.`);
    } catch (err) {
      console.error('Approval error:', err);
      alert('Error processing leave approval.');
    }
  };

  return (
    <ContentLayout title="Leave List">
      <Card className="max-w-5xl mx-auto bg-white shadow-lg border-none">
        <CardContent className="p-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Leave Type Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="leaveType" className="text-sm font-medium text-gray-700">
                Leave Type
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange('leaveType', value)}
                value={filters.leaveType}
                aria-label="Select leave type filter"
              >
                <SelectTrigger id="leaveType" className="mt-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Compensatory">Compensatory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                Status
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange('status', value)}
                value={filters.status}
                aria-label="Select status filter"
              >
                <SelectTrigger id="status" className="mt-1 bg-white border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Date Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="fromDate" className="text-sm font-medium text-gray-700">
                From Date
              </Label>
              <Input
                id="fromDate"
                name="fromDate"
                type="date"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                aria-label="From Date"
              />
            </div>

            {/* To Date Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="toDate" className="text-sm font-medium text-gray-700">
                To Date
              </Label>
              <Input
                id="toDate"
                name="toDate"
                type="date"
                value={filters.toDate}
                onChange={(e) => handleFilterChange('toDate', e.target.value)}
                className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                aria-label="To Date"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table className="min-w-full bg-white">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold text-gray-700">Employee</TableHead>
                  <TableHead className="font-semibold text-gray-700">Type</TableHead>
                  <TableHead className="font-semibold text-gray-700">From</TableHead>
                  <TableHead className="font-semibold text-gray-700">To</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status (HOD)</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status (Admin)</TableHead>
                  <TableHead className="font-semibold text-gray-700">Status (CEO)</TableHead>
                  {['HOD', 'Admin', 'CEO'].includes(user?.loginType) && (
                    <TableHead className="font-semibold text-gray-700">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={['HOD', 'Admin', 'CEO'].includes(user?.loginType) ? 8 : 7}
                      className="text-center text-gray-500 py-4"
                    >
                      No leave records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((leave) => (
                    <TableRow key={leave._id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-700">{leave.name}</TableCell>
                      <TableCell className="text-gray-700">{leave.leaveType}</TableCell>
                      <TableCell className="text-gray-700">
                        {new Date(leave.fullDay?.from || leave.halfDay?.date || leave.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {new Date(leave.fullDay?.to || leave.halfDay?.date || leave.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-gray-700">{leave.status.hod || 'Pending'}</TableCell>
                      <TableCell className="text-gray-700">{leave.status.admin || 'Pending'}</TableCell>
                      <TableCell className="text-gray-700">{leave.status.ceo || 'Pending'}</TableCell>
                      {['HOD', 'Admin', 'CEO'].includes(user?.loginType) && (
                        <TableCell>
                          {user.loginType === 'HOD' && leave.status.hod === 'Pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Approved', 'hod')}
                                disabled={leave.status.hod !== 'Pending'}
                                aria-label={`Approve leave for ${leave.name}`}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Rejected', 'hod')}
                                disabled={leave.status.hod !== 'Pending'}
                                aria-label={`Reject leave for ${leave.name}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {user.loginType === 'Admin' && leave.status.hod === 'Approved' && leave.status.admin === 'Pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Approved', 'admin')}
                                disabled={leave.status.admin !== 'Pending'}
                                aria-label={`Approve leave for ${leave.name}`}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Rejected', 'admin')}
                                disabled={leave.status.admin !== 'Pending'}
                                aria-label={`Reject leave for ${leave.name}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {user.loginType === 'CEO' && leave.status.admin === 'Approved' && leave.status.ceo === 'Pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Approved', 'ceo')}
                                disabled={leave.status.ceo !== 'Pending'}
                                aria-label={`Approve leave for ${leave.name}`}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Rejected', 'ceo')}
                                disabled={leave.status.ceo !== 'Pending'}
                                aria-label={`Reject leave for ${leave.name}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default LeaveList;