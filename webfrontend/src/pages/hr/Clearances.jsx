import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import ApprovalHistoryModal from '../../components/common/ApprovalHistoryModal';
import api from '../../services/api';
import { FileCheck2, Plus, CheckCircle2, Circle, RefreshCw, AlertCircle, History } from 'lucide-react';

export default function Clearances() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const canApprove = hasRole(['admin', 'hr']);

  const [clearances, setClearances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
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
      }
    } catch (err) {
      console.warn('Could not load employees:', err);
    }
  };

  useEffect(() => {
    fetchClearances();
    fetchEmployeesList();
  }, []);

  // Find logged-in user's employee record
  const myEmployee = employees.find(
    (e) =>
      (e.user && (e.user === user?._id || e.user?._id === user?._id)) ||
      (e.email && e.email.toLowerCase() === user?.email?.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    setFormError('');
    if (!canApprove) {
      setFormData({
        employee: myEmployee?._id || '',
        reason: 'Contract completion / Resignation notice'
      });
    } else {
      setFormData({
        employee: employees[0]?._id || '',
        reason: 'Contract completion / Resignation notice'
      });
    }
    setIsModalOpen(true);
  };

  const handleInitiateClearance = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const targetEmployeeId = canApprove
        ? formData.employee
        : myEmployee?._id || formData.employee;

      if (!targetEmployeeId) {
        setFormError('Your employee profile could not be found to start clearance.');
        setSubmitting(false);
        return;
      }

      const response = await api.post('/clearances', {
        employee: targetEmployeeId,
        reason: formData.reason
      });

      if (response.success) {
        setIsModalOpen(false);
        await fetchClearances();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to initiate clearance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleChecklist = async (clearanceId, itemId, currentStatus) => {
    if (!canApprove) return;
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
      const response = await api.patch(`/clearances/${clearanceId}/final-approval`, {
        finalApprovedBy: user?._id,
        status: 'approved'
      });
      if (response.success) {
        await fetchClearances();
      }
    } catch (err) {
      alert(err.message || 'Final approval failed');
    }
  };

  // Helper: check if all checklist items are verified
  const isAllChecklistCleared = (item) => {
    if (!item.checklist || item.checklist.length === 0) return false;
    return item.checklist.every(
      (chk) => chk.status === 'cleared' || Boolean(chk.confirmedBy)
    );
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
            onClick={handleOpenCreateModal}
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
          message={
            canApprove
              ? 'No employee has initiated resignation or termination clearance. Click above to start a clearance workflow.'
              : 'You do not have any active exit clearance procedures.'
          }
          actionText={t('actions.createClearance')}
          onAction={handleOpenCreateModal}
          icon={FileCheck2}
        />
      ) : (
        <div className="space-y-4">
          {clearances.map((item) => {
            const allCleared = isAllChecklistCleared(item);
            const isAlreadyApproved =
              item.status === 'approved' || item.status === 'completed';

            return (
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
                      {item.employee?.department} • Reason:{' '}
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {item.reason}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Badge status={item.status} text={item.status} />

                    <button
                      type="button"
                      onClick={() => setActiveHistoryId(item._id)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
                      title="View Approval Audit Trail"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Final HR Approval Action */}
                    {canApprove && !isAlreadyApproved && (
                      <button
                        disabled={!allCleared}
                        onClick={() => handleFinalApproval(item._id)}
                        title={
                          allCleared
                            ? 'Grant final HR approval and finalize exit clearance'
                            : 'All checklist items must be signed off before granting final HR approval'
                        }
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition flex items-center gap-1.5 ${
                          allCleared
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Grant Final HR Approval</span>
                      </button>
                    )}

                    {isAlreadyApproved && (
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>HR Approved & Finalized</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Department Checklist Verification */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Multi-Department Signoff Checklist
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {item.checklist?.filter((c) => c.status === 'cleared' || c.confirmedBy).length || 0}{' '}
                      of {item.checklist?.length || 0} signed off
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {item.checklist?.map((chk) => {
                      const isCleared = chk.status === 'cleared' || Boolean(chk.confirmedBy);

                      return (
                        <button
                          key={chk._id}
                          type="button"
                          disabled={!canApprove || isAlreadyApproved}
                          onClick={() => handleToggleChecklist(item._id, chk._id, isCleared)}
                          className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition ${
                            isCleared
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300'
                          } ${
                            canApprove && !isAlreadyApproved
                              ? 'hover:border-primary-500/50 cursor-pointer'
                              : 'cursor-default'
                          }`}
                        >
                          {isCleared ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="text-xs font-bold">{chk.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isCleared
                                ? `Signed Off${chk.confirmedBy?.fullName ? ` by ${chk.confirmedBy.fullName}` : ''}`
                                : 'Pending Verification'}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createClearance')}
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleInitiateClearance} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {canApprove ? 'Select Resigning / Terminating Employee *' : 'Resigning Employee'}
            </label>
            {canApprove ? (
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
            ) : (
              <input
                type="text"
                disabled
                value={
                  myEmployee
                    ? `${myEmployee.fullName} (${myEmployee.department} - ${myEmployee.position})`
                    : user?.fullName || 'Current Employee'
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-semibold opacity-90"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason for Clearance *
            </label>
            <textarea
              rows="3"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. End of employment contract / Resignation notice"
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

      {/* Approval Audit Trail Modal */}
      <ApprovalHistoryModal
        isOpen={Boolean(activeHistoryId)}
        onClose={() => setActiveHistoryId(null)}
        referenceType="clearance"
        referenceId={activeHistoryId}
        title="Exit Clearance Audit Trail"
      />
    </div>
  );
}
