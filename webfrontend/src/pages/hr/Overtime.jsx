import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  Timer,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Filter,
  Eye,
  AlertCircle,
  Calendar,
  Check
} from 'lucide-react';

const OVERTIME_TYPES = [
  { value: 'calendar', label: 'Standard Working Day (1.5x)', rate: 1.5 },
  { value: 'weekend', label: 'Weekend / Rest Day (2.0x)', rate: 2.0 },
  { value: 'holiday', label: 'Public Holiday (2.0x)', rate: 2.0 }
];

export default function Overtime() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr', 'manager']);
  const canReview = hasRole(['admin', 'hr', 'manager']);
  const canPay = hasRole(['admin', 'hr', 'finance']);

  const [overtimes, setOvertimes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterEmp, setFilterEmp] = useState('all');

  // Modal: Log Overtime
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    employee: '',
    startAt: '',
    workedHours: 2,
    reason: '',
    type: 'calendar',
    calculationRate: 1.5,
    isPreApproved: true
  });

  // Modal: View Details
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOvertime, setSelectedOvertime] = useState(null);

  // Identify current logged-in employee record
  const currentEmployee = useMemo(() => {
    return employees.find(
      (e) =>
        (user?.employee && (e._id === (user.employee._id || user.employee))) ||
        (e.user && (e.user._id || e.user) === user?._id) ||
        (e.email?.toLowerCase() === user?.email?.toLowerCase())
    );
  }, [employees, user]);

  const fetchOvertimes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/overtimes?limit=200');
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
      const response = await api.get('/employees?limit=300');
      if (response.success && Array.isArray(response.data)) {
        setEmployees(response.data);
      }
    } catch (err) {
      console.warn('Could not load employees:', err);
    }
  };

  useEffect(() => {
    fetchOvertimes();
    fetchEmployeesList();
  }, []);

  // When opening modal, initialize employee and rate
  useEffect(() => {
    if (isModalOpen) {
      setFormError('');
      if (!canManage) {
        setFormData((prev) => ({
          ...prev,
          employee: currentEmployee?._id || '',
          type: 'calendar',
          calculationRate: 1.5
        }));
      } else {
        if (!formData.employee && employees.length > 0) {
          setFormData((prev) => ({
            ...prev,
            employee: currentEmployee?._id || employees[0]._id,
            type: 'calendar',
            calculationRate: 1.5
          }));
        }
      }
    }
  }, [isModalOpen, currentEmployee, canManage, employees]);

  // Handle type change and auto-select calculation rate
  const handleTypeChange = (newType) => {
    const selected = OVERTIME_TYPES.find((t) => t.value === newType);
    const rate = selected ? selected.rate : 1.5;
    setFormData((prev) => ({
      ...prev,
      type: newType,
      calculationRate: rate
    }));
  };

  const handleCreateOvertime = async (e) => {
    e.preventDefault();
    setFormError('');

    const targetEmpId = canManage ? formData.employee : currentEmployee?._id;

    if (!targetEmpId) {
      setFormError('Your account is not linked to an employee profile. You cannot submit overtime.');
      return;
    }

    if (!formData.startAt) {
      setFormError('Please select the date and start time.');
      return;
    }

    if (!formData.workedHours || Number(formData.workedHours) <= 0) {
      setFormError('Hours worked must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        employee: targetEmpId,
        workedHours: Number(formData.workedHours),
        calculationRate: Number(formData.calculationRate)
      };

      const response = await api.post('/overtimes', payload);
      if (response.success) {
        setIsModalOpen(false);
        setFormData({
          employee: canManage ? employees[0]?._id || '' : currentEmployee?._id || '',
          startAt: '',
          workedHours: 2,
          reason: '',
          type: 'calendar',
          calculationRate: 1.5,
          isPreApproved: true
        });
        await fetchOvertimes();
      } else {
        setFormError(response.message || 'Failed to submit overtime');
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit overtime');
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
          prev.map((o) =>
            o._id === id
              ? {
                  ...o,
                  status,
                  approvedHours: status === 'approved' ? workedHours : 0
                }
              : o
          )
        );
        if (selectedOvertime?._id === id) {
          setSelectedOvertime((prev) => ({
            ...prev,
            status,
            approvedHours: status === 'approved' ? workedHours : 0
          }));
        }
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
        if (selectedOvertime?._id === id) {
          setSelectedOvertime((prev) => ({ ...prev, paymentStatus }));
        }
      }
    } catch (err) {
      alert(err.message || 'Payment update failed');
    }
  };

  // Filtered overtime records
  const filteredOvertimes = useMemo(() => {
    return overtimes.filter((item) => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (canManage && filterEmp !== 'all') {
        const empId = item.employee?._id || item.employee;
        if (empId !== filterEmp) return false;
      }
      return true;
    });
  }, [overtimes, filterStatus, filterType, filterEmp, canManage]);

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
            Section 2.9 • Extra hours logging, Ethiopian statutory rates (1.5x, 2.0x), and payroll integration.
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium capitalize"
        >
          <option value="all">All Overtime Types</option>
          {OVERTIME_TYPES.map((ot) => (
            <option key={ot.value} value={ot.value}>
              {ot.label}
            </option>
          ))}
        </select>

        {/* Employee Filter (HR / Admin only) */}
        {canManage && (
          <select
            value={filterEmp}
            onChange={(e) => setFilterEmp(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium max-w-xs truncate"
          >
            <option value="all">All Staff ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.fullName} ({emp.department})
              </option>
            ))}
          </select>
        )}

        {(filterStatus !== 'all' || filterType !== 'all' || filterEmp !== 'all') && (
          <button
            onClick={() => {
              setFilterStatus('all');
              setFilterType('all');
              setFilterEmp('all');
            }}
            className="text-[11px] text-primary-500 hover:underline font-bold ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading overtime records...
        </div>
      ) : filteredOvertimes.length === 0 ? (
        <EmptyState
          title="No overtime records logged"
          message={
            overtimes.length === 0
              ? 'No overtime worked or logged yet. Submit an overtime slip above.'
              : 'No overtime records match your selected filters.'
          }
          actionText={t('actions.createOvertime')}
          onAction={() => setIsModalOpen(true)}
          icon={Timer}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {filteredOvertimes.map((item) => (
              <div
                key={item._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {item.employee?.profileImage ? (
                      <img
                        src={item.employee.profileImage}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-bold flex items-center justify-center text-xs">
                        {item.employee?.fullName?.charAt(0) || 'E'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {item.employee?.fullName || 'Employee'}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {item.employee?.department} • {item.employee?.position}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge status={item.status} text={item.status} />
                    <Badge status={item.paymentStatus} text={item.paymentStatus} />
                  </div>
                </div>

                <div className="text-xs grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                  <div>
                    <span className="text-slate-400 font-medium">Hours:</span>{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {item.workedHours} hrs
                    </span>{' '}
                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                      ({item.calculationRate}x)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Date:</span>{' '}
                    <span className="font-mono">{new Date(item.startAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {item.reason && (
                  <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg">
                    <span className="font-medium text-slate-400">Reason:</span> {item.reason}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => {
                      setSelectedOvertime(item);
                      setDetailModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Details</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {canReview && item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleReview(item._id, 'approved', item.workedHours)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(item._id, 'rejected', 0)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {canPay && item.status === 'approved' && item.paymentStatus === 'unpaid' && (
                      <button
                        onClick={() => handlePayment(item._id, 'paid')}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3.5">Employee</th>
                  <th className="px-4 py-3.5">Date & Time</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-center">Hours Worked</th>
                  <th className="px-4 py-3.5 text-center">Calculation Rate</th>
                  <th className="px-4 py-3.5">Reason / Project</th>
                  <th className="px-4 py-3.5 text-center">Approval</th>
                  <th className="px-4 py-3.5 text-center">Payment</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredOvertimes.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {item.employee?.profileImage ? (
                          <img
                            src={item.employee.profileImage}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-bold flex items-center justify-center text-xs">
                            {item.employee?.fullName?.charAt(0) || 'E'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {item.employee?.fullName || 'Employee'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.employee?.department || 'Staff'} • {item.employee?.position || ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono">
                      {new Date(item.startAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 capitalize font-medium text-slate-700 dark:text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">
                        {item.type || 'calendar'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                      {item.workedHours} hrs
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="font-bold text-xs text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/60 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-900">
                        {item.calculationRate}x
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {item.reason || <span className="text-slate-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge status={item.status} text={item.status} />
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <Badge status={item.paymentStatus} text={item.paymentStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedOvertime(item);
                            setDetailModalOpen(true);
                          }}
                          title="View Details"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canReview && item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleReview(item._id, 'approved', item.workedHours)}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(item._id, 'rejected', 0)}
                              className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 rounded-lg transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {canPay && item.status === 'approved' && item.paymentStatus === 'unpaid' && (
                          <button
                            onClick={() => handlePayment(item._id, 'paid')}
                            className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 rounded-lg transition"
                          >
                            Mark Paid
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

      {/* Modal: Log Overtime */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createOvertime')}
        maxWidth="max-w-md"
      >
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateOvertime} className="space-y-4">
          {/* Employee Selection: Regular employees CANNOT select other employee */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee *
            </label>

            {canManage ? (
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
            ) : currentEmployee ? (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-3">
                {currentEmployee.profileImage ? (
                  <img
                    src={currentEmployee.profileImage}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-bold flex items-center justify-center text-xs">
                    {currentEmployee.fullName?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                    {currentEmployee.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {currentEmployee.department} • {currentEmployee.position} • {currentEmployee.email}
                  </div>
                </div>
                <span className="ml-auto text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Self
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-700 dark:text-amber-300">
                Your user account is not linked to an employee profile. You cannot request overtime until HR links your account.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date *
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
                Hours Worked *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={formData.workedHours}
                onChange={(e) => setFormData({ ...formData, workedHours: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-bold"
              />
            </div>
          </div>

          {/* Overtime Type and Calculation Rate (Auto-Selected & Disabled) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Overtime Category *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                {OVERTIME_TYPES.map((ot) => (
                  <option key={ot.value} value={ot.value}>
                    {ot.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Calculation Rate
              </label>
              <input
                type="text"
                disabled
                readOnly
                value={`${formData.calculationRate}x Multiplier`}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs sm:text-sm cursor-not-allowed select-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Printing Project *
            </label>
            <input
              type="text"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Urgent press offset run, packaging shift extension"
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
              disabled={submitting || (!canManage && !currentEmployee)}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : t('actions.submit')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Overtime Details */}
      {selectedOvertime && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Overtime Record Details"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            {/* Employee Header */}
            <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {selectedOvertime.employee?.profileImage ? (
                  <img
                    src={selectedOvertime.employee.profileImage}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-bold flex items-center justify-center text-base">
                    {selectedOvertime.employee?.fullName?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {selectedOvertime.employee?.fullName || 'Employee'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedOvertime.employee?.department} • {selectedOvertime.employee?.position}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedOvertime.employee?.email}
                    {selectedOvertime.employee?.nationalId && ` • ID: ${selectedOvertime.employee.nationalId}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <Badge status={selectedOvertime.status} text={selectedOvertime.status} />
                <Badge status={selectedOvertime.paymentStatus} text={selectedOvertime.paymentStatus} />
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Hours Worked</span>
                <div className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                  {selectedOvertime.workedHours} <span className="text-xs font-normal text-slate-400">hrs</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Calculation Rate</span>
                <div className="text-base font-black text-primary-600 dark:text-primary-400 mt-1">
                  {selectedOvertime.calculationRate}x
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Approved Hours</span>
                <div className="text-base font-black text-emerald-600 mt-1">
                  {selectedOvertime.approvedHours || 0} <span className="text-xs font-normal text-slate-400">hrs</span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Overtime Type:</span>
                <span className="capitalize font-bold text-slate-800 dark:text-slate-200">
                  {selectedOvertime.type || 'calendar'} Overtime
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Date:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {new Date(selectedOvertime.startAt).toLocaleString()}
                </span>
              </div>
              {selectedOvertime.reason && (
                <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
                  <span className="text-slate-400 font-medium">Reason / Project:</span>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-300 font-medium">
                    {selectedOvertime.reason}
                  </p>
                </div>
              )}
              {selectedOvertime.approvedBy && (
                <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5 flex justify-between">
                  <span className="text-slate-400 font-medium">Approved By:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {selectedOvertime.approvedBy?.fullName || 'Manager'}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {canReview && selectedOvertime.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleReview(selectedOvertime._id, 'approved', selectedOvertime.workedHours)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReview(selectedOvertime._id, 'rejected', 0)}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                {canPay && selectedOvertime.status === 'approved' && selectedOvertime.paymentStatus === 'unpaid' && (
                  <button
                    onClick={() => handlePayment(selectedOvertime._id, 'paid')}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Mark as Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
