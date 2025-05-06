import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import api from '../services/api';
import ContentLayout from './ContentLayout';
import EmployeeDetails from './EmployeeDetails';
import EmployeeUpdateForm from './EmployeeUpdateForm';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loginType, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let userFetchError = false;
        const userRes = await api.get('/auth/me').catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          userFetchError = true;
          console.error('Error fetching user:', err);
          return null;
        });

        if (userRes) {
          setRole(userRes.data.loginType || '');
        }

        const empRes = await api.get('/employees').catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          throw new Error('Failed to fetch employees. Please try again later.');
        });
        setEmployees(empRes.data);

        const deptRes = await api.get('/departments').catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          throw new Error('Failed to fetch departments. Please try again later.');
        });
        setDepartments(deptRes.data.filter(dept => dept._id && dept._id.trim() !== ''));

        if (userFetchError) {
          setError('Failed to fetch user details. Some features may be unavailable.');
        }
      } catch (err) {
        if (err.message !== 'not_authenticated') {
          console.error('Error fetching data:', err);
          setError(err.message || 'An unexpected error occurred. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const filteredEmployees = useMemo(() => {
    let filtered = employees;
    if (search) {
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (departmentFilter && departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department?._id === departmentFilter);
    }
    return filtered;
  }, [employees, search, departmentFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      setEmployees(employees.filter(emp => emp._id !== id));
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Failed to delete employee. Please try again.');
    }
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployeeForDetails(employee);
    setShowDetails(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetails(false);
    setSelectedEmployeeForDetails(null);
  };

  const handleUpdateSuccess = (updatedEmployee) => {
    console.log('handleUpdateSuccess called, updatedEmployee:', updatedEmployee);
    setEmployees(employees.map(emp => emp._id === updatedEmployee._id ? updatedEmployee : emp));
  };

  if (loading) {
    return (
      <ContentLayout title="Employee List">
        <div className="w-full max-w-6xl mx-auto">
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 max-w-sm" />
            <Skeleton className="h-10 max-w-sm" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </ContentLayout>
    );
  }

  if (error && employees.length === 0) {
    return (
      <ContentLayout title="Employee List">
        <div className="w-full max-w-6xl mx-auto">
          <p className="text-red-500">{error}</p>
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title="Employee List">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl mx-auto"
      >
        {error && (
          <p className="text-yellow-500 mb-4">{error}</p>
        )}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Search by name or ID"
            value={search}
            onChange={(e) => {
              console.log('Search input changed:', e.target.value);
              setSearch(e.target.value);
            }}
            className="max-w-sm"
          />
          <Select value={departmentFilter} onValueChange={(value) => {
            console.log('Department filter changed:', value);
            setDepartmentFilter(value);
          }}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Filter by department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                dept._id && <SelectItem key={dept._id} value={dept._id}>{dept.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map(emp => (
              <TableRow key={emp._id}>
                <TableCell>{emp.employeeId}</TableCell>
                <TableCell>{emp.name}</TableCell>
                <TableCell>{emp.department?.name || 'N/A'}</TableCell>
                <TableCell className="space-x-2">
                  <Button
                    onClick={() => handleViewDetails(emp)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    View
                  </Button>
                  {loginType === 'Admin' && (
                    <>
                      <EmployeeUpdateForm
                        employee={emp}
                        onUpdate={handleUpdateSuccess}
                      />
                      <Button
                        onClick={() => handleDelete(emp._id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {showDetails && selectedEmployeeForDetails && (
          <EmployeeDetails
            employee={selectedEmployeeForDetails}
            onClose={handleCloseDetailsModal}
            isAdmin={loginType === 'Admin'}
            onLockToggle={async (section) => {
              try {
                const response = await api.patch(`/employees/${selectedEmployeeForDetails._id}/lock-section`, { section });
                setSelectedEmployeeForDetails(response.data);
                setEmployees(employees.map(emp => emp._id === response.data._id ? response.data : emp));
              } catch (err) {
                console.error('Error toggling section lock:', err);
                setError('Failed to toggle section lock. Please try again.');
              }
            }}
          />
        )}
      </motion.div>
    </ContentLayout>
  );
}

export default EmployeeList;