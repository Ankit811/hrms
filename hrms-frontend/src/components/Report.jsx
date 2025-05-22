import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ContentLayout from './ContentLayout';

function Report() {
  const [form, setForm] = useState({ type: 'daily', date: '', department: '' });
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then(res => setDepartments(res.data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.get('/reports/attendance', {
        params: {
          type: form.type,
          date: form.date,
          department: form.department,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${form.type}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Error generating report');
    }
  };

  return (
    <ContentLayout title="Generate Report">
      <form
        onSubmit={handleSubmit}
        className="max-w-md mx-auto bg-white dark:bg-black p-6 rounded-md shadow space-y-6"
      >
        {/* Type Select */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type
          </label>
          <select
            name="type"
            id="type"
            value={form.type}
            onChange={handleChange}
            className="block w-full h-12 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
            <option value="department-wise">Department-wise</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        {/* Date Input */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date
          </label>
          <input
            type={form.type === 'monthly' ? 'month' : form.type === 'yearly' ? 'number' : 'date'}
            name="date"
            id="date"
            value={form.date}
            onChange={handleChange}
            className="block w-full h-12 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            placeholder={form.type === 'yearly' ? 'e.g. 2025' : ''}
          />
        </div>

        {/* Department Select */}
        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Department
          </label>
          <select
            name="department"
            id="department"
            value={form.department}
            onChange={handleChange}
            className="block w-full h-12 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button (MUI style: variant=contained, color=primary) */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full h-12 bg-[#1976d2] hover:bg-[#115293] text-white font-medium rounded-md transition"
          >
            Generate PDF
          </button>
        </div>
      </form>
    </ContentLayout>
  );
}

export default Report;
