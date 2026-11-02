import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import { FileCheck2, Plus, CheckCircle2, Circle, RefreshCw } from 'lucide-react';

export default function Clearances() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canApprove = hasRole(['admin', 'hr']);

  const [clearances, setClearances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employee: '',
    reason: 'Contract completion'
  });

  const fetchClearances = async () => {
    setLoading(true);
    try {
      const response = await api.get('/clearances');
      if (response.success && Array.isArray(response.data)) {
        setClearances(response.data);
      } else if (Array.isArray(response)) {
        setClearances(response);
      }
    } catch (err) {
      console.error('Error fetching clearances:', err);
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
    fetchClearances();
    fetchEmployeesList();
  }, []);

  const handleInitiateClearance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post('/clearances', formData);
      if (response.success) {
        setIsModalOpen(false);
        await fetchClearances();
      }
    } catch (err) {
      alert(err.message || 'Failed to initiate clearance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleChecklist = async (clearanceId, itemId, currentStatus) => {
    try {
      const response = await api.patch(`/clearances/${clearanceId}/checklist/${itemId}`, {
        isConfirmed: !currentStatus
      });
      if (response.success) {
        await fetchClearances();
      }
    } catch (err) {
      alert(err.message || 'Checklist update failed');
    }
  };

  const handleFinalApproval = async (clearanceId) => {
    try {
      const response = await api.patch(`/clearances/${clearanceId}/final-approval`);
      if (response.success) {
        await fetchClearances();
      }
    } catch (err) {
      alert(err.message || 'Final approval failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-primary-500" />
            <span>{t('nav.clearances')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.7 • Employee resignation clearance, property return, financial signoffs, and HR approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchClearances}
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
            <span>{t('actions.createClearance')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading exit clearance records...
        </div>
      ) : clearances.length === 0 ? (
        <EmptyState
          title="No clearance procedures active"
          message="No employee has initiated resignation or termination clearance. Click above to start a clearance workflow."
          actionText={t('actions.createClearance')}
          onAction={() => setIsModalOpen(true)}
          icon={FileCheck2}
        />
      ) : (
        <div className="space-y-4">
          {clearances.map((item) => (
            <div 
              key={item._id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700/80">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {item.employee?.fullName || 'Employee'}
                  </h3>
                  <div className="text-xs text-slate-400">
                    {item.employee?.department} • Reason: <span className="font-medium text-slate-600 dark:text-slate-300">{item.reason}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge status={item.status} text={item.status} />
                  {item.status !== 'approved' && canApprove && (
                    <button
                      onClick={() => handleFinalApproval(item._id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      Grant Final HR Approval
                    </button>
                  )}
                </div>
              </div>

              {/* Department Checklist Verification */}
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Multi-Department Signoff Checklist
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {item.checklist?.map((chk) => (
                    <button
                      key={chk._id}
                      onClick={() => handleToggleChecklist(item._id, chk._id, Boolean(chk.confirmedBy))}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                        chk.confirmedBy
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:border-primary-500/50'
                      }`}
                    >
                      {chk.confirmedBy ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="text-xs font-bold">{chk.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {chk.confirmedBy ? 'Verified & Signed Off' : 'Pending Verification'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createClearance')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleInitiateClearance} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Resigning / Terminating Employee
            </label>
            <select
              required
              value={formData.employee}
              onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.department} - {emp.position})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Clearance
            </label>
            <textarea
              rows="3"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. End of contract / Resignation notice"
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
              {submitting ? 'Starting...' : 'Start Workflow'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
