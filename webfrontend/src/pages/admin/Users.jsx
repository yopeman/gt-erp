import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  Shield,
  UserPlus,
  Trash2,
  Mail,
  Lock,
  RefreshCw,
  Edit,
  UserCheck,
  Briefcase,
  Building,
  User,
  Search,
  Filter,
  Boxes
} from 'lucide-react';

const AVAILABLE_ROLES = [
  { id: 'admin', label: 'Admin (Full Access)', desc: 'Full system management and configuration' },
  { id: 'purchaser', label: 'Purchaser (Procurement)', desc: 'Purchase requests, POs, suppliers, credit & GRV' },
  { id: 'storekeeper', label: 'Storekeeper (Store & Inventory)', desc: 'Warehouse, stock in/out, clearances & SIV' },
  { id: 'hr', label: 'HR Officer', desc: 'Employee records, attendance, leave & payroll' },
  { id: 'manager', label: 'Department Manager', desc: 'Departmental approvals and team oversight' },
  { id: 'finance', label: 'Finance Officer', desc: 'Accounts, budgets, vouchers and settlements' },
  { id: 'employee', label: 'Staff / Employee', desc: 'Self-service portal, clock-in, requests' }
];

const getRoleBadgeStyle = (role) => {
  switch (role) {
    case 'admin':
      return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-500/30';
    case 'purchaser':
      return 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-500/30 font-bold';
    case 'storekeeper':
      return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-500/40 font-bold';
    case 'hr':
      return 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-500/30';
    case 'manager':
      return 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';
    case 'finance':
      return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingUserId, setEditingUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    roles: ['employee'],
    employee: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/users');
      if (response.success && Array.isArray(response.data)) {
        setUsers(response.data);
      } else if (Array.isArray(response)) {
        setUsers(response);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?limit=200');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
      } else if (Array.isArray(response)) {
        setEmployees(response);
      }
    } catch (err) {
      console.error('Error fetching employees for dropdown:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingUserId(null);
    setFormError('');
    setFormData({
      fullName: '',
      email: '',
      password: '',
      roles: ['employee'],
      employee: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setModalMode('edit');
    setEditingUserId(u._id);
    setFormError('');
    setFormData({
      fullName: u.fullName || '',
      email: u.email || '',
      password: '',
      roles: Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : ['employee'],
      employee: u.employee?._id || u.employee || ''
    });
    setIsModalOpen(true);
  };

  const handleRoleToggle = (role) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(role);
      const updated = exists ? prev.roles.filter((r) => r !== role) : [...prev.roles, role];
      return { ...prev, roles: updated.length > 0 ? updated : ['employee'] };
    });
  };

  const handleEmployeeSelect = (empId) => {
    const matched = employees.find((e) => e._id === empId);
    setFormData((prev) => ({
      ...prev,
      employee: empId,
      fullName: matched && !prev.fullName ? matched.fullName : prev.fullName,
      email: matched && !prev.email ? matched.email : prev.email
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        const payload = {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          roles: formData.roles,
          employee: formData.employee || null
        };
        const response = await api.post('/users', payload);
        if (response.success) {
          setIsModalOpen(false);
          await fetchUsers();
          await fetchEmployees();
        }
      } else {
        const payload = {
          fullName: formData.fullName,
          email: formData.email,
          roles: formData.roles,
          employee: formData.employee || null
        };
        if (formData.password && formData.password.trim() !== '') {
          payload.password = formData.password.trim();
        }
        const response = await api.put(`/users/${editingUserId}`, payload);
        if (response.success) {
          setIsModalOpen(false);
          await fetchUsers();
          await fetchEmployees();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser?._id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (!window.confirm('Are you sure you want to deactivate this system user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      await fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      u.fullName?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.employee?.fullName?.toLowerCase().includes(term) ||
      u.employee?.department?.toLowerCase().includes(term) ||
      u.roles?.some((r) => r.toLowerCase().includes(term));

    const matchesRole = !roleFilter || u.roles?.includes(roleFilter);

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-500" />
            <span>{t('nav.users')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Central administration, user logins, and Role-Based Access Control (RBAC) linked to employee profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchUsers();
              fetchEmployees();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('actions.createUser')}</span>
          </button>
        </div>
      </div>

      {/* Search and Role Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search...')}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/30 text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
            >
              <option value="">{t('all')} {t('roles')} ({users.length})</option>
              {AVAILABLE_ROLES.map((r) => {
                const count = users.filter((u) => u.roles?.includes(r.id)).length;
                return (
                  <option key={r.id} value={r.id}>
                    {t(r.id)} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading system users and employee links from live API...
        </div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title={searchTerm || roleFilter ? "No matching users found" : "No system users found"}
          message={
            searchTerm || roleFilter
              ? "Try adjusting your search query or role filter criteria."
              : "No user accounts retrieved from backend."
          }
          actionText={searchTerm || roleFilter ? "Clear Filters" : t('actions.createUser')}
          onAction={
            searchTerm || roleFilter
              ? () => {
                  setSearchTerm('');
                  setRoleFilter('');
                }
              : handleOpenCreateModal
          }
          icon={Shield}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map((u) => (
              <div
                key={u._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {u.employee?.profileImage ? (
                      <img
                        src={u.employee.profileImage}
                        alt={u.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center border border-primary-500/20 text-xs">
                        {u.fullName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {u.fullName}
                        {u._id === currentUser?._id && (
                          <span className="text-[10px] font-bold text-primary-500 uppercase">(You)</span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <Badge status={u.isDeleted ? 'inactive' : 'active'} text={u.isDeleted ? 'Deactivated' : 'Active'} />
                </div>

                {/* Linked Employee Info */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Linked HR Employee
                  </span>
                  {u.employee ? (
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{u.employee.fullName}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {u.employee.department} • {u.employee.position}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">No employee profile linked</span>
                  )}
                </div>

                {/* Roles */}
                <div className="flex flex-wrap gap-1">
                  {u.roles?.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase border ${getRoleBadgeStyle(
                        role
                      )}`}
                    >
                      {role === 'storekeeper' && <Boxes className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                      <span>{role}</span>
                    </span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => handleOpenEditModal(u)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Edit className="w-3.5 h-3.5 text-primary-500" />
                    <span>Edit Roles & Link</span>
                  </button>

                  {u._id !== currentUser?._id && (
                    <button
                      onClick={() => handleDeleteUser(u._id)}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('actions.delete')}</span>
                    </button>
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
                  <th className="px-4 py-3">{t('user')} & {t('email')}</th>
                  <th className="px-4 py-3">{t('employee')} {t('profile')}</th>
                  <th className="px-4 py-3">{t('roles')}</th>
                  <th className="px-4 py-3">{t('status')}</th>
                  <th className="px-4 py-3 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.employee?.profileImage ? (
                          <img
                            src={u.employee.profileImage}
                            alt={u.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center border border-primary-500/20 text-xs">
                            {u.fullName?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {u.fullName}
                            {u._id === currentUser?._id && (
                              <span className="text-[10px] font-bold text-primary-500 uppercase">(You)</span>
                            )}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-xs">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {u.employee ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          <div>
                            <span className="font-medium text-slate-900 dark:text-slate-100 block">
                              {u.employee.fullName}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {u.employee.department} • {u.employee.position}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500 italic">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Standalone User
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.roles?.map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] uppercase border ${getRoleBadgeStyle(
                              role
                            )}`}
                          >
                            {role === 'storekeeper' && (
                              <Boxes className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            )}
                            <span>{role}</span>
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        status={u.isDeleted ? 'inactive' : 'active'}
                        text={u.isDeleted ? 'Deactivated' : 'Active'}
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg transition"
                          title="Edit Roles & Employee Link"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {u._id !== currentUser?._id && (
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            title="Deactivate User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal for Create / Edit User */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? t('actions.createUser') : 'Edit User & Roles'}
        maxWidth="max-w-lg"
      >
        {formError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link to Employee Profile */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Connect to Employee Profile (Optional)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Links this login credentials to an Employee record for self-service, clock-in, and department routing.
            </p>
            <select
              value={formData.employee}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- No Linked Employee (Standalone Account) --</option>
              {employees
                .filter((emp) => {
                  const linkedUserId = emp.user?._id || emp.user;
                  // If employee is already linked to another user account, hide them
                  return !linkedUserId || (editingUserId && String(linkedUserId) === String(editingUserId));
                })
                .map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.department} • {emp.position})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Henok Assefa"
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
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="henok@gtprinting.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {modalMode === 'create' ? 'Password *' : 'Password (leave blank to keep unchanged)'}
            </label>
            <input
              type="password"
              required={modalMode === 'create'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={modalMode === 'create' ? '••••••••••••' : 'Unchanged'}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Assign System Roles (RBAC Permissions)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {AVAILABLE_ROLES.map((r) => {
                const isSelected = formData.roles.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                      isSelected
                        ? 'bg-primary-50/70 dark:bg-primary-950/40 border-primary-500 text-primary-700 dark:text-primary-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleRoleToggle(r.id)}
                      className="accent-primary-500 rounded mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 uppercase font-bold text-xs">
                        {r.id === 'storekeeper' && (
                          <Boxes className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        )}
                        <span>{r.label}</span>
                      </div>
                      <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {r.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
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
              {submitting
                ? 'Saving...'
                : modalMode === 'create'
                ? t('actions.createUser')
                : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
