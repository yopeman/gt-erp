import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  GraduationCap,
  Plus,
  RefreshCw,
  Calendar,
  UserCheck,
  UserPlus,
  Link as LinkIcon,
  Pencil,
  Trash2,
  Eye,
  Clock,
  Phone,
  Mail,
  Building2,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

export default function Internships() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr']);

  const [internships, setInternships] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Register Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // 1. Register New Employee vs 2. Link with Existing Employee
  const [internSourceMode, setInternSourceMode] = useState('new_employee'); // 'new_employee' | 'existing_user'

  const [newEmployeeData, setNewEmployeeData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    department: 'Digital Print',
    position: 'Intern / Trainee',
    gender: 'male'
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');

  const [formData, setFormData] = useState({
    supervisor: '',
    type: 'paid',
    department: 'Digital Print',
    startDate: '',
    endDate: '',
    status: 'ongoing'
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingInternship, setEditingInternship] = useState(null);
  const [editFormData, setEditFormData] = useState({
    supervisor: '',
    type: 'paid',
    department: 'Digital Print',
    startDate: '',
    endDate: '',
    status: 'ongoing'
  });

  // View Details Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState(null);

  const fetchInternships = async () => {
    setLoading(true);
    try {
      const response = await api.get('/internships');
      if (response.success && Array.isArray(response.data)) {
        setInternships(response.data);
      } else if (Array.isArray(response)) {
        setInternships(response);
      }
    } catch (err) {
      console.error('Error fetching internships:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeesList = async () => {
    try {
      const response = await api.get('/employees');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
        if (response.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            supervisor: prev.supervisor || response.data[0]._id
          }));
        }
      }
    } catch (err) {
      console.warn('Could not load employees:', err);
    }
  };

  useEffect(() => {
    fetchInternships();
    fetchEmployeesList();
  }, []);

  const calculateDuration = (start, end) => {
    if (!start || !end) return '-';
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = e - s;
    if (diffTime < 0) return 'Invalid dates';
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 30) return `${diffDays} days`;
    const months = Math.round(diffDays / 30);
    return `${months} mo (${diffDays} days)`;
  };

  const handleOpenRegisterModal = () => {
    setFormError('');
    setInternSourceMode('new_employee');
    setNewEmployeeData({
      fullName: '',
      email: '',
      phoneNumber: '',
      department: 'Digital Print',
      position: 'Intern / Trainee',
      gender: 'male'
    });
    const defaultEmp = employees.find((e) => e.type === 'intern')?._id || employees[0]?._id || '';
    setSelectedEmployeeId(defaultEmp);
    setFormData({
      supervisor: employees[0]?._id || '',
      type: 'paid',
      department: 'Digital Print',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'ongoing'
    });
    setIsModalOpen(true);
  };

  const handleRegisterIntern = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        supervisor: formData.supervisor,
        type: formData.type,
        department: formData.department,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status
      };

      if (internSourceMode === 'new_employee') {
        if (
          !newEmployeeData.fullName.trim() ||
          !newEmployeeData.email.trim() ||
          !newEmployeeData.phoneNumber.trim()
        ) {
          setFormError('Full Name, Email, and Phone Number are required to register a new employee.');
          setSubmitting(false);
          return;
        }

        payload.newEmployee = {
          fullName: newEmployeeData.fullName.trim(),
          email: newEmployeeData.email.trim(),
          phoneNumber: newEmployeeData.phoneNumber.trim(),
          department: formData.department,
          position: newEmployeeData.position || 'Intern / Trainee',
          gender: newEmployeeData.gender || 'male'
        };
      } else {
        // Option 2: Link with existing employee
        if (!selectedEmployeeId) {
          setFormError('Please select an existing employee from the directory.');
          setSubmitting(false);
          return;
        }
        payload.employee = selectedEmployeeId;
      }

      const response = await api.post('/internships', payload);
      if (response.success) {
        setIsModalOpen(false);
        await Promise.all([fetchInternships(), fetchEmployeesList()]);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to register internship');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item) => {
    setEditingInternship(item);
    setEditFormData({
      supervisor: item.supervisor?._id || '',
      type: item.type || 'paid',
      department: item.department || 'Digital Print',
      startDate: item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '',
      endDate: item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : '',
      status: item.status || 'ongoing'
    });
    setIsEditModalOpen(true);
  };

  // Submit Edit
  const handleUpdateInternship = async (e) => {
    e.preventDefault();
    if (!editingInternship) return;
    setSubmitting(true);
    try {
      const res = await api.put(`/internships/${editingInternship._id}`, editFormData);
      if (res.success) {
        setIsEditModalOpen(false);
        setEditingInternship(null);
        await fetchInternships();
      }
    } catch (err) {
      alert(err.message || 'Failed to update internship record');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Update
  const handleQuickStatusChange = async (itemId, newStatus) => {
    try {
      const res = await api.put(`/internships/${itemId}`, { status: newStatus });
      if (res.success) {
        setInternships((prev) =>
          prev.map((item) => (item._id === itemId ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Delete Internship Record
  const handleDeleteInternship = async (item) => {
    const internName = item.employee?.fullName || 'this intern';
    if (window.confirm(`Are you sure you want to delete the internship record for "${internName}"?`)) {
      try {
        const res = await api.delete(`/internships/${item._id}`);
        if (res.success) {
          setInternships((prev) => prev.filter((i) => i._id !== item._id));
        }
      } catch (err) {
        alert(err.message || 'Failed to delete internship record');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary-500" />
            <span>{t('nav.internships')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.6 • Technical trainee registrations, department mentors, and duration tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInternships}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={handleOpenRegisterModal}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('actions.createIntern')}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading internship records...
        </div>
      ) : internships.length === 0 ? (
        <EmptyState
          title="No interns registered"
          message="No active or past technical interns found. Click the button above to register an intern."
          actionText={canManage ? t('actions.createIntern') : null}
          onAction={handleOpenRegisterModal}
          icon={GraduationCap}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {internships.map((item) => (
              <div
                key={item._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.employee?.fullName || 'Intern'}
                    </h3>
                    <p className="text-xs text-primary-500 font-semibold">{item.department}</p>
                    {item.employee?.phoneNumber && (
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.employee.phoneNumber}</p>
                    )}
                  </div>
                  <Badge status={item.status} text={item.status} />
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                  <div>
                    <span className="text-slate-400">Supervisor:</span>{' '}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {item.supervisor?.fullName || 'Assigned Mentor'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Duration:</span>{' '}
                    <span>
                      {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                    </span>{' '}
                    <span className="text-slate-400 font-mono text-[11px]">
                      ({calculateDuration(item.startDate, item.endDate)})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Stipend:</span>{' '}
                    <span className="capitalize font-semibold text-primary-600 dark:text-primary-400">
                      {item.type}
                    </span>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedInternship(item);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {canManage && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                          title="Edit Internship"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteInternship(item)}
                          className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Delete Internship"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {canManage && (
                    <select
                      value={item.status}
                      onChange={(e) => handleQuickStatusChange(item._id, e.target.value)}
                      className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    >
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="terminated">Terminated</option>
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Intern Employee</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Stipend</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {internships.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div>
                        <div>{item.employee?.fullName || 'Intern'}</div>
                        <div className="text-[11px] font-normal text-slate-400">
                          {item.employee?.email || item.employee?.phoneNumber || 'No contact provided'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{item.supervisor?.fullName || 'Assigned Mentor'}</div>
                      <div className="text-[11px] text-slate-400">{item.supervisor?.position || 'Supervisor'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">
                      {item.department}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.type === 'paid'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      <div>
                        {new Date(item.startDate).toLocaleDateString()} →{' '}
                        {new Date(item.endDate).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {calculateDuration(item.startDate, item.endDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <select
                          value={item.status}
                          onChange={(e) => handleQuickStatusChange(item._id, e.target.value)}
                          className={`text-xs px-2.5 py-1 rounded-xl border font-bold ${
                            item.status === 'ongoing'
                              ? 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900'
                              : item.status === 'completed'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                              : 'border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900'
                          }`}
                        >
                          <option value="ongoing">Ongoing</option>
                          <option value="completed">Completed</option>
                          <option value="terminated">Terminated</option>
                        </select>
                      ) : (
                        <Badge status={item.status} text={item.status} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View Details Button */}
                        <button
                          onClick={() => {
                            setSelectedInternship(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canManage && (
                          <>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition"
                              title="Edit Internship"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteInternship(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* Register Intern Modal                                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createIntern')}
        maxWidth="max-w-lg"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleRegisterIntern} className="space-y-4">
          {/* Select Intern (Employee) Option Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Intern (Employee) Method *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setInternSourceMode('new_employee')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  internSourceMode === 'new_employee'
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>1. Register New Employee</span>
              </button>

              <button
                type="button"
                onClick={() => setInternSourceMode('existing_user')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  internSourceMode === 'existing_user'
                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>2. Link with Existing Employee</span>
              </button>
            </div>
          </div>

          {/* Conditional Intern Form Inputs based on Option */}
          {internSourceMode === 'new_employee' ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                <UserPlus className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  New Intern Employee Details
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newEmployeeData.fullName}
                  onChange={(e) =>
                    setNewEmployeeData({ ...newEmployeeData, fullName: e.target.value })
                  }
                  placeholder="e.g. Almaz Kebede"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmployeeData.email}
                    onChange={(e) =>
                      setNewEmployeeData({ ...newEmployeeData, email: e.target.value })
                    }
                    placeholder="almaz.intern@gtprinting.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newEmployeeData.phoneNumber}
                    onChange={(e) =>
                      setNewEmployeeData({ ...newEmployeeData, phoneNumber: e.target.value })
                    }
                    placeholder="+251 9..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Gender
                  </label>
                  <select
                    value={newEmployeeData.gender}
                    onChange={(e) =>
                      setNewEmployeeData({ ...newEmployeeData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Position / Field
                  </label>
                  <input
                    type="text"
                    value={newEmployeeData.position}
                    onChange={(e) =>
                      setNewEmployeeData({ ...newEmployeeData, position: e.target.value })
                    }
                    placeholder="e.g. Offset Press Trainee"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 dark:border-slate-800">
                <LinkIcon className="w-4 h-4 text-primary-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Select Existing Employee
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Choose Existing Employee *
                </label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.department} - {emp.position || emp.type})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Select an employee from the staff directory to link with this internship program.
                </p>
              </div>
            </div>
          )}

          {/* Supervisor & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Assigned Supervisor / Mentor *
              </label>
              <select
                required
                value={formData.supervisor}
                onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.position || emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="Pre-press">Pre-press</option>
                <option value="Press/Offset">Press / Offset</option>
                <option value="Digital Print">Digital Print</option>
                <option value="Finishing">Finishing & Binding</option>
                <option value="Store">Store & Inventory</option>
              </select>
            </div>
          </div>

          {/* Dates & Stipend */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Stipend Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-semibold"
              >
                <option value="paid">Paid Stipend</option>
                <option value="unpaid">Unpaid Educational</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* Edit Internship Modal                                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingInternship(null);
        }}
        title={`Edit Internship: ${editingInternship?.employee?.fullName || 'Record'}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdateInternship} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Assigned Supervisor *
            </label>
            <select
              required
              value={editFormData.supervisor}
              onChange={(e) => setEditFormData({ ...editFormData, supervisor: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.position || emp.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department
              </label>
              <select
                value={editFormData.department}
                onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              >
                <option value="Pre-press">Pre-press</option>
                <option value="Press/Offset">Press / Offset</option>
                <option value="Digital Print">Digital Print</option>
                <option value="Finishing">Finishing & Binding</option>
                <option value="Store">Store & Inventory</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Stipend
              </label>
              <select
                value={editFormData.type}
                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              >
                <option value="paid">Paid Stipend</option>
                <option value="unpaid">Unpaid Educational</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={editFormData.startDate}
                onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={editFormData.endDate}
                onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Program Status
            </label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold"
            >
              <option value="ongoing">Ongoing (Active Trainee)</option>
              <option value="completed">Completed (Successfully Finished)</option>
              <option value="terminated">Terminated (Early Exit)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingInternship(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* View Internship Details Modal                                            */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedInternship(null);
        }}
        title="Internship Details"
        maxWidth="max-w-md"
      >
        {selectedInternship && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {selectedInternship.employee?.fullName}
                </h3>
                <p className="text-xs text-primary-500 font-semibold">
                  {selectedInternship.employee?.position || 'Intern / Trainee'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedInternship.department} Department
                </p>
              </div>
              <Badge status={selectedInternship.status} text={selectedInternship.status} />
            </div>

            {/* Contact details */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Intern Contact Information
              </span>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="w-3.5 h-3.5 text-primary-500" />
                  <span>{selectedInternship.employee?.email || 'No email registered'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone className="w-3.5 h-3.5 text-primary-500" />
                  <span>{selectedInternship.employee?.phoneNumber || 'No phone registered'}</span>
                </div>
              </div>
            </div>

            {/* Mentorship & Schedule */}
            <div className="space-y-2 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Mentorship & Timeline
              </span>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Supervisor / Mentor:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedInternship.supervisor?.fullName || 'Assigned Mentor'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Supervisor Role:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {selectedInternship.supervisor?.position || selectedInternship.supervisor?.department || 'Staff'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Stipend:</span>
                  <span className="capitalize font-bold text-primary-600 dark:text-primary-400">
                    {selectedInternship.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Duration:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {new Date(selectedInternship.startDate).toLocaleDateString()} →{' '}
                    {new Date(selectedInternship.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Length:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {calculateDuration(selectedInternship.startDate, selectedInternship.endDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(selectedInternship);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400 font-bold text-xs hover:bg-primary-100 transition flex items-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Record</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedInternship(null);
                }}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
