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
  User
} from 'lucide-react';

export default function UsersPage() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

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

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading system users and employee links from live API...
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          title="No system users found"
          message="No user accounts retrieved from backend."
          actionText={t('actions.createUser')}
          onAction={handleOpenCreateModal}
          icon={Shield}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {users.map((u) => (
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
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-500/20"
                    >
                      {role}
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
                  <th className="px-4 py-3">User & Email</th>
                  <th className="px-4 py-3">Linked Employee Profile</th>
                  <th className="px-4 py-3">Assigned Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {users.map((u) => (
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
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-500/20"
                          >
                            {role}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {['admin', 'hr', 'manager', 'finance', 'employee'].map((role) => (
                <label
                  key={role}
                  className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                    formData.roles.includes(role)
                      ? 'bg-primary-50 dark:bg-primary-950/60 border-primary-500 text-primary-600 dark:text-primary-400 font-bold'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.roles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="accent-primary-500 rounded"
                  />
                  <span className="uppercase">{role}</span>
                </label>
              ))}
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
