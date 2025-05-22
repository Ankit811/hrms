import React, { useEffect, useState } from 'react';
import api from '../services/api';
import ContentLayout from './ContentLayout';
import Pagination from './Pagination';

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    employeeId: '',
    departmentId: '',
    fromDate: '',
    toDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance', { params: filters });
      setAttendance(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleFilter = () => {
    fetchAttendance();
    setCurrentPage(1);
  };

  const handleClear = () => {
    setFilters({ employeeId: '', departmentId: '', fromDate: '', toDate: '' });
    setAttendance([]);
    setCurrentPage(1);
  };

  const paginatedAttendance = attendance.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <ContentLayout title="Attendance List">
      <div className="w-full max-w-6xl mx-auto">
        {/* Filter Section */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            name="employeeId"
            value={filters.employeeId}
            onChange={handleChange}
            placeholder="Employee ID"
            className="max-w-sm border border-border px-4 py-2 rounded-md bg-background text-foreground"
          />
          <select
            name="departmentId"
            value={filters.departmentId}
            onChange={handleChange}
            className="max-w-sm border border-border px-4 py-2 rounded-md bg-background text-foreground"
          >
            <option value="">All Departments</option>
            {departments.map(dep => (
              <option key={dep._id} value={dep._id}>{dep.name}</option>
            ))}
          </select>
          <input
            type="date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleChange}
            className="max-w-sm border border-border px-4 py-2 rounded-md bg-background text-foreground"
          />
          <input
            type="date"
            name="toDate"
            value={filters.toDate}
            onChange={handleChange}
            className="max-w-sm border border-border px-4 py-2 rounded-md bg-background text-foreground"
          />
          <div className="flex gap-2">
            <button onClick={handleFilter} className="px-4 py-2 border border-border rounded-md bg-white dark:bg-black">
              Filter
            </button>
            <button onClick={handleClear} className="px-4 py-2 border border-border rounded-md bg-white dark:bg-black">
              Clear
            </button>
          </div>
        </div>

        {/* Table Section */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : paginatedAttendance.length === 0 ? (
          <div className="text-center py-8 rounded-lg bg-white dark:bg-black border">
            <p className="text-lg font-semibold">No attendance records found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-border">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 border">Employee ID</th>
                    <th className="px-4 py-2 border">User ID</th>
                    <th className="px-4 py-2 border">Name</th>
                    <th className="px-4 py-2 border">Date</th>
                    <th className="px-4 py-2 border">Time</th>
                    <th className="px-4 py-2 border">Direction</th>
                    <th className="px-4 py-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAttendance.map(a => (
                    <tr key={a._id} className="hover:bg-muted/50 transition">
                      <td className="px-4 py-2 border">{a.employeeId}</td>
                      <td className="px-4 py-2 border">{a.userId}</td>
                      <td className="px-4 py-2 border">{a.name}</td>
                      <td className="px-4 py-2 border">{new Date(a.logDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2 border">{a.logTime}</td>
                      <td className="px-4 py-2 border">{a.direction}</td>
                      <td className="px-4 py-2 border">{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              itemsPerPage={itemsPerPage}
              totalItems={attendance.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>
    </ContentLayout>
  );
}

export default Attendance;
