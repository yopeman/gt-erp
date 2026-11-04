import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import ApprovalHistoryModal from '../../components/common/ApprovalHistoryModal';
import api from '../../services/api';
import {
  CalendarDays,
  Scale,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  AlertCircle,
  User,
  SlidersHorizontal,
  Info,
  Calendar,
  Check,
  ShieldAlert,
  Search,
  Filter,
  History,
  Paperclip,
  ExternalLink,
  Ban,
  Layers,
  FileUp
} from 'lucide-react';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave (የዓመት ፈቃድ)', isPaid: true },
  { value: 'sick', label: 'Sick Leave (የሕመም ፈቃድ)', isPaid: true },
  { value: 'emergency', label: 'Emergency Leave (የድንገተኛ ፈቃድ)', isPaid: true },
  { value: 'maternity', label: 'Maternity Leave (የወሊድ ፈቃድ)', isPaid: true },
  { value: 'paternity', label: 'Paternity Leave (የአባትነት ፈቃድ)', isPaid: true },
  { value: 'casual', label: 'Casual Leave (ጊዜያዊ ፈቃድ)', isPaid: true },
  { value: 'holiday', label: 'Holiday Compensation (የበዓል ፈቃድ)', isPaid: true },
  { value: 'unpaid', label: 'Unpaid Leave (ያለክፍያ ፈቃድ)', isPaid: false },
  { value: 'other', label: 'Other Leave (ሌላ)', isPaid: true }
];

export default function LeaveManagement({ initialTab = 'requests' }) {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const canManage = hasRole(['admin', 'hr', 'manager']);
  const isHrAdmin = hasRole(['admin', 'hr']);
  const isManager = hasRole(['admin', 'hr', 'manager']);

  const [activeTab, setActiveTab] = useState(initialTab); // 'requests' | 'balances'

  // Data lists
  const [leaves, setLeaves] = useState([]);
  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [requestFilterStatus, setRequestFilterStatus] = useState('all');
  const [requestFilterType, setRequestFilterType] = useState('all');
  const [requestFilterEmp, setRequestFilterEmp] = useState('all');
  const [balanceFilterYear, setBalanceFilterYear] = useState(new Date().getFullYear());
  const [balanceFilterEmp, setBalanceFilterEmp] = useState('all');

  // Modal 1: Apply Leave Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [submittingApply, setSubmittingApply] = useState(false);
  const [applyError, setApplyError] = useState('');
  const [applyForm, setApplyForm] = useState({
    employee: '',
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
    attachment: '',
    attachmentName: ''
  });

  // Modal 2: View Details Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  // Modal 3: Decision / Rejection Modal (HR Final Decision)
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState('accepted'); // 'accepted' | 'rejected'
  const [decisionReason, setDecisionReason] = useState('');
  const [decidingLeave, setDecidingLeave] = useState(null);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Modal 3B: Manager Review Modal
  const [managerReviewModalOpen, setManagerReviewModalOpen] = useState(false);
  const [managerReviewLeave, setManagerReviewLeave] = useState(null);
  const [managerReviewDecision, setManagerReviewDecision] = useState('manager_approved'); // 'manager_approved' | 'rejected'
  const [managerReviewNotes, setManagerReviewNotes] = useState('');
  const [submittingManagerReview, setSubmittingManagerReview] = useState(false);

  // Modal 4: Initialize Balance Modal (Single Employee)
  const [isInitBalanceModalOpen, setIsInitBalanceModalOpen] = useState(false);
  const [submittingInitBalance, setSubmittingInitBalance] = useState(false);
  const [initBalanceForm, setInitBalanceForm] = useState({
    employee: '',
    year: new Date().getFullYear(),
    type: 'annual',
    total: 16,
    isPayable: true
  });

  // Modal 4B: Bulk Quota Initialization Modal (All Active Employees)
  const [isBulkInitModalOpen, setIsBulkInitModalOpen] = useState(false);
  const [bulkInitYear, setBulkInitYear] = useState(new Date().getFullYear());
  const [submittingBulkInit, setSubmittingBulkInit] = useState(false);

  // Modal 5: Adjust Balance Modal (HR/Admin)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [adjustmentDays, setAdjustmentDays] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Modal 6: View Balance Details Modal
  const [balanceDetailModalOpen, setBalanceDetailModalOpen] = useState(false);
  const [selectedBalanceDetail, setSelectedBalanceDetail] = useState(null);
  const [adjustOpenedFromDetail, setAdjustOpenedFromDetail] = useState(false);

  // Modal 7: Approval History Audit Timeline Modal
  const [historyLeave, setHistoryLeave] = useState(null);

  // Cancellation state
  const [cancellingLeaveId, setCancellingLeaveId] = useState(null);

  // Identify current logged-in employee record
  const currentEmployee = useMemo(() => {
    return employees.find(
      (e) =>
        (user?.employee && (e._id === (user.employee._id || user.employee))) ||
        (e.user && (e.user._id || e.user) === user?._id) ||
        (e.email?.toLowerCase() === user?.email?.toLowerCase())
    );
  }, [employees, user]);

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [leavesRes, balancesRes, empsRes] = await Promise.allSettled([
        api.get('/leave-requests?limit=200'),
        api.get(`/leave-balances?limit=200&year=${balanceFilterYear}`),
        api.get('/employees?limit=300')
      ]);

      if (leavesRes.status === 'fulfilled' && leavesRes.value?.data) {
        setLeaves(Array.isArray(leavesRes.value.data) ? leavesRes.value.data : []);
      }
      if (balancesRes.status === 'fulfilled' && balancesRes.value?.data) {
        setBalances(Array.isArray(balancesRes.value.data) ? balancesRes.value.data : []);
      }
      if (empsRes.status === 'fulfilled' && empsRes.value?.data) {
        const empList = Array.isArray(empsRes.value.data) ? empsRes.value.data : [];
        setEmployees(empList);
      }
    } catch (err) {
      console.error('Error fetching leave management records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [balanceFilterYear]);

  // Auto-set employee on apply form open
  useEffect(() => {
    if (isApplyModalOpen) {
      setApplyError('');
      if (!canManage) {
        // Locked to self
        setApplyForm((prev) => ({
          ...prev,
          employee: currentEmployee?._id || ''
        }));
      } else {
        if (!applyForm.employee && employees.length > 0) {
          setApplyForm((prev) => ({
            ...prev,
            employee: currentEmployee?._id || employees[0]._id
          }));
        }
      }
    }
  }, [isApplyModalOpen, currentEmployee, canManage, employees]);

  // Auto-set employee on initialize balance modal open
  useEffect(() => {
    if (isInitBalanceModalOpen && employees.length > 0 && !initBalanceForm.employee) {
      setInitBalanceForm((prev) => ({
        ...prev,
        employee: employees[0]._id
      }));
    }
  }, [isInitBalanceModalOpen, employees]);

  // Calculate requested duration in calendar days
  const calculateDurationDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Find remaining balance for the currently selected employee & leave type in the apply modal
  const activeAvailableBalance = useMemo(() => {
    const targetEmpId = canManage ? applyForm.employee : currentEmployee?._id;
    if (!targetEmpId || !applyForm.type) return null;
    const year = applyForm.startDate ? new Date(applyForm.startDate).getFullYear() : new Date().getFullYear();
    const bal = balances.find(
      (b) =>
        (b.employee?._id || b.employee) === targetEmpId &&
        b.type === applyForm.type &&
        b.year === year
    );
    return bal || null;
  }, [applyForm.employee, applyForm.type, applyForm.startDate, balances, canManage, currentEmployee]);

  // Duration in days for current apply form
  const applyDurationDays = useMemo(() => {
    return calculateDurationDays(applyForm.startDate, applyForm.endDate);
  }, [applyForm.startDate, applyForm.endDate]);

  // Check if requested duration exceeds balance (prevent negative balance)
  const isBalanceExceeded = useMemo(() => {
    if (applyForm.type === 'unpaid') return false;
    if (!activeAvailableBalance) return false;
    return applyDurationDays > activeAvailableBalance.remaining;
  }, [applyForm.type, activeAvailableBalance, applyDurationDays]);

  // Handle Apply Leave Submit
  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setApplyError('');

    const targetEmpId = canManage ? applyForm.employee : currentEmployee?._id;

    if (!targetEmpId) {
      setApplyError('Your account is not linked to an employee profile. Please contact HR.');
      return;
    }

    if (!applyForm.startDate || !applyForm.endDate) {
      setApplyError('Start date and end date are required.');
      return;
    }

    if (new Date(applyForm.startDate) > new Date(applyForm.endDate)) {
      setApplyError('Start date cannot be after end date.');
      return;
    }

    if (applyDurationDays <= 0) {
      setApplyError('Invalid date range. Duration must be at least 1 day.');
      return;
    }

    // Client-side negative balance prevention
    if (applyForm.type !== 'unpaid' && activeAvailableBalance && applyDurationDays > activeAvailableBalance.remaining) {
      setApplyError(
        `Insufficient leave balance! You have ${activeAvailableBalance.remaining} day(s) remaining for ${applyForm.type} leave, but requested ${applyDurationDays} day(s). Negative balances are not permitted.`
      );
      return;
    }

    setSubmittingApply(true);
    try {
      const payload = {
        ...applyForm,
        employee: targetEmpId
      };

      const response = await api.post('/leave-requests', payload);
      if (response.success) {
        setIsApplyModalOpen(false);
        setApplyForm({
          employee: canManage ? employees[0]?._id || '' : currentEmployee?._id || '',
          type: 'annual',
          startDate: '',
          endDate: '',
          reason: '',
          attachment: '',
          attachmentName: ''
        });
        await fetchData();
      } else {
        setApplyError(response.message || 'Failed to submit leave request');
      }
    } catch (err) {
      setApplyError(err.message || 'Failed to submit leave request');
    } finally {
      setSubmittingApply(false);
    }
  };

  // Handle Attachment Upload (Base64)
  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setApplyForm((prev) => ({ ...prev, attachment: '', attachmentName: '' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit.');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setApplyForm((prev) => ({
        ...prev,
        attachment: uploadEvent.target.result,
        attachmentName: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  // Employee Self-Cancellation
  const handleCancelLeave = async (leave) => {
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this leave request? Any reserved quota balance will be restored.'
    );
    if (!confirmCancel) return;

    setCancellingLeaveId(leave._id);
    try {
      const response = await api.post(`/leave-requests/${leave._id}/cancel`);
      if (response.success) {
        if (detailModalOpen && selectedLeave?._id === leave._id) {
          setSelectedLeave((prev) => ({ ...prev, decision: 'cancelled' }));
        }
        await fetchData();
      } else {
        alert(response.message || 'Failed to cancel leave request');
      }
    } catch (err) {
      alert(err.message || 'Failed to cancel leave request');
    } finally {
      setCancellingLeaveId(null);
    }
  };

  // Open Manager Review Modal
  const openManagerReviewModal = (leave, decision = 'manager_approved') => {
    setManagerReviewLeave(leave);
    setManagerReviewDecision(decision);
    setManagerReviewNotes('');
    setManagerReviewModalOpen(true);
  };

  // Execute Manager Review (manager_approved / rejected)
  const handleExecuteManagerReview = async (e) => {
    e.preventDefault();
    if (!managerReviewLeave) return;

    if (managerReviewDecision === 'rejected' && !managerReviewNotes.trim()) {
      alert('Please provide notes or a reason for rejecting this leave request.');
      return;
    }

    setSubmittingManagerReview(true);
    try {
      const response = await api.patch(`/leave-requests/${managerReviewLeave._id}/manager-review`, {
        decision: managerReviewDecision,
        notes: managerReviewNotes.trim()
      });
      if (response.success) {
        setManagerReviewModalOpen(false);
        if (detailModalOpen && selectedLeave?._id === managerReviewLeave._id) {
          setSelectedLeave((prev) => ({
            ...prev,
            decision: managerReviewDecision,
            managerReview: {
              decidedBy: { fullName: user?.fullName || 'Manager', email: user?.email },
              decidedAt: new Date(),
              notes: managerReviewNotes.trim()
            }
          }));
        }
        await fetchData();
      } else {
        alert(response.message || 'Failed to record manager review');
      }
    } catch (err) {
      alert(err.message || 'Failed to record manager review');
    } finally {
      setSubmittingManagerReview(false);
    }
  };

  // Open HR Final Decision Modal
  const openDecisionModal = (leave, type) => {
    setDecidingLeave(leave);
    setDecisionType(type);
    setDecisionReason('');
    setDecisionModalOpen(true);
  };

  // Execute HR Final Decision (accepted / rejected)
  const handleExecuteDecision = async (e) => {
    e.preventDefault();
    if (!decidingLeave) return;

    if (decisionType === 'rejected' && !decisionReason.trim()) {
      alert('Please provide a reason for rejecting the leave request.');
      return;
    }

    setSubmittingDecision(true);
    try {
      const response = await api.patch(`/leave-requests/${decidingLeave._id}/decision`, {
        decision: decisionType,
        decisionReason: decisionReason.trim()
      });

      if (response.success) {
        setDecisionModalOpen(false);
        if (detailModalOpen && selectedLeave?._id === decidingLeave._id) {
          setSelectedLeave((prev) => ({
            ...prev,
            decision: decisionType,
            decisionReason: decisionReason.trim(),
            decideBy: { fullName: user?.fullName || 'Reviewer', email: user?.email }
          }));
        }
        await fetchData();
      }
    } catch (err) {
      alert(err.message || `Failed to ${decisionType} leave request`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  // Handle Quick Approve directly from table (HR only)
  const handleQuickApprove = (leave) => {
    openDecisionModal(leave, 'accepted');
  };

  // Handle Quick Reject directly from table (HR only)
  const handleQuickReject = (leave) => {
    openDecisionModal(leave, 'rejected');
  };

  // Handle Bulk Quota Initialization for All Active Employees
  const handleBulkInitialize = async (e) => {
    e.preventDefault();
    setSubmittingBulkInit(true);
    try {
      const response = await api.post('/leave-balances/initialize', {
        employeeId: 'all',
        year: Number(bulkInitYear)
      });
      if (response.success) {
        setIsBulkInitModalOpen(false);
        alert(response.message || 'Standard yearly leave quotas successfully initialized for all active staff.');
        await fetchData();
      } else {
        alert(response.message || 'Failed to initialize yearly quotas');
      }
    } catch (err) {
      alert(err.message || 'Failed to initialize yearly quotas');
    } finally {
      setSubmittingBulkInit(false);
    }
  };

  // Handle Create/Initialize Leave Balance
  const handleCreateBalance = async (e) => {
    e.preventDefault();
    setSubmittingInitBalance(true);
    try {
      const response = await api.post('/leave-balances', initBalanceForm);
      if (response.success) {
        setIsInitBalanceModalOpen(false);
        setInitBalanceForm({
          employee: employees[0]?._id || '',
          year: new Date().getFullYear(),
          type: 'annual',
          total: 16,
          isPayable: true
        });
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to initialize leave balance');
    } finally {
      setSubmittingInitBalance(false);
    }
  };

  // Handle Adjust Balance
  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedBalance) return;
    setSubmittingAdjust(true);
    try {
      const response = await api.patch(`/leave-balances/${selectedBalance._id}/adjust`, {
        adjustment: Number(adjustmentDays),
        daysUsed: Number(adjustmentDays),
        reason: adjustReason
      });
      if (response.success) {
        setIsAdjustModalOpen(false);
        if (adjustOpenedFromDetail && response.data) {
          setSelectedBalanceDetail(response.data);
          setBalanceDetailModalOpen(true);
          setAdjustOpenedFromDetail(false);
        } else if (balanceDetailModalOpen && selectedBalanceDetail?._id === selectedBalance._id) {
          setSelectedBalanceDetail(response.data);
        }
        await fetchData();
      }
    } catch (err) {
      alert(err.message || 'Failed to adjust leave balance');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  // Close Adjust Modal (returns to Detail modal if opened from there)
  const handleCloseAdjustModal = () => {
    setIsAdjustModalOpen(false);
    if (adjustOpenedFromDetail) {
      setBalanceDetailModalOpen(true);
      setAdjustOpenedFromDetail(false);
    }
  };

  // Filtered Leave Requests
  const filteredLeaves = useMemo(() => {
    return leaves.filter((lr) => {
      if (requestFilterStatus !== 'all' && lr.decision !== requestFilterStatus) return false;
      if (requestFilterType !== 'all' && lr.type !== requestFilterType) return false;
      if (canManage && requestFilterEmp !== 'all') {
        const empId = lr.employee?._id || lr.employee;
        if (empId !== requestFilterEmp) return false;
      }
      return true;
    });
  }, [leaves, requestFilterStatus, requestFilterType, requestFilterEmp, canManage]);

  // Filtered Leave Balances
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      if (canManage && balanceFilterEmp !== 'all') {
        const empId = b.employee?._id || b.employee;
        if (empId !== balanceFilterEmp) return false;
      }
      return true;
    });
  }, [balances, balanceFilterEmp, canManage]);

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
            Section 2.4 • Employee leave requests, multi-level approval workflows, and leave quotas tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'requests' ? (
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('actions.createLeave')}</span>
            </button>
          ) : (
            canManage && (
              <div className="flex items-center gap-2">
                {isHrAdmin && (
                  <button
                    onClick={() => setIsBulkInitModalOpen(true)}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
                    title="Bulk initialize standard quotas for all active employees"
                  >
                    <Layers className="w-4 h-4 text-primary-500" />
                    <span>Initialize All Staff</span>
                  </button>
                )}
                <button
                  onClick={() => setIsInitBalanceModalOpen(true)}
                  className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Initialize Quota</span>
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Tabs matching Recruitment & Jobs style */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Leave Requests ({leaves.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'balances'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Leave Balances & Quotas ({balances.length})</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading leave management records...
        </div>
      ) : activeTab === 'requests' ? (
        /* ========================================================================= */
        /* TAB 1: LEAVE REQUESTS                                                     */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <select
              value={requestFilterStatus}
              onChange={(e) => setRequestFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="manager_approved">Manager Approved</option>
              <option value="accepted">Accepted / Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Type Filter */}
            <select
              value={requestFilterType}
              onChange={(e) => setRequestFilterType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium capitalize"
            >
              <option value="all">All Leave Types</option>
              {LEAVE_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>

            {/* Employee Filter (HR Only) */}
            {canManage && (
              <select
                value={requestFilterEmp}
                onChange={(e) => setRequestFilterEmp(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium max-w-xs truncate"
              >
                <option value="all">All Employees ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.department})
                  </option>
                ))}
              </select>
            )}

            {(requestFilterStatus !== 'all' || requestFilterType !== 'all' || requestFilterEmp !== 'all') && (
              <button
                onClick={() => {
                  setRequestFilterStatus('all');
                  setRequestFilterType('all');
                  setRequestFilterEmp('all');
                }}
                className="text-[11px] text-primary-500 hover:underline font-bold ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {filteredLeaves.length === 0 ? (
            <EmptyState
              title="No leave requests found"
              message={
                leaves.length === 0
                  ? 'No leave applications have been submitted yet. Click Request Leave to apply.'
                  : 'No leave requests match your active filters.'
              }
              actionText={t('actions.createLeave')}
              onAction={() => setIsApplyModalOpen(true)}
              icon={CalendarDays}
            />
          ) : (
            <>
              {/* Mobile Card Deck (< md) */}
              <div className="block md:hidden space-y-3">
                {filteredLeaves.map((leave) => {
                  const duration = calculateDurationDays(leave.startDate, leave.endDate);
                  const bal = leave.leaveBalance;
                  return (
                    <div
                      key={leave._id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {leave.employee?.profileImage ? (
                            <img
                              src={leave.employee.profileImage}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-sm">
                              {leave.employee?.fullName?.charAt(0) || 'E'}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {leave.employee?.fullName || 'Employee'}
                            </h3>
                            <p className="text-[11px] text-slate-400">
                              {leave.employee?.department} • {leave.employee?.position}
                            </p>
                          </div>
                        </div>
                        <Badge
                          status={leave.decision}
                          text={
                            leave.decision === 'manager_approved'
                              ? 'Manager Approved'
                              : leave.decision === 'pending'
                              ? 'Pending Review'
                              : leave.decision === 'accepted'
                              ? 'Approved'
                              : leave.decision === 'rejected'
                              ? 'Rejected'
                              : leave.decision === 'cancelled'
                              ? 'Cancelled'
                              : leave.decision
                          }
                        />
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Leave Type:</span>
                          <span className="capitalize font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span>{leave.type} Leave</span>
                            {leave.attachments && leave.attachments.length > 0 && (
                              <a
                                href={leave.attachments[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                                title={leave.attachments[0].name || 'Supporting document'}
                              >
                                <Paperclip className="w-2.5 h-2.5" />
                                <span>Doc</span>
                              </a>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Duration:</span>
                          <span className="font-semibold text-primary-600 dark:text-primary-400">
                            {duration} day{duration > 1 ? 's' : ''} ({new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()})
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">Available Balance:</span>
                          {bal ? (
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                bal.remaining > 3
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : bal.remaining > 0
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              }`}
                            >
                              {bal.remaining} / {bal.total} days
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No quota</span>
                          )}
                        </div>
                        {leave.reason && (
                          <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1 text-[11px]">
                            <span className="text-slate-400">Reason:</span> {leave.reason}
                          </div>
                        )}
                        {leave.managerReview?.notes && (
                          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[11px] font-medium border border-sky-200/60 dark:border-sky-900/60">
                            <span className="font-bold">Manager Review:</span> {leave.managerReview.notes}
                          </div>
                        )}
                        {leave.decisionReason && (
                          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-medium border border-rose-200/60 dark:border-rose-900/60">
                            <span className="font-bold">Decision Remarks:</span> {leave.decisionReason}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setDetailModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Details</span>
                          </button>
                          <button
                            onClick={() => setHistoryLeave(leave)}
                            title="Approval History"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Self Cancel */}
                          {leave.decision !== 'cancelled' &&
                            leave.decision !== 'rejected' &&
                            currentEmployee &&
                            String(leave.employee?._id || leave.employee) === String(currentEmployee._id) && (
                              <button
                                onClick={() => handleCancelLeave(leave)}
                                disabled={cancellingLeaveId === leave._id}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 border border-rose-200 dark:border-rose-900"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            )}

                          {/* Manager Review */}
                          {isManager && leave.decision === 'pending' && (
                            <button
                              onClick={() => openManagerReviewModal(leave, 'manager_approved')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 transition flex items-center gap-1"
                            >
                              <span>Review</span>
                            </button>
                          )}

                          {/* HR Final Decision */}
                          {isHrAdmin && (leave.decision === 'manager_approved' || leave.decision === 'pending') && (
                            <>
                              <button
                                onClick={() => handleQuickApprove(leave)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleQuickReject(leave)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                    <tr>
                      <th className="px-4 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Leave Type</th>
                      <th className="px-4 py-3.5">Duration & Dates</th>
                      <th className="px-4 py-3.5">Reason & Attachment</th>
                      <th className="px-4 py-3.5 text-center">Available Balance</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredLeaves.map((leave) => {
                      const duration = calculateDurationDays(leave.startDate, leave.endDate);
                      const bal = leave.leaveBalance;
                      return (
                        <tr
                          key={leave._id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                        >
                          {/* Employee */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              {leave.employee?.profileImage ? (
                                <img
                                  src={leave.employee.profileImage}
                                  alt=""
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-bold flex items-center justify-center text-xs">
                                  {leave.employee?.fullName?.charAt(0) || 'E'}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {leave.employee?.fullName || 'Employee'}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {leave.employee?.department || 'Staff'} • {leave.employee?.position || ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Leave Type */}
                          <td className="px-4 py-3.5">
                            <span className="capitalize font-semibold text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-xs">
                              {leave.type}
                            </span>
                          </td>

                          {/* Duration & Dates */}
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {duration} day{duration > 1 ? 's' : ''}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Reason & Attachment */}
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 max-w-xs">
                            <div className="truncate" title={leave.reason || ''}>
                              {leave.reason ? leave.reason : <span className="text-slate-400 italic">-</span>}
                            </div>
                            {leave.attachments && leave.attachments.length > 0 && (
                              <div className="mt-1">
                                <a
                                  href={leave.attachments[0].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                                  title={leave.attachments[0].name || 'Supporting document'}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>{leave.attachments[0].name || 'Document'}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            )}
                          </td>

                          {/* Available Balance */}
                          <td className="px-4 py-3.5 text-center">
                            {bal ? (
                              <span
                                className={`inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${
                                  bal.remaining > 3
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : bal.remaining > 0
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                {bal.remaining} / {bal.total} d
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No quota</span>
                            )}
                          </td>

                          {/* Decision status */}
                          <td className="px-4 py-3.5 text-center">
                            <Badge
                              status={leave.decision}
                              text={
                                leave.decision === 'manager_approved'
                                  ? 'Manager Approved'
                                  : leave.decision === 'pending'
                                  ? 'Pending Review'
                                  : leave.decision === 'accepted'
                                  ? 'Approved'
                                  : leave.decision === 'rejected'
                                  ? 'Rejected'
                                  : leave.decision === 'cancelled'
                                  ? 'Cancelled'
                                  : leave.decision
                              }
                            />
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details button */}
                              <button
                                onClick={() => {
                                  setSelectedLeave(leave);
                                  setDetailModalOpen(true);
                                }}
                                title="View Complete Details"
                                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Approval History button */}
                              <button
                                onClick={() => setHistoryLeave(leave)}
                                title="Approval Audit History"
                                className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                              >
                                <History className="w-4 h-4" />
                              </button>

                              {/* Self Cancel button */}
                              {leave.decision !== 'cancelled' &&
                                leave.decision !== 'rejected' &&
                                currentEmployee &&
                                String(leave.employee?._id || leave.employee) === String(currentEmployee._id) && (
                                  <button
                                    onClick={() => handleCancelLeave(leave)}
                                    disabled={cancellingLeaveId === leave._id}
                                    title="Cancel Leave Application"
                                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                  >
                                    <Ban className="w-4 h-4" />
                                  </button>
                                )}

                              {/* Manager Review */}
                              {isManager && leave.decision === 'pending' && (
                                <button
                                  onClick={() => openManagerReviewModal(leave, 'manager_approved')}
                                  title="Department Manager Review"
                                  className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900 rounded-lg transition"
                                >
                                  Review
                                </button>
                              )}

                              {/* HR Final Decision */}
                              {isHrAdmin && (leave.decision === 'manager_approved' || leave.decision === 'pending') && (
                                <>
                                  <button
                                    onClick={() => handleQuickApprove(leave)}
                                    title="Approve leave request"
                                    className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-lg transition"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleQuickReject(leave)}
                                    title="Reject leave request"
                                    className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg transition"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: LEAVE BALANCES & QUOTAS                                            */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Balances Filters */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Fiscal Year:</span>
              <select
                value={balanceFilterYear}
                onChange={(e) => setBalanceFilterYear(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold"
              >
                {[2024, 2025, 2026, 2027].map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Filter (HR Only) */}
            {canManage && (
              <select
                value={balanceFilterEmp}
                onChange={(e) => setBalanceFilterEmp(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium max-w-xs truncate"
              >
                <option value="all">All Employees ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.department})
                  </option>
                ))}
              </select>
            )}

            {(balanceFilterEmp !== 'all' || balanceFilterYear !== new Date().getFullYear()) && (
              <button
                onClick={() => {
                  setBalanceFilterEmp('all');
                  setBalanceFilterYear(new Date().getFullYear());
                }}
                className="text-[11px] text-primary-500 hover:underline font-bold ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {filteredBalances.length === 0 ? (
            <EmptyState
              title="No leave quotas found"
              message={
                balances.length === 0
                  ? 'No leave balances configured for this fiscal year. Initialize quotas for staff.'
                  : 'No leave balances match your active filters.'
              }
              actionText={canManage ? 'Initialize Quota' : null}
              onAction={() => setIsInitBalanceModalOpen(true)}
              icon={Scale}
            />
          ) : (
            <>
              {/* Mobile Card Deck (< md) */}
              <div className="block md:hidden space-y-3">
                {filteredBalances.map((item) => (
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
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          item.remaining > 3
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : item.remaining > 0
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                        }`}
                      >
                        {item.remaining} Days Left
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 text-xs text-center border-y border-slate-100 dark:border-slate-700/60">
                      <div>
                        <div className="text-slate-400 text-[10px]">Total Quota</div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.total}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">Used Days</div>
                        <div className="font-bold text-amber-600">{item.totalUsed}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px]">Remaining</div>
                        <div className="font-bold text-emerald-600">{item.remaining}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => {
                          setSelectedBalanceDetail(item);
                          setBalanceDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View Details</span>
                      </button>

                      {canManage && (
                        <button
                          onClick={() => {
                            setSelectedBalance(item);
                            setAdjustmentDays(0);
                            setAdjustReason('');
                            setIsAdjustModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition"
                        >
                          {t('actions.adjust')}
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
                      <th className="px-4 py-3.5">Employee</th>
                      <th className="px-4 py-3.5">Year</th>
                      <th className="px-4 py-3.5">Leave Type</th>
                      <th className="px-4 py-3.5 text-center">Total Entitlement</th>
                      <th className="px-4 py-3.5 text-center">Used Days</th>
                      <th className="px-4 py-3.5 text-center">Remaining Days</th>
                      <th className="px-4 py-3.5 text-center">Payable</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredBalances.map((item) => (
                      <tr
                        key={item._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                      >
                        <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                          {item.employee?.fullName || 'Employee'}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-500">{item.year}</td>
                        <td className="px-4 py-3.5 capitalize font-medium text-slate-700 dark:text-slate-300">
                          {item.type}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          {item.total}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-amber-600">
                          {item.totalUsed}
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-emerald-600">
                          <span
                            className={`px-2 py-0.5 rounded ${
                              item.remaining > 3
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : item.remaining > 0
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                            }`}
                          >
                            {item.remaining}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {item.isPayable ? (
                            <span className="text-xs text-emerald-600 font-semibold">Yes</span>
                          ) : (
                            <span className="text-xs text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedBalanceDetail(item);
                                setBalanceDetailModalOpen(true);
                              }}
                              title="View Quota Details & Adjustment Reason"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {canManage && (
                              <button
                                onClick={() => {
                                  setSelectedBalance(item);
                                  setAdjustmentDays(0);
                                  setAdjustReason('');
                                  setIsAdjustModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition"
                              >
                                {t('actions.adjust')}
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: APPLY FOR LEAVE                                                  */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title={t('actions.createLeave')}
        maxWidth="max-w-lg"
      >
        {applyError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{applyError}</span>
          </div>
        )}

        <form onSubmit={handleApplyLeave} className="space-y-4">
          {/* Employee Selection: Regular employee CANNOT select other employee */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Applicant Employee *
            </label>

            {canManage ? (
              <select
                required
                value={applyForm.employee}
                onChange={(e) => setApplyForm({ ...applyForm, employee: e.target.value })}
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
                Your user account is not linked to an employee profile. You cannot request leave until HR links your account.
              </div>
            )}
          </div>

          {/* Leave Category */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Leave Category *
            </label>
            <select
              value={applyForm.type}
              onChange={(e) => setApplyForm({ ...applyForm, type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 capitalize"
            >
              {LEAVE_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>
                  {lt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Real-time Leave Balance Tracker Pill */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary-500" />
              <span className="font-medium text-slate-600 dark:text-slate-300">
                Available Quota for <span className="capitalize font-bold">{applyForm.type}</span>:
              </span>
            </div>
            {activeAvailableBalance ? (
              <div className="text-right">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {activeAvailableBalance.remaining}
                </span>
                <span className="text-slate-400 text-[11px]"> / {activeAvailableBalance.total} days</span>
                <div className="text-[10px] text-slate-400">Used: {activeAvailableBalance.totalUsed} d</div>
              </div>
            ) : applyForm.type === 'unpaid' ? (
              <span className="text-slate-500 font-medium italic">Unlimited (Unpaid)</span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium italic">No quota initialized</span>
            )}
          </div>

          {/* Start and End Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={applyForm.startDate}
                onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
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
                value={applyForm.endDate}
                onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Calculated Duration & Negative Balance Warning */}
          {applyDurationDays > 0 && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                isBalanceExceeded
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                  : 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-900 text-primary-800 dark:text-primary-300'
              }`}
            >
              <div>
                <span className="font-bold">Calculated Duration:</span> {applyDurationDays} calendar day(s)
                {isBalanceExceeded && (
                  <div className="text-[11px] font-semibold mt-0.5 text-rose-600 dark:text-rose-400">
                    ⚠️ Exceeds available quota ({activeAvailableBalance?.remaining} days). Submission is prevented to avoid negative balance.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reason / Justification */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reason / Justification
            </label>
            <textarea
              rows="3"
              value={applyForm.reason}
              onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
              placeholder="State the detailed reason for this leave request..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Medical Certificate / Supporting Document Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Supporting Document (e.g. Medical Certificate, Note)
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition">
                <FileUp className="w-4 h-4 text-primary-500" />
                <span>{applyForm.attachmentName ? 'Change File' : 'Upload Document'}</span>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAttachmentChange}
                  className="hidden"
                />
              </label>
              {applyForm.attachmentName && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Paperclip className="w-3.5 h-3.5 text-primary-500" />
                  <span className="truncate max-w-[180px]">{applyForm.attachmentName}</span>
                  <button
                    type="button"
                    onClick={() => setApplyForm((prev) => ({ ...prev, attachment: '', attachmentName: '' }))}
                    className="text-slate-400 hover:text-rose-500 ml-1 font-bold"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Recommended for sick or emergency leaves (Max 10MB; PDF, JPG, PNG, DOC).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingApply || isBalanceExceeded || (!canManage && !currentEmployee)}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submittingApply ? 'Submitting...' : t('actions.submit')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW COMPLETE LEAVE DETAILS                                      */}
      {/* ========================================================================= */}
      {selectedLeave && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Leave Request Details"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {selectedLeave.employee?.profileImage ? (
                  <img
                    src={selectedLeave.employee.profileImage}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-bold flex items-center justify-center text-base">
                    {selectedLeave.employee?.fullName?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {selectedLeave.employee?.fullName || 'Employee'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedLeave.employee?.department} • {selectedLeave.employee?.position}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedLeave.employee?.email}
                    {selectedLeave.employee?.nationalId && ` • ID: ${selectedLeave.employee.nationalId}`}
                  </p>
                </div>
              </div>

              <Badge
                status={selectedLeave.decision}
                text={
                  selectedLeave.decision === 'manager_approved'
                    ? 'Manager Approved'
                    : selectedLeave.decision === 'pending'
                    ? 'Pending Review'
                    : selectedLeave.decision === 'accepted'
                    ? 'Approved'
                    : selectedLeave.decision === 'rejected'
                    ? 'Rejected'
                    : selectedLeave.decision === 'cancelled'
                    ? 'Cancelled'
                    : selectedLeave.decision
                }
              />
            </div>

            {/* Leave Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[11px]">Leave Category</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 capitalize mt-0.5">
                  {selectedLeave.type} Leave
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[11px]">Calculated Duration</span>
                <div className="font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                  {calculateDurationDays(selectedLeave.startDate, selectedLeave.endDate)} Calendar Day(s)
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[11px]">Start Date</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                  {new Date(selectedLeave.startDate).toLocaleDateString()}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[11px]">End Date</span>
                <div className="font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
                  {new Date(selectedLeave.endDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Leave Quota Balance Snapshot */}
            {selectedLeave.leaveBalance && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs">
                <div className="text-[11px] font-bold text-slate-500 mb-2 uppercase">Leave Quota Allowance</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">Total Entitlement</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedLeave.leaveBalance.total} Days
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Total Consumed</div>
                    <div className="font-bold text-amber-600">
                      {selectedLeave.leaveBalance.totalUsed} Days
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Remaining Balance</div>
                    <div className="font-bold text-emerald-600">
                      {selectedLeave.leaveBalance.remaining} Days
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Applicant Justification */}
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Reason for Leave</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {selectedLeave.reason || 'No justification provided.'}
              </p>
            </div>

            {/* Attachments Section */}
            {selectedLeave.attachments && selectedLeave.attachments.length > 0 && (
              <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-primary-500" />
                  <span>Attached Supporting Documents</span>
                </span>
                <div className="space-y-1.5">
                  {selectedLeave.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[280px]">
                        {att.name || `Attachment #${idx + 1}`}
                      </span>
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View / Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manager Review Callout */}
            {(selectedLeave.managerReview?.notes || selectedLeave.decision === 'manager_approved') && (
              <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/60 dark:bg-sky-950/40 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-sky-800 dark:text-sky-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                    <span>Department Manager Review</span>
                  </span>
                  {selectedLeave.managerReview?.decidedBy?.fullName && (
                    <span className="text-[11px] font-normal opacity-80">
                      Reviewed by {selectedLeave.managerReview.decidedBy.fullName}
                    </span>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300 pl-5.5 leading-relaxed">
                  {selectedLeave.managerReview?.notes || 'Manager approved the request.'}
                </p>
              </div>
            )}

            {/* HR Decision & Remarks / Rejection Reason Callout */}
            {selectedLeave.decision !== 'pending' && selectedLeave.decision !== 'manager_approved' && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  selectedLeave.decision === 'rejected'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                    : selectedLeave.decision === 'cancelled'
                    ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {selectedLeave.decision === 'rejected' ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : selectedLeave.decision === 'cancelled' ? (
                      <Ban className="w-4 h-4 text-slate-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      {selectedLeave.decision === 'rejected'
                        ? 'Rejection Reason & Remarks'
                        : selectedLeave.decision === 'cancelled'
                        ? 'Cancellation Notice'
                        : 'Approval Remarks'}
                    </span>
                  </span>
                  <span className="text-[11px] font-normal opacity-75">
                    {selectedLeave.decision === 'cancelled'
                      ? 'Cancelled by Employee'
                      : `Reviewed by ${selectedLeave.decideBy?.fullName || 'HR Manager'}`}
                  </span>
                </div>

                <p className="text-xs font-medium leading-relaxed pl-5">
                  {selectedLeave.decisionReason ||
                    (selectedLeave.decision === 'rejected'
                      ? 'No formal rejection reason recorded.'
                      : selectedLeave.decision === 'cancelled'
                      ? 'This leave request was cancelled by the applicant.'
                      : 'Request approved.')}
                </p>
              </div>
            )}

            {/* Action buttons inside detail modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryLeave(selectedLeave)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5"
                >
                  <History className="w-3.5 h-3.5 text-primary-500" />
                  <span>Audit History</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Employee Self Cancel */}
                {selectedLeave.decision !== 'cancelled' &&
                  selectedLeave.decision !== 'rejected' &&
                  currentEmployee &&
                  String(selectedLeave.employee?._id || selectedLeave.employee) === String(currentEmployee._id) && (
                    <button
                      type="button"
                      onClick={() => handleCancelLeave(selectedLeave)}
                      disabled={cancellingLeaveId === selectedLeave._id}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 transition flex items-center gap-1.5"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Leave</span>
                    </button>
                  )}

                {/* Manager Review */}
                {isManager && selectedLeave.decision === 'pending' && (
                  <button
                    type="button"
                    onClick={() => openManagerReviewModal(selectedLeave, 'manager_approved')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Manager Review</span>
                  </button>
                )}

                {/* HR Final Decision */}
                {isHrAdmin &&
                  (selectedLeave.decision === 'manager_approved' || selectedLeave.decision === 'pending') && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          openDecisionModal(selectedLeave, 'accepted');
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          openDecisionModal(selectedLeave, 'rejected');
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DECISION / REJECTION PROMPT MODAL (HR FINAL DECISION)             */}
      {/* ========================================================================= */}
      {decidingLeave && (
        <Modal
          isOpen={decisionModalOpen}
          onClose={() => setDecisionModalOpen(false)}
          title={decisionType === 'accepted' ? 'HR Final Approval' : 'HR Final Rejection'}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleExecuteDecision} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">Target Applicant:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {decidingLeave.employee?.fullName}
              </span>{' '}
              • <span className="capitalize">{decidingLeave.type}</span> Leave (
              {calculateDurationDays(decidingLeave.startDate, decidingLeave.endDate)} days)
            </div>

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
                    ? 'State the reason for rejecting this leave request (required for employee notice)...'
                    : 'Add any remarks or instructions for the employee...'
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
                  decisionType === 'accepted'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingDecision
                  ? 'Processing...'
                  : decisionType === 'accepted'
                  ? 'Confirm Approval'
                  : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3B: DEPARTMENT MANAGER REVIEW MODAL                                 */}
      {/* ========================================================================= */}
      {managerReviewLeave && (
        <Modal
          isOpen={managerReviewModalOpen}
          onClose={() => setManagerReviewModalOpen(false)}
          title="Department Manager Leave Review"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleExecuteManagerReview} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-400">Applicant:</span>{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {managerReviewLeave.employee?.fullName}
              </span>{' '}
              • <span className="capitalize">{managerReviewLeave.type}</span> Leave (
              {calculateDurationDays(managerReviewLeave.startDate, managerReviewLeave.endDate)} days)
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Manager Review Decision *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setManagerReviewDecision('manager_approved')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                    managerReviewDecision === 'manager_approved'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-sky-500" />
                  <span>Recommend Approval</span>
                </button>
                <button
                  type="button"
                  onClick={() => setManagerReviewDecision('rejected')}
                  className={`py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-1.5 ${
                    managerReviewDecision === 'rejected'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-500" />
                  <span>Reject Request</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Manager Review Notes {managerReviewDecision === 'rejected' ? '*' : '(Optional)'}
              </label>
              <textarea
                required={managerReviewDecision === 'rejected'}
                rows="3"
                value={managerReviewNotes}
                onChange={(e) => setManagerReviewNotes(e.target.value)}
                placeholder={
                  managerReviewDecision === 'rejected'
                    ? 'State reasons why the department cannot approve this leave at this time...'
                    : 'Notes on department coverage, delegation, or approvals...'
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setManagerReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submittingManagerReview || (managerReviewDecision === 'rejected' && !managerReviewNotes.trim())}
                className={`px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md transition disabled:opacity-50 ${
                  managerReviewDecision === 'manager_approved'
                    ? 'bg-sky-600 hover:bg-sky-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingManagerReview ? 'Saving...' : 'Submit Manager Review'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: INITIALIZE LEAVE BALANCE                                         */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isInitBalanceModalOpen}
        onClose={() => setIsInitBalanceModalOpen(false)}
        title="Initialize Employee Leave Balance"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateBalance} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee *
            </label>
            <select
              required
              value={initBalanceForm.employee}
              onChange={(e) => setInitBalanceForm({ ...initBalanceForm, employee: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.department} - {emp.position})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Calendar Year *
              </label>
              <input
                type="number"
                required
                value={initBalanceForm.year}
                onChange={(e) => setInitBalanceForm({ ...initBalanceForm, year: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Leave Type *
              </label>
              <select
                value={initBalanceForm.type}
                onChange={(e) => setInitBalanceForm({ ...initBalanceForm, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 capitalize"
              >
                {LEAVE_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {lt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Total Entitlement (Days) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={initBalanceForm.total}
              onChange={(e) => setInitBalanceForm({ ...initBalanceForm, total: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPayableCheck"
              checked={initBalanceForm.isPayable}
              onChange={(e) => setInitBalanceForm({ ...initBalanceForm, isPayable: e.target.checked })}
              className="rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isPayableCheck" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Is Payable (የሚከፈልበት ፈቃድ)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsInitBalanceModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingInitBalance}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {submittingInitBalance ? 'Saving...' : t('actions.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: ADJUST LEAVE BALANCE DAYS                                        */}
      {/* ========================================================================= */}
      {selectedBalance && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={handleCloseAdjustModal}
          title="Adjust Leave Days"
          maxWidth="max-w-sm"
          zIndex="z-60"
        >
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {selectedBalance.employee?.fullName}
              </div>
              <div className="text-[11px] text-slate-500 capitalize">
                {selectedBalance.type} Leave ({selectedBalance.year}) • Current Remaining: {selectedBalance.remaining} days
              </div>
            </div>

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
                Adjustment Reason *
              </label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Carryover from last year, special bonus"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCloseAdjustModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={submittingAdjust}
                className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {submittingAdjust ? 'Applying...' : 'Apply Adjustment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: VIEW BALANCE QUOTA DETAILS & ADJUSTMENT REASON                   */}
      {/* ========================================================================= */}
      {selectedBalanceDetail && (
        <Modal
          isOpen={balanceDetailModalOpen}
          onClose={() => setBalanceDetailModalOpen(false)}
          title="Leave Quota & Balance Details"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            {/* Employee Header */}
            <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {selectedBalanceDetail.employee?.profileImage ? (
                  <img
                    src={selectedBalanceDetail.employee.profileImage}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 font-bold flex items-center justify-center text-base">
                    {selectedBalanceDetail.employee?.fullName?.charAt(0) || 'E'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {selectedBalanceDetail.employee?.fullName || 'Employee'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedBalanceDetail.employee?.department} • {selectedBalanceDetail.employee?.position}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {selectedBalanceDetail.employee?.email}
                    {selectedBalanceDetail.employee?.nationalId && ` • ID: ${selectedBalanceDetail.employee.nationalId}`}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="capitalize font-bold text-xs text-primary-600 dark:text-primary-400 px-2.5 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/60 border border-primary-200/60 dark:border-primary-900/60">
                  {selectedBalanceDetail.type} Leave
                </span>
                <div className="text-[11px] text-slate-400 font-mono mt-1">
                  Year {selectedBalanceDetail.year}
                </div>
              </div>
            </div>

            {/* Quota Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Total Quota</span>
                <div className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                  {selectedBalanceDetail.total} <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Consumed</span>
                <div className="text-base font-black text-amber-600 mt-1">
                  {selectedBalanceDetail.totalUsed} <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Remaining</span>
                <div className="text-base font-black text-emerald-600 mt-1">
                  {selectedBalanceDetail.remaining} <span className="text-xs font-normal text-slate-400">days</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Payable</span>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1.5">
                  {selectedBalanceDetail.isPayable ? 'Yes' : 'No'}
                </div>
              </div>
            </div>

            {/* Adjustment Information & Adjustment Reason Highlight Callout */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <SlidersHorizontal className="w-4 h-4 text-primary-500" />
                <span>Adjustment Reason & History</span>
              </div>

              {selectedBalanceDetail.adjustmentReason ? (
                <div className="p-4 rounded-xl border border-primary-200 dark:border-primary-900 bg-primary-50/60 dark:bg-primary-950/40 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-primary-900 dark:text-primary-200">
                    <span className="flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-primary-500" />
                      <span>Latest Adjustment Reason</span>
                    </span>
                    {selectedBalanceDetail.lastAdjustedAt && (
                      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        {new Date(selectedBalanceDetail.lastAdjustedAt).toLocaleString()}
                        {selectedBalanceDetail.lastAdjustedBy?.fullName && ` by ${selectedBalanceDetail.lastAdjustedBy.fullName}`}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 pl-5.5 font-medium leading-relaxed bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-primary-100 dark:border-primary-900/50">
                    {selectedBalanceDetail.adjustmentReason}
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs text-slate-500 italic flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>No manual adjustments have been recorded for this leave quota yet.</span>
                </div>
              )}

              {/* Adjustments Audit Log (if multiple adjustments exist) */}
              {Array.isArray(selectedBalanceDetail.adjustments) && selectedBalanceDetail.adjustments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Adjustment Log History</span>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs divide-y divide-slate-100 dark:divide-slate-700/60">
                    {selectedBalanceDetail.adjustments.slice().reverse().map((adj, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {adj.reason || 'Manual quota adjustment'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {adj.adjustedAt ? new Date(adj.adjustedAt).toLocaleString() : '-'}
                            {adj.adjustedBy?.fullName && ` • by ${adj.adjustedBy.fullName}`}
                          </div>
                        </div>
                        <span
                          className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                            adj.adjustment > 0
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          }`}
                        >
                          {adj.adjustment > 0 ? `+${adj.adjustment}` : adj.adjustment} days
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setBalanceDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBalance(selectedBalanceDetail);
                    setAdjustmentDays(0);
                    setAdjustReason('');
                    setAdjustOpenedFromDetail(true);
                    setBalanceDetailModalOpen(false);
                    setIsAdjustModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-500 hover:bg-primary-600 transition flex items-center gap-1.5 shadow-sm"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Adjust Days</span>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4B: BULK INITIALIZE YEARLY LEAVE QUOTAS (ALL ACTIVE EMPLOYEES)      */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isBulkInitModalOpen}
        onClose={() => setIsBulkInitModalOpen(false)}
        title="Initialize Standard Leave Quotas for All Staff"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleBulkInitialize} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900 text-xs text-primary-800 dark:text-primary-300 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary-500" />
              <span>Bulk Yearly Allowance Generator</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This will automatically provision standard yearly leave quotas (Annual, Sick, Emergency, Casual, and Maternity/Paternity based on gender) for all currently active employees according to your Company HR Settings. Existing balances for the chosen year will not be duplicated.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Fiscal Calendar Year *
            </label>
            <input
              type="number"
              required
              min={2020}
              max={2035}
              value={bulkInitYear}
              onChange={(e) => setBulkInitYear(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-bold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsBulkInitModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submittingBulkInit}
              className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submittingBulkInit ? 'Initializing...' : 'Run Bulk Initialization'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: APPROVAL HISTORY TIMELINE MODAL                                  */}
      {/* ========================================================================= */}
      <ApprovalHistoryModal
        isOpen={Boolean(historyLeave)}
        onClose={() => setHistoryLeave(null)}
        referenceType="leave request"
        referenceId={historyLeave?._id}
        title={`Approval History - ${historyLeave?.employee?.fullName || 'Leave Request'} (${historyLeave?.type || ''})`}
      />
    </div>
  );
}
