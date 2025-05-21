"use client";

import React, { useEffect, useState, useContext, useCallback } from 'react';
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
import ReactPaginate from 'react-paginate';
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
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);

  const fetchLeaves = useCallback(async (currentPage = page) => {
    try {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        leaveType: filters.leaveType,
        status: filters.status,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        page: currentPage,
        limit,
      }).toString();
      const res = await api.get(`/leaves?${query}`);
      setLeaves(res.data.leaves);
      setFiltered(res.data.leaves);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (err) {
      console.error('Error fetching leave list:', err);
      setError(err.response?.data?.message || 'Failed to fetch leaves. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleFilterChange = (name, value) => {
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
    const query = new URLSearchParams({
      leaveType: newFilters.leaveType,
      status: newFilters.status,
      fromDate: newFilters.fromDate,
      toDate: newFilters.toDate,
      page: 1,
      limit,
    }).toString();
    setLoading(true);
    api.get(`/leaves?${query}`)
      .then(res => {
        setLeaves(res.data.leaves);
        setFiltered(res.data.leaves);
        setTotal(res.data.total);
        setPage(res.data.page);
        setError(null);
      })
      .catch(err => {
        console.error('Error applying filters:', err);
        setError(err.response?.data?.message || 'Failed to apply filters.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleApproval = async (id, status, currentStage) => {
    try {
      const leaveData = { status };
      await api.put(`/leaves/${id}/approve`, leaveData);
      const updatedLeaves = leaves.map(l => {
        if (l._id === id) {
          const newStatus = { ...l.status, [currentStage]: status };
          if (status === 'Approved') {
            if (currentStage === 'hod') newStatus.admin = 'Pending';
            else if (currentStage === 'admin') newStatus.ceo = 'Pending';
          }
          return { ...l, status: newStatus };
        }
        return l;
      });
      setLeaves(updatedLeaves);
      setFiltered(updatedLeaves);
      alert(`Leave ${status.toLowerCase()} successfully.`);
    } catch (err) {
      console.error('Approval error:', err);
      alert(`Error processing leave approval: ${err.response?.data?.message || err.message}`);
    }
  };

  const handlePageChange = ({ selected }) => {
    const newPage = selected + 1;
    setPage(newPage);
    fetchLeaves(newPage);
  };

  return (
    <ContentLayout title="Leave List">
      <Card className="max-w-5xl mx-auto shadow-lg border">
        <CardContent className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Leave Records</h2>
            <Button
              onClick={() => fetchLeaves(1)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Leave Type Filter */}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="leaveType" className="text-sm font-medium text">
                Leave Type
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange('leaveType', value)}
                value={filters.leaveType}
                aria-label="Select leave type filter"
                disabled={loading}
              >
                <SelectTrigger id="leaveType" className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500">
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
              <Label htmlFor="status" className="text-sm font-medium text">
                Approval Status (Any Stage)
              </Label>
              <Select
                onValueChange={(value) => handleFilterChange('status', value)}
                value={filters.status}
                aria-label="Select approval status filter"
                disabled={loading}
              >
                <SelectTrigger id="status" className="mt-1 border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Date Filter */}
            {/* <div className="flex-1 min-w-[200px]">
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
                disabled={loading}
              />
            </div> */}

            {/* To Date Filter */}
            {/* <div className="flex-1 min-w-[200px]">
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
                disabled={loading}
              />
            </div> */}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                <TableRow className="border-b">
                  <TableHead className="font-semibold text">Employee</TableHead>
                  <TableHead className="font-semibold text">Type</TableHead>
                  <TableHead className="font-semibold text">Category</TableHead>
                  <TableHead className="font-semibold text">From</TableHead>
                  <TableHead className="font-semibold text">To</TableHead>
                  <TableHead className="font-semibold text">Status (HOD)</TableHead>
                  <TableHead className="font-semibold text">Status (Admin)</TableHead>
                  <TableHead className="font-semibold text">Status (CEO)</TableHead>
                  {['HOD', 'Admin', 'CEO'].includes(user?.loginType) && (
                    <TableHead className="font-semibold text">Action</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={['HOD', 'Admin', 'CEO'].includes(user?.loginType) ? 9 : 8}
                      className="text-center text py-4"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={['HOD', 'Admin', 'CEO'].includes(user?.loginType) ? 9 : 8}
                      className="text-center text py-4"
                    >
                      No leave records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((leave) => (
                    <TableRow key={leave._id} className="hover:bg-gray-50">
                      <TableCell className="text">{leave.name}</TableCell>
                      <TableCell className="text">
                        {leave.isCompensatory ? 'Compensatory' : leave.leaveType}
                      </TableCell>
                      <TableCell className="text">{leave.category}</TableCell>
                      <TableCell className="text">
                        {new Date(leave.fullDay?.from || leave.halfDay?.date || leave.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text">
                        {new Date(leave.fullDay?.to || leave.halfDay?.date || leave.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text">{leave.status.hod || 'Pending'}</TableCell>
                      <TableCell className="text">{leave.status.admin || 'Pending'}</TableCell>
                      <TableCell className="text">{leave.status.ceo || 'Pending'}</TableCell>
                      {['HOD', 'Admin', 'CEO'].includes(user?.loginType) && (
                        <TableCell>
                          {user.loginType === 'HOD' && leave.status.hod === 'Pending' && (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Approved', 'hod')}
                                disabled={loading || leave.status.hod !== 'Pending'}
                                aria-label={`Approve leave for ${leave.name}`}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Rejected', 'hod')}
                                disabled={loading || leave.status.hod !== 'Pending'}
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
                                disabled={loading || leave.status.admin !== 'Pending'}
                                aria-label={`Approve leave for ${leave.name}`}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-blue-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Rejected', 'admin')}
                                disabled={loading || leave.status.admin !== 'Pending'}
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
                                disabled={loading || leave.status.ceo !== 'Pending'}
                                aria-label={`Approve leave for ${leave.name}`}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleApproval(leave._id, 'Rejected', 'ceo')}
                                disabled={loading || leave.status.ceo !== 'Pending'}
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

          {/* Pagination */}
          {total > limit && (
            <ReactPaginate
              previousLabel={'Previous'}
              nextLabel={'Next'}
              breakLabel={'...'}
              pageCount={Math.ceil(total / limit)}
              marginPagesDisplayed={2}
              pageRangeDisplayed={5}
              onPageChange={handlePageChange}
              containerClassName={'pagination'}
              activeClassName={'active'}
              disabledClassName={'disabled'}
              forcePage={page - 1}
            />
          )}
        </CardContent>
      </Card>
    </ContentLayout>
  );
}

export default LeaveList;
