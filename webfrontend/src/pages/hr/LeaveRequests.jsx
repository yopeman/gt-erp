import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

export default function LeaveRequests() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canDecide = hasRole(['admin', 'hr', 'manager']);

  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Apply Leave Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    employee: '',
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leave-requests');
      if (response.success && Array.isArray(response.data)) {
        setLeaves(response.data);
      } else if (Array.isArray(response)) {
        setLeaves(response);
      }
    } catch (err) {
      console.error('Error fetching leave requests:', err);
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
          setFormData((prev) => ({ ...prev, employee: response.data[0]._id }));
        }
      }
    } catch (err) {
      console.warn('Could not load employees:', err);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployeesList();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const response = await api.post('/leave-requests', formData);
      if (response.success) {
        setIsModalOpen(false);
        setFormData({
          employee: employees[0]?._id || '',
          type: 'annual',
          startDate: '',
          endDate: '',
          reason: ''
        });
        await fetchLeaveRequests();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (id, decision) => {
    try {
      const response = await api.patch(`/leave-requests/${id}/decision`, { decision });
      if (response.success) {
        setLeaves((prev) =>
          prev.map((item) => (item._id === id ? { ...item, decision } : item))
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to update leave decision');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary-500" />
            <span>{t('nav.leave')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.4 • Employee leave requests, multi-level approval workflows, and status tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLeaveRequests}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh leaves"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('actions.createLeave')}</span>
          </button>
        </div>
      </div>

      {/* Leave Request List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Fetching leave requests from live API...
        </div>
      ) : leaves.length === 0 ? (
        <EmptyState
          title="No leave requests filed"
          message="No employee has submitted a leave application yet. Click the button above to request time off."
          actionText={t('actions.createLeave')}
          onAction={() => setIsModalOpen(true)}
          icon={CalendarDays}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {leaves.map((leave) => (
              <div 
                key={leave._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {leave.employee?.fullName || 'Employee'}
                    </h3>
                    <p className="text-xs text-primary-500 font-semibold capitalize">{leave.type} Leave</p>
                  </div>
                  <Badge status={leave.decision} text={leave.decision} />
                </div>

                <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                  <div>
                    <span className="text-slate-400">Duration:</span>{' '}
                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                  </div>
                  {leave.reason && (
                    <div>
                      <span className="text-slate-400">Reason:</span> {leave.reason}
                    </div>
                  )}
                </div>

                {canDecide && leave.decision === 'pending' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      onClick={() => handleDecision(leave._id, 'accepted')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('actions.approve')}</span>
                    </button>
                    <button
                      onClick={() => handleDecision(leave._id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t('actions.reject')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3">{t('table.employee')}</th>
                  <th className="px-4 py-3">{t('leave type')}</th>
                  <th className="px-4 py-3">{t('start date')}</th>
                  <th className="px-4 py-3">{t('end date')}</th>
                  <th className="px-4 py-3">{t('table.reason')}</th>
                  <th className="px-4 py-3">{t('table.status')}</th>
                  {canDecide && <th className="px-4 py-3 text-right">{t('table.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {leaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {leave.employee?.fullName || 'Employee'}
                    </td>
                    <td className="px-4 py-3 capitalize font-medium text-slate-700 dark:text-slate-300">
                      {leave.type}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(leave.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {leave.reason || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={leave.decision} text={leave.decision} />
                    </td>
                    {canDecide && (
                      <td className="px-4 py-3 text-right space-x-2">
                        {leave.decision === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleDecision(leave._id, 'accepted')}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg transition"
                            >
                              {t('actions.approve')}
                            </button>
                            <button
                              onClick={() => handleDecision(leave._id, 'rejected')}
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded-lg transition"
                            >
                              {t('actions.reject')}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">Decided</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createLeave')}
        maxWidth="max-w-lg"
      >
        {formError && (
          <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleApplyLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee *
            </label>
            <select
              required
              value={formData.employee}
              onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Leave Category *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="annual">Annual Leave (የዓመት ፈቃድ)</option>
              <option value="sick">Sick Leave (የሕመም ፈቃድ)</option>
              <option value="emergency">Emergency Leave (የድንገተኛ ፈቃድ)</option>
              <option value="maternity">Maternity/Paternity (የወሊድ ፈቃድ)</option>
              <option value="casual">Casual Leave (ጊዜያዊ ፈቃድ)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Justification
            </label>
            <textarea
              rows="3"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Provide reason for leave..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
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
              {submitting ? 'Submitting...' : t('actions.submit')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
