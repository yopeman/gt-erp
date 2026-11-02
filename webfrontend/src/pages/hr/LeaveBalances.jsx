import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import { Scale, Plus, RefreshCw, SlidersHorizontal } from 'lucide-react';

export default function LeaveBalances() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr']);

  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [adjustmentDays, setAdjustmentDays] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee: '',
    year: new Date().getFullYear(),
    type: 'annual',
    total: 16,
    isPayable: true
  });

  const fetchBalances = async () => {
    setLoading(true);
    try {
      const response = await api.get('/leave-balances');
      if (response.success && Array.isArray(response.data)) {
        setBalances(response.data);
      } else if (Array.isArray(response)) {
        setBalances(response);
      }
    } catch (err) {
      console.error('Error fetching leave balances:', err);
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
    fetchBalances();
    fetchEmployeesList();
  }, []);

  const handleCreateBalance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/leave-balances', formData);
      if (response.success) {
        setIsModalOpen(false);
        await fetchBalances();
      }
    } catch (err) {
      alert(err.message || 'Failed to create leave balance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedBalance) return;
    setSubmitting(true);
    try {
      const response = await api.patch(`/leave-balances/${selectedBalance._id}/adjust`, {
        adjustment: Number(adjustmentDays),
        reason: adjustReason
      });
      if (response.success) {
        setIsAdjustOpen(false);
        await fetchBalances();
      }
    } catch (err) {
      alert(err.message || 'Failed to adjust leave balance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary-500" />
            <span>{t('nav.leaveBalances')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.4 • Annual, sick, and emergency leave allowances, used days, and remaining balances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchBalances}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh balances"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Initialize Balance</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading leave balances...
        </div>
      ) : balances.length === 0 ? (
        <EmptyState
          title="No leave balances configured"
          message="Initialize leave quotas for staff members for the current fiscal calendar year."
          actionText={canManage ? "Initialize Balance" : null}
          onAction={() => setIsModalOpen(true)}
          icon={Scale}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {balances.map((item) => (
              <div 
                key={item._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.employee?.fullName || 'Employee'}
                    </h3>
                    <p className="text-xs text-primary-500 font-semibold capitalize">
                      {item.type} Leave ({item.year})
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    {item.remaining} Days Left
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 text-xs text-center border-y border-slate-100 dark:border-slate-700/60">
                  <div>
                    <div className="text-slate-400 text-[10px]">Total</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{item.total}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Used</div>
                    <div className="font-bold text-amber-600">{item.totalUsed}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Remaining</div>
                    <div className="font-bold text-emerald-600">{item.remaining}</div>
                  </div>
                </div>

                {canManage && (
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setSelectedBalance(item);
                        setAdjustmentDays(0);
                        setIsAdjustOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition"
                    >
                      {t('actions.adjust')}
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
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Year</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3 text-center">Total Entitlement</th>
                  <th className="px-4 py-3 text-center">Used Days</th>
                  <th className="px-4 py-3 text-center">Remaining Days</th>
                  {canManage && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {balances.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {item.employee?.fullName || 'Employee'}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500">{item.year}</td>
                    <td className="px-4 py-3 capitalize font-medium text-slate-700 dark:text-slate-300">
                      {item.type}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      {item.total}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-amber-600">
                      {item.totalUsed}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-emerald-600">
                      {item.remaining}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedBalance(item);
                            setAdjustmentDays(0);
                            setIsAdjustOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition"
                        >
                          {t('actions.adjust')}
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

      {/* Initialize Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initialize Employee Leave Balance"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Calendar Year
              </label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Leave Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="annual">Annual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="emergency">Emergency Leave</option>
                <option value="casual">Casual Leave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Total Entitlement (Days)
            </label>
            <input
              type="number"
              required
              value={formData.total}
              onChange={(e) => setFormData({ ...formData, total: Number(e.target.value) })}
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
              {submitting ? 'Saving...' : t('actions.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Modal */}
      <Modal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Adjust Leave Days"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleAdjustBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Days (+ to add, - to subtract)
            </label>
            <input
              type="number"
              required
              value={adjustmentDays}
              onChange={(e) => setAdjustmentDays(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Adjustment Reason
            </label>
            <input
              type="text"
              required
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Carryover from last year"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Applying...' : 'Apply Adjustment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
