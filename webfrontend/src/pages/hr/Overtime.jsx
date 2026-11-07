import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import ApprovalHistoryModal from '../../components/common/ApprovalHistoryModal';
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
  Check,
  History,
  Sparkles,
  Clock
} from 'lucide-react';

export default function Overtime() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr', 'manager']);
  const canReview = hasRole(['admin', 'hr', 'manager']);
  const canPay = hasRole(['admin', 'hr', 'finance']);

  const [overtimes, setOvertimes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Company HR settings & Holiday Calendar integration
  const [companySetting, setCompanySetting] = useState(null);
  const [holidays, setHolidays] = useState([]);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterEmp, setFilterEmp] = useState('all');
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  // Modal: Log Overtime
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    employee: '',
    startAt: '',
    startTime: '',
    endTime: '',
    workedHours: '',
    reason: '',
    type: 'calendar',
    calculationRate: 0,
    isPreApproved: true
  });

  // Calculate worked hours from start and end time
  const calculateDurationHours = (start, end) => {
    if (!start || !end) return null;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
    let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMinutes < 0) {
      // Overtime crosses midnight into the next morning
      diffMinutes += 24 * 60;
    }
    return Number((diffMinutes / 60).toFixed(2));
  };

  const handleStartTimeChange = (val) => {
    setFormData((prev) => {
      const hours = calculateDurationHours(val, prev.endTime);
      return {
        ...prev,
        startTime: val,
        workedHours: hours !== null && hours > 0 ? hours : prev.workedHours
      };
    });
  };

  const handleEndTimeChange = (val) => {
    setFormData((prev) => {
      const hours = calculateDurationHours(prev.startTime, val);
      return {
        ...prev,
        endTime: val,
        workedHours: hours !== null && hours > 0 ? hours : prev.workedHours
      };
    });
  };

  // Modal: View Details
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOvertime, setSelectedOvertime] = useState(null);

  // Attendance Link Verification State
  const [attendanceLookup, setAttendanceLookup] = useState(null);
  const [lookingUpAttendance, setLookingUpAttendance] = useState(false);

  // Modal: Review Decision (Approve / Reject with remarks)
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState('approved'); // 'approved' | 'rejected'
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionApprovedHours, setDecisionApprovedHours] = useState('');
  const [decidingOvertime, setDecidingOvertime] = useState(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);

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

  const fetchSettingsAndHolidays = async () => {
    try {
      const [settingsRes, holidaysRes] = await Promise.allSettled([
        api.get('/company-settings'),
        api.get('/company-settings/holidays')
      ]);
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setCompanySetting(settingsRes.value.data);
      }
      if (holidaysRes.status === 'fulfilled' && holidaysRes.value?.data) {
        setHolidays(Array.isArray(holidaysRes.value.data) ? holidaysRes.value.data : []);
      }
    } catch (err) {
      console.warn('Could not load company settings or holidays:', err);
    }
  };

  useEffect(() => {
    fetchOvertimes();
    fetchEmployeesList();
    fetchSettingsAndHolidays();
  }, []);

  // Dynamic Overtime Types from company settings multipliers
  const overtimeTypes = useMemo(() => {
    const reg = companySetting?.payrollSettings?.overtimeRateRegular;
    const wkd = companySetting?.payrollSettings?.overtimeRateWeekend;
    const hol = companySetting?.payrollSettings?.overtimeRateHoliday;
    return [
      { value: 'calendar', label: reg ? `Standard Working Day (${reg}x)` : 'Standard Working Day', rate: reg || 0 },
      { value: 'weekend', label: wkd ? `Weekend / Rest Day (${wkd}x)` : 'Weekend / Rest Day', rate: wkd || 0 },
      { value: 'holiday', label: hol ? `Public Holiday (${hol}x)` : 'Public Holiday', rate: hol || 0 }
    ];
  }, [companySetting]);

  // When opening modal, initialize employee and rate dynamically from policy
  useEffect(() => {
    if (isModalOpen) {
      setFormError('');
      const defaultRate = companySetting?.payrollSettings?.overtimeRateRegular ?? 0;
      const defaultStart = companySetting?.workSchedule?.standardEndTime || '';
      if (!canManage) {
        setFormData((prev) => ({
          ...prev,
          employee: currentEmployee?._id || '',
          startTime: prev.startTime || defaultStart,
          type: prev.type || 'calendar',
          calculationRate: prev.calculationRate || defaultRate
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          employee: prev.employee || currentEmployee?._id || employees[0]?._id || '',
          startTime: prev.startTime || defaultStart,
          type: prev.type || 'calendar',
          calculationRate: prev.calculationRate || defaultRate
        }));
      }
    }
  }, [isModalOpen, currentEmployee, canManage, employees, companySetting]);

  // Handle type change and auto-select calculation rate from policy
  const handleTypeChange = (newType) => {
    const selected = overtimeTypes.find((t) => t.value === newType);
    const rate = selected ? selected.rate : (companySetting?.payrollSettings?.overtimeRateRegular ?? 0);
    setFormData((prev) => ({
      ...prev,
      type: newType,
      calculationRate: rate
    }));
  };

  // Check linked attendance for chosen date and auto-fill overtime
  const handleCheckAttendance = async (dateVal, empIdVal) => {
    const d = dateVal || formData.startAt;
    const emp = empIdVal || (canManage ? formData.employee : currentEmployee?._id);
    if (!d || !emp) return;
    setLookingUpAttendance(true);
    try {
      const res = await api.get(`/overtimes/attendance-lookup?employee=${emp}&date=${d}`);
      if (res.success && res.data) {
        setAttendanceLookup(res.data);
        if (res.data.attendance) {
          const extra = res.data.attendance.suggestedExtraHours;
          let suggestedStartTime = formData.startTime;
          let suggestedEndTime = formData.endTime;

          if (res.data.attendance.endTime) {
            const outDate = new Date(res.data.attendance.endTime);
            if (!isNaN(outDate.getTime())) {
              suggestedStartTime = `${String(outDate.getHours()).padStart(2, '0')}:${String(outDate.getMinutes()).padStart(2, '0')}`;
              if (extra > 0) {
                const totalMinutes = outDate.getHours() * 60 + outDate.getMinutes() + Math.round(extra * 60);
                const endH = Math.floor(totalMinutes / 60) % 24;
                const endM = totalMinutes % 60;
                suggestedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
              }
            }
          }

          setFormData((prev) => ({
            ...prev,
            startTime: suggestedStartTime,
            endTime: suggestedEndTime,
            workedHours: extra > 0 ? extra : prev.workedHours,
            type: res.data.attendance.suggestedType || prev.type,
            calculationRate: res.data.attendance.suggestedRate || prev.calculationRate
          }));
        } else if (res.data.suggestedType) {
          setFormData((prev) => ({
            ...prev,
            type: res.data.suggestedType,
            calculationRate: res.data.suggestedRate
          }));
        }
      } else {
        setAttendanceLookup(null);
      }
    } catch (err) {
      console.warn('Attendance lookup err:', err);
    } finally {
      setLookingUpAttendance(false);
    }
  };

  const handleDateChange = (val) => {
    setFormData((prev) => {
      let nextType = prev.type;
      let nextRate = prev.calculationRate;

      if (val) {
        const targetDate = new Date(val);
        const dateStr = targetDate.toISOString().split('T')[0];
        const monthDayStr = dateStr.slice(5);

        const holidayMatch = holidays.find((h) => {
          if (!h.isActive) return false;
          const hDate = new Date(h.date).toISOString().split('T')[0];
          return hDate === dateStr || (h.isRecurringYearly && hDate.slice(5) === monthDayStr);
        });

        const workingDays = companySetting?.workSchedule?.workingDays || [1, 2, 3, 4, 5];
        const isRestDay = !workingDays.includes(targetDate.getDay());

        const reg = companySetting?.payrollSettings?.overtimeRateRegular ?? 0;
        const wkd = companySetting?.payrollSettings?.overtimeRateWeekend ?? 0;
        const hol = companySetting?.payrollSettings?.overtimeRateHoliday ?? 0;

        if (holidayMatch) {
          nextType = 'holiday';
          nextRate = hol;
        } else if (isRestDay) {
          nextType = 'weekend';
          nextRate = wkd;
        } else {
          nextType = 'calendar';
          nextRate = reg;
        }
      }

      return {
        ...prev,
        startAt: val,
        type: nextType,
        calculationRate: nextRate
      };
    });

    handleCheckAttendance(val);
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
      setFormError('Please select the date.');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setFormError('Please provide both Start Time and End Time.');
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
        startTime: formData.startTime,
        endTime: formData.endTime,
        workedHours: Number(formData.workedHours),
        calculationRate: Number(formData.calculationRate)
      };

      const response = await api.post('/overtimes', payload);
      if (response.success) {
        setIsModalOpen(false);
        setFormData({
          employee: canManage ? (employees[0]?._id || '') : (currentEmployee?._id || ''),
          startAt: '',
          startTime: companySetting?.workSchedule?.standardEndTime || '',
          endTime: '',
          workedHours: '',
          reason: '',
          type: 'calendar',
          calculationRate: companySetting?.payrollSettings?.overtimeRateRegular || 0,
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

  // Open Decision Prompt Modal (Approve or Reject with reason)
  const openDecisionModal = (overtime, type) => {
    setDecidingOvertime(overtime);
    setDecisionType(type);
    setDecisionReason('');
    setDecisionApprovedHours(overtime.workedHours !== undefined ? String(overtime.workedHours) : '');
    setDecisionModalOpen(true);
  };

  // Execute Review Decision (Approve / Reject with remarks)
  const handleExecuteDecision = async (e) => {
    e.preventDefault();
    if (!decidingOvertime) return;

    if (decisionType === 'rejected' && !decisionReason.trim()) {
      alert('Please provide a reason for rejecting the overtime request.');
      return;
    }

    setSubmittingDecision(true);
    try {
      const approvedHoursVal = decisionType === 'approved'
        ? (decisionApprovedHours !== '' ? Number(decisionApprovedHours) : decidingOvertime.workedHours)
        : 0;

      const response = await api.patch(`/overtimes/${decidingOvertime._id}/review`, {
        status: decisionType,
        approvedHours: approvedHoursVal,
        decisionReason: decisionReason.trim()
      });

      if (response.success) {
        setDecisionModalOpen(false);
        const updatedRecord = response.data;
        setOvertimes((prev) =>
          prev.map((o) => (o._id === decidingOvertime._id ? updatedRecord : o))
        );
        if (selectedOvertime?._id === decidingOvertime._id) {
          setSelectedOvertime(updatedRecord);
        }
      }
    } catch (err) {
      alert(err.message || `Failed to ${decisionType} overtime`);
    } finally {
      setSubmittingDecision(false);
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
            Extra hours tracking, company policy multipliers, and approval workflow.
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

      {/* Overtime Policy Multipliers Status Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 font-semibold">
            <Clock className="w-3.5 h-3.5 text-primary-500" />
            <span>
              {t('Standard Day')}:{' '}
              <strong className="text-slate-800 dark:text-slate-100">
                {companySetting?.payrollSettings?.overtimeRateRegular ? `${companySetting.payrollSettings.overtimeRateRegular}x` : '—'}
              </strong>
            </span>
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span>
            {t('Weekend / Rest Day')}:{' '}
            <strong className="text-slate-800 dark:text-slate-100">
              {companySetting?.payrollSettings?.overtimeRateWeekend ? `${companySetting.payrollSettings.overtimeRateWeekend}x` : '—'}
            </strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {t('Public Holiday')}:{' '}
              <strong className="text-amber-700 dark:text-amber-300">
                {companySetting?.payrollSettings?.overtimeRateHoliday ? `${companySetting.payrollSettings.overtimeRateHoliday}x` : '—'}
              </strong>
            </span>
          </span>
        </div>
        {companySetting?.workSchedule?.standardDailyHours && (
          <span className="text-[11px] text-slate-400">
            {t('Standard Shift Threshold')}: {companySetting.workSchedule.standardDailyHours} hrs/day
          </span>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <Filter className="w-3.5 h-3.5" />
          <span>{t('Filters')}:</span>
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
        >
          <option value="all">{t('All Statuses')}</option>
          <option value="pending">{t('status.pending')}</option>
          <option value="approved">{t('status.approved')}</option>
          <option value="rejected">{t('status.rejected')}</option>
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium capitalize"
        >
          <option value="all">{t('All Overtime Types')}</option>
          {overtimeTypes.map((ot) => (
            <option key={ot.value} value={ot.value}>
              {t(ot.label)}
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
            <option value="all">{t('All Staff')} ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp._id} value={emp._id}>
                {emp.fullName} ({t(emp.department)})
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
            {t('Reset Filters')}
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
                    <span className="text-slate-400 font-medium">Date & Time:</span>{' '}
                    <span className="font-mono font-medium">{new Date(item.startAt).toLocaleDateString()}</span>
                    {(item.startTime || item.endTime) && (
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-primary-500 shrink-0" />
                        <span>{item.startTime || '—'} – {item.endTime || '—'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {item.reason && (
                  <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg">
                    <span className="font-medium text-slate-400">Reason:</span> {item.reason}
                  </div>
                )}

                {item.decisionReason && (
                  <div
                    className={`p-2 rounded-lg text-[11px] font-medium border ${
                      item.status === 'rejected'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/60'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/60'
                    }`}
                  >
                    <span className="font-bold">
                      {item.status === 'rejected' ? 'Rejection Reason:' : 'Approval Remarks:'}
                    </span>{' '}
                    {item.decisionReason}
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
                    <button
                      onClick={() => setActiveHistoryId(item._id)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition"
                      title="View Approval Audit Trail"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    {canReview && item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openDecisionModal(item, 'approved')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => openDecisionModal(item, 'rejected')}
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
                  <th className="px-4 py-3.5">{t('table.employee')}</th>
                  <th className="px-4 py-3.5">{t('Date & Time')}</th>
                  <th className="px-4 py-3.5">{t('table.type')}</th>
                  <th className="px-4 py-3.5 text-center">{t('Hours Worked')}</th>
                  <th className="px-4 py-3.5 text-center">{t('Calculation Rate')}</th>
                  <th className="px-4 py-3.5">{t('Reason / Project')}</th>
                  <th className="px-4 py-3.5 text-center">{t('Approval')}</th>
                  <th className="px-4 py-3.5 text-center">{t('Payment')}</th>
                  <th className="px-4 py-3.5 text-right">{t('table.actions')}</th>
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
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      <div className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {new Date(item.startAt).toLocaleDateString()}
                      </div>
                      {(item.startTime || item.endTime || (item.startAt && new Date(item.startAt).getHours() !== 0)) && (
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5 whitespace-nowrap">
                          <Clock className="w-3 h-3 text-primary-500 shrink-0" />
                          <span>
                            {item.startTime || new Date(item.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {' – '}
                            {item.endTime || (item.endAt ? new Date(item.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—')}
                          </span>
                        </div>
                      )}
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

                        <button
                          onClick={() => setActiveHistoryId(item._id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                          title="View Approval Audit Trail"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {canReview && item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openDecisionModal(item, 'approved')}
                              className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 rounded-lg transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openDecisionModal(item, 'rejected')}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.startAt}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hours Worked (Duration) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  required
                  value={formData.workedHours}
                  onChange={(e) => setFormData({ ...formData, workedHours: e.target.value })}
                  placeholder="e.g. 2.5"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-bold"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">hrs</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Decimals allowed (e.g. 1.5 = 1 hr 30m, 2.75 = 2 hrs 45m).
              </p>
            </div>
          </div>

          {/* Start Time & End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-500" />
                Start Time *
              </label>
              <input
                type="time"
                required
                value={formData.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary-500" />
                End Time *
              </label>
              <input
                type="time"
                required
                value={formData.endTime}
                onChange={(e) => handleEndTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-mono font-medium"
              />
            </div>
          </div>

          {/* Linked Attendance Verification Info Banner */}
          {lookingUpAttendance ? (
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-400 animate-pulse">
              Checking shift attendance records for this date...
            </div>
          ) : attendanceLookup ? (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-900 dark:text-blue-200 flex items-center justify-between gap-2">
              <div>
                <span className="font-bold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Linked Attendance Shift Found
                </span>
                <p className="text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">
                  Clocked In: {attendanceLookup.startTime ? new Date(attendanceLookup.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} – Clocked Out: {attendanceLookup.endTime ? new Date(attendanceLookup.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In progress'} ({attendanceLookup.workedHours}h shift).
                </p>
              </div>
              {attendanceLookup.suggestedOvertime > 0 && (
                <div className="px-2.5 py-1 bg-blue-600 text-white font-bold rounded-lg text-[11px] whitespace-nowrap shadow-xs">
                  +{attendanceLookup.suggestedOvertime}h Overtime
                </div>
              )}
            </div>
          ) : formData.startAt ? (
            <div className="text-[11px] text-slate-400 italic">
              No attendance shift recorded on this date. You may still manually submit with supervisor pre-approval.
            </div>
          ) : null}

          {/* Public Holiday Banner if detected */}
          {(attendanceLookup?.holiday || holidays.find(h => {
            if (!h.isActive || !formData.startAt) return false;
            const hDate = new Date(h.date).toISOString().split('T')[0];
            return hDate === formData.startAt || (h.isRecurringYearly && hDate.slice(5) === formData.startAt.slice(5));
          })) && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Public Holiday:</strong> {attendanceLookup?.holiday?.title || holidays.find(h => new Date(h.date).toISOString().split('T')[0] === formData.startAt)?.title || 'Holiday'}. Holiday multiplier ({companySetting?.payrollSettings?.overtimeRateHoliday ? `${companySetting.payrollSettings.overtimeRateHoliday}x` : 'policy'} rate) automatically applied.
              </span>
            </div>
          )}

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
                {overtimeTypes.map((ot) => (
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
                  {new Date(selectedOvertime.startAt).toLocaleDateString()}
                </span>
              </div>
              {(selectedOvertime.startTime || selectedOvertime.endTime) && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Time Window:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-500" />
                    {selectedOvertime.startTime || '—'} – {selectedOvertime.endTime || '—'}
                  </span>
                </div>
              )}
              {selectedOvertime.reason && (
                <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5">
                  <span className="text-slate-400 font-medium">Reason / Project:</span>
                  <p className="mt-0.5 text-slate-700 dark:text-slate-300 font-medium">
                    {selectedOvertime.reason}
                  </p>
                </div>
              )}
            </div>

            {/* Review Decision Remarks / Rejection Reason Callout */}
            {selectedOvertime.status !== 'pending' && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  selectedOvertime.status === 'rejected'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {selectedOvertime.status === 'rejected' ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      {selectedOvertime.status === 'rejected' ? 'Rejection Reason & Remarks' : 'Approval Remarks'}
                    </span>
                  </span>
                  <span className="text-[11px] font-normal opacity-75">
                    Reviewed by {selectedOvertime.approvedBy?.fullName || 'Manager'}
                    {selectedOvertime.reviewedAt && ` • ${new Date(selectedOvertime.reviewedAt).toLocaleDateString()}`}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed pl-5">
                  {selectedOvertime.decisionReason ||
                    (selectedOvertime.status === 'rejected'
                      ? 'No formal rejection reason recorded.'
                      : 'Overtime approved.')}
                </p>
              </div>
            )}

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
                      onClick={() => openDecisionModal(selectedOvertime, 'approved')}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openDecisionModal(selectedOvertime, 'rejected')}
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

      {/* Modal: Review Decision Prompt Modal */}
      {decidingOvertime && (
        <Modal
          isOpen={decisionModalOpen}
          onClose={() => setDecisionModalOpen(false)}
          title={decisionType === 'approved' ? 'Approve Overtime Request' : 'Reject Overtime Request'}
          maxWidth="max-w-md"
          zIndex="z-60"
        >
          <form onSubmit={handleExecuteDecision} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">Target Staff:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {decidingOvertime.employee?.fullName}
              </span>{' '}
              • <span className="capitalize">{decidingOvertime.type}</span> Overtime ({decidingOvertime.workedHours} hrs @ {decidingOvertime.calculationRate}x)
            </div>

            {decisionType === 'approved' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Approved Hours (Decimal hours allowed, e.g. 1.5, 2.75) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={decisionApprovedHours}
                    onChange={(e) => setDecisionApprovedHours(e.target.value)}
                    placeholder="e.g. 2.5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">hrs</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {decisionType === 'rejected' ? 'Rejection Reason *' : 'Approval Remarks (Optional)'}
              </label>
              <textarea
                required={decisionType === 'rejected'}
                rows="3"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={
                  decisionType === 'rejected'
                    ? 'State the reason for rejecting this overtime request (required for employee notice)...'
                    : 'Add any remarks or authorization notes...'
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDecisionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submittingDecision || (decisionType === 'rejected' && !decisionReason.trim())}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition disabled:opacity-50 ${
                  decisionType === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingDecision
                  ? 'Processing...'
                  : decisionType === 'approved'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Approval Audit Trail Modal */}
      <ApprovalHistoryModal
        isOpen={Boolean(activeHistoryId)}
        onClose={() => setActiveHistoryId(null)}
        referenceType="overtime"
        referenceId={activeHistoryId}
        title="Overtime Approval Audit Trail"
      />
    </div>
  );
}
