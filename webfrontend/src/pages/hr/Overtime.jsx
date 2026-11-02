import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import { Timer, Plus, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function Overtime() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canReview = hasRole(['admin', 'hr', 'manager']);
  const canPay = hasRole(['admin', 'hr', 'finance']);

  const [overtimes, setOvertimes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee: '',
    startAt: '',
    workedHours: 2,
    reason: 'Urgent production offset run',
    type: 'calendar',
    calculationRate: 1.5,
    isPreApproved: true
  });

  const fetchOvertimes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/overtimes');
      if (response.success && Array.isArray(response.data)) {
        setOvertimes(response.data);
      } else if (Array.isArray(response)) {
        setOvertimes(response);
      }
    } catch (err) {
      console.error('Error fetching overtimes:', err);
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
    fetchOvertimes();
    fetchEmployeesList();
  }, []);

  const handleCreateOvertime = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        workedHours: Number(formData.workedHours),
        calculationRate: Number(formData.calculationRate)
      };
      const response = await api.post('/overtimes', payload);
      if (response.success) {
        setIsModalOpen(false);
        await fetchOvertimes();
      }
    } catch (err) {
      alert(err.message || 'Failed to submit overtime');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id, status, workedHours) => {
    try {
      const response = await api.patch(`/overtimes/${id}/review`, {
        status,
        approvedHours: status === 'approved' ? workedHours : 0
      });
      if (response.success) {
        setOvertimes((prev) =>
          prev.map((o) => (o._id === id ? { ...o, status, approvedHours: status === 'approved' ? workedHours : 0 } : o))
        );
      }
    } catch (err) {
      alert(err.message || 'Review update failed');
    }
  };

  const handlePayment = async (id, paymentStatus) => {
    try {
      const response = await api.patch(`/overtimes/${id}/payment`, { paymentStatus });
      if (response.success) {
        setOvertimes((prev) =>
          prev.map((o) => (o._id === id ? { ...o, paymentStatus } : o))
        );
      }
    } catch (err) {
      alert(err.message || 'Payment update failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Timer className="w-6 h-6 text-primary-500" />
            <span>{t('nav.overtime')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.9 • Extra hours logging, rate calculation (1x, 1.5x, 2x), and payroll integration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOvertimes}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('actions.createOvertime')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading overtime records...
        </div>
      ) : overtimes.length === 0 ? (
        <EmptyState
          title="No overtime records logged"
          message="No overtime worked or logged yet. Submit an overtime slip above."
          actionText={t('actions.createOvertime')}
          onAction={() => setIsModalOpen(true)}
          icon={Timer}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {overtimes.map((item) => (
              <div 
                key={item._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.employee?.fullName || 'Employee'}
                    </h3>
                    <p className="text-xs text-slate-400">{item.reason}</p>
                  </div>
                  <div className="space-x-1">
                    <Badge status={item.status} text={item.status} />
                    <Badge status={item.paymentStatus} text={item.paymentStatus} />
                  </div>
                </div>

                <div className="text-xs grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                  <div>
                    <span className="text-slate-400">Hours:</span> {item.workedHours} hrs ({item.calculationRate}x)
                  </div>
                  <div>
                    <span className="text-slate-400">Date:</span> {new Date(item.startAt).toLocaleDateString()}
                  </div>
                </div>

                {canReview && item.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      onClick={() => handleReview(item._id, 'approved', item.workedHours)}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(item._id, 'rejected', 0)}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold"
                    >
                      Reject
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
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Hours Worked</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {overtimes.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {item.employee?.fullName || 'Employee'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{new Date(item.startAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{item.workedHours} hrs</td>
                    <td className="px-4 py-3 text-primary-500 font-semibold">{item.calculationRate}x</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{item.reason}</td>
                    <td className="px-4 py-3">
                      <Badge status={item.status} text={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={item.paymentStatus} text={item.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      {canReview && item.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(item._id, 'approved', item.workedHours)}
                            className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(item._id, 'rejected', 0)}
                            className="px-2 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {canPay && item.status === 'approved' && item.paymentStatus === 'unpaid' && (
                        <button
                          onClick={() => handlePayment(item._id, 'paid')}
                          className="px-2 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createOvertime')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateOvertime} className="space-y-4">
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
                Date & Start Time
              </label>
              <input
                type="date"
                required
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hours Worked
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={formData.workedHours}
                onChange={(e) => setFormData({ ...formData, workedHours: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="calendar">Standard (1.5x)</option>
                <option value="weekend">Weekend (1.5x)</option>
                <option value="holiday">Public Holiday (2.0x)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Calculation Rate
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.calculationRate}
                onChange={(e) => setFormData({ ...formData, calculationRate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Printing Project
            </label>
            <input
              type="text"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Rush catalog printing run"
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
