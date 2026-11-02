import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  Building,
  Briefcase,
  Trash2,
  Edit,
  RefreshCw
} from 'lucide-react';

export default function Employees() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr']);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Registration Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    department: 'Press/Offset',
    position: '',
    type: 'full time',
    gender: 'male',
    branch: 'Main Factory',
    baseSalary: '',
    status: 'active'
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/employees');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else if (Array.isArray(response)) {
        setEmployees(response);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        baseSalary: formData.baseSalary ? Number(formData.baseSalary) : 0
      };

      const response = await api.post('/employees', payload);
      if (response.success) {
        setIsModalOpen(false);
        setFormData({
          fullName: '',
          email: '',
          phoneNumber: '',
          department: 'Press/Offset',
          position: '',
          type: 'full time',
          gender: 'male',
          branch: 'Main Factory',
          baseSalary: '',
          status: 'active'
        });
        await fetchEmployees();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to register employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      setEmployees((prev) => prev.filter((emp) => emp._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete employee');
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.position?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter ? emp.department === deptFilter : true;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" />
            <span>{t('nav.employees')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.2 • Complete workforce directory, profiles, and contracts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmployees}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh employees"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{t('actions.createEmployee')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or position..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Departments</option>
          <option value="Pre-press">Pre-press</option>
          <option value="Press/Offset">Press / Offset</option>
          <option value="Digital Print">Digital Print</option>
          <option value="Finishing">Post-press / Finishing</option>
          <option value="Store">Store & Inventory</option>
          <option value="Finance">Finance</option>
          <option value="HR">HR & Admin</option>
          <option value="Sales">Sales & Marketing</option>
        </select>
      </div>

      {/* Data Presentation:
          MOBILE: Card Deck (md:hidden)
          DESKTOP: Data Table (hidden md:block)
      */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Fetching workforce records from backend...
        </div>
      ) : filteredEmployees.length === 0 ? (
        <EmptyState
          title="No employees registered"
          message="No employees match your filter or the database is currently empty. Add your first employee to initiate records."
          actionText={canManage ? t('actions.createEmployee') : null}
          onAction={() => setIsModalOpen(true)}
          icon={Users}
        />
      ) : (
        <>
          {/* MOBILE CARD DECK (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredEmployees.map((emp) => (
              <div 
                key={emp._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{emp.fullName}</h3>
                    <p className="text-xs text-primary-500 font-medium">{emp.position}</p>
                  </div>
                  <Badge status={emp.status} text={emp.status} />
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-300 border-y border-slate-100 dark:border-slate-700/60 py-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dept: <strong>{emp.department}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{emp.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span className="capitalize">{emp.type} • {emp.branch || 'Head Office'}</span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleDeleteEmployee(emp._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('actions.delete')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{emp.fullName}</div>
                      <div className="text-xs text-slate-400">{emp.email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {emp.department}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {emp.position}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {emp.phoneNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 capitalize">
                      {emp.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={emp.status} text={emp.status} />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteEmployee(emp._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          title="Delete employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Registration Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createEmployee')}
        maxWidth="max-w-2xl"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleRegisterEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Abebe Kebede"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="abebe@gtprinting.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                placeholder="+251 911 234 567"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="Pre-press">Pre-press</option>
                <option value="Press/Offset">Press / Offset</option>
                <option value="Digital Print">Digital Print</option>
                <option value="Finishing">Post-press / Finishing</option>
                <option value="Store">Store & Inventory</option>
                <option value="Finance">Finance</option>
                <option value="HR">HR & Admin</option>
                <option value="Sales">Sales & Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Job Position *
              </label>
              <input
                type="text"
                required
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                placeholder="Offset Press Operator"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Employment Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="full time">Full Time</option>
                <option value="part time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Branch Location
              </label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="Main Factory">Main Factory Plant</option>
                <option value="Head Office">Head Office (Bole)</option>
                <option value="Branch 2">Retail & Quick-Print Branch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Base Monthly Salary (ETB)
              </label>
              <input
                type="number"
                name="baseSalary"
                value={formData.baseSalary}
                onChange={handleInputChange}
                placeholder="15000"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Registering...' : t('actions.create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
