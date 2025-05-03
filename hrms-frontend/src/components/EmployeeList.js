import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button-old';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import api from '../services/api';
import ContentLayout from './ContentLayout';
import EmployeeDetails from './EmployeeDetails';
import EmployeeUpdateForm from './EmployeeUpdateForm';

function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [loginType, setLoginType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch user details, but don't block other requests if it fails
        let userFetchError = false;
        const userRes = await api.get('/auth/me').catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          userFetchError = true;
          console.error('Error fetching user:', err);
          return null; // Continue with other requests
        });

        if (userRes) {
          setLoginType(userRes.data.loginType || '');
        }

        // Fetch employees
        const empRes = await api.get('/employees').catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          throw new Error('Failed to fetch employees. Please try again later.');
        });
        setEmployees(empRes.data);
        setFilteredEmployees(empRes.data);

        // Fetch departments
        const deptRes = await api.get('/departments').catch(err => {
          if (err.response?.status === 401 || err.response?.status === 403) {
            localStorage.removeItem('token');
            navigate('/login');
            throw new Error('not_authenticated');
          }
          throw new Error('Failed to fetch departments. Please try again later.');
        });
        setDepartments(deptRes.data.filter(dept => dept._id && dept._id.trim() !== ''));

        // If user fetch failed but employees and departments succeeded, show a warning
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

  useEffect(() => {
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
    setFilteredEmployees(filtered);
  }, [search, departmentFilter, employees]);

  const handleLockToggle = async (id) => {
    try {
      const response = await api.patch(`/employees/${id}/lock`);
      setEmployees(employees.map(emp => emp._id === id ? response.data : emp));
      setFilteredEmployees(filteredEmployees.map(emp => emp._id === id ? response.data : emp));
    } catch (err) {
      console.error('Error toggling lock:', err);
      setError('Failed to toggle lock. Please try again.');
    }
  };

  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setShowDetails(true);
  };

  const handleUpdate = (employee) => {
    setSelectedEmployee(employee);
    setShowUpdate(true);
  };

  const handleCloseModal = () => {
    setShowDetails(false);
    setShowUpdate(false);
    setSelectedEmployee(null);
  };

  const handleUpdateSuccess = (updatedEmployee) => {
    setEmployees(employees.map(emp => emp._id === updatedEmployee._id ? updatedEmployee : emp));
    setFilteredEmployees(filteredEmployees.map(emp => emp._id === updatedEmployee._id ? updatedEmployee : emp));
    handleCloseModal();
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
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
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
                    View Details
                  </Button>
                  {loginType === 'Admin' && (
                    <>
                      <Button
                        onClick={() => handleUpdate(emp)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Update
                      </Button>
                      <Button
                        onClick={() => handleLockToggle(emp._id)}
                        className={emp.locked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                      >
                        {emp.locked ? 'Unlock' : 'Lock'}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {showDetails && selectedEmployee && (
          <EmployeeDetails
            employee={selectedEmployee}
            onClose={handleCloseModal}
            isAdmin={loginType === 'Admin'}
            onLockToggle={async (section) => {
              try {
                const response = await api.patch(`/employees/${selectedEmployee._id}/lock-section`, { section });
                setSelectedEmployee(response.data);
                setEmployees(employees.map(emp => emp._id === response.data._id ? response.data : emp));
                setFilteredEmployees(filteredEmployees.map(emp => emp._id === response.data._id ? response.data : emp));
              } catch (err) {
                console.error('Error toggling section lock:', err);
                setError('Failed to toggle section lock. Please try again.');
              }
            }}
          />
        )}
        {showUpdate && selectedEmployee && (
          <EmployeeUpdateForm
            employee={selectedEmployee}
            onClose={handleCloseModal}
            onUpdate={handleUpdateSuccess}
            isAdmin={loginType === 'Admin'}
          />
        )}
      </motion.div>
    </ContentLayout>
  );
}

export default EmployeeList;