import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import {
  CreditCard,
  Plus,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Printer,
  Users,
  Trash2,
  FileText
} from 'lucide-react';

// Statutory Ethiopian Employment Tax Calculation (Proclamation 979/2016)
const calculateStatutoryTax = (taxableIncome) => {
  const income = Number(taxableIncome) || 0;
  if (income <= 600) return 0;
  if (income <= 1650) return Math.round(income * 0.10 - 60);
  if (income <= 3200) return Math.round(income * 0.15 - 142.5);
  if (income <= 5250) return Math.round(income * 0.20 - 302.5);
  if (income <= 7800) return Math.round(income * 0.25 - 565);
  if (income <= 10900) return Math.round(income * 0.30 - 955);
  return Math.round(income * 0.35 - 1500);
};

const calculateStatutoryPension = (baseSalary) => {
  return Math.round((Number(baseSalary) || 0) * 0.07);
};

export default function Payroll() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();
  const canApprove = hasRole(['admin', 'hr', 'finance']);
  const canPay = hasRole(['admin', 'finance']);

  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Single Process Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mass Payroll Modal
  const [isMassModalOpen, setIsMassModalOpen] = useState(false);
  const [massSubmitting, setMassSubmitting] = useState(false);
  const [massData, setMassData] = useState({
    fromDate: '',
    toDate: '',
    type: 'salary',
    currency: 'ETB'
  });

  // Print Slip Modal
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState(null);

  // New item inputs in single modal
  const [newEarningName, setNewEarningName] = useState('');
  const [newEarningAmount, setNewEarningAmount] = useState('');
  const [newDeductionName, setNewDeductionName] = useState('');
  const [newDeductionAmount, setNewDeductionAmount] = useState('');

  // Default dates: current month range
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    employeeId: '',
    fromDate: defaultFrom,
    toDate: defaultTo,
    currency: 'ETB',
    type: 'salary',
    earnings: [],
    deductions: [],
    totalGross: 0,
    totalDeduction: 0,
    totalNet: 0
  });

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const response = await api.get('/payrolls');
      if (response.success && Array.isArray(response.data)) {
        setPayrolls(response.data);
      } else if (Array.isArray(response)) {
        setPayrolls(response);
      }
    } catch (err) {
      console.error('Error fetching payrolls:', err);
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
          const emp = response.data[0];
          const base = emp.baseSalary || 15000;
          const pension = calculateStatutoryPension(base);
          const tax = calculateStatutoryTax(base);
          const earnings = [{ name: 'Base Salary', amount: base }];
          const deductions = [
            { name: 'Pension Contribution (7%)', amount: pension },
            { name: 'Income Tax (PAYE)', amount: tax }
          ];
          const totalGross = base;
          const totalDeduction = pension + tax;
          setFormData((prev) => ({
            ...prev,
            employeeId: emp._id,
            fromDate: prev.fromDate || defaultFrom,
            toDate: prev.toDate || defaultTo,
            earnings,
            deductions,
            totalGross,
            totalDeduction,
            totalNet: totalGross - totalDeduction
          }));
        }
      }
    } catch (err) {
      console.warn('Could not load employees:', err);
    }
  };

  useEffect(() => {
    fetchPayrolls();
    fetchEmployeesList();
    setMassData((prev) => ({
      ...prev,
      fromDate: defaultFrom,
      toDate: defaultTo
    }));
  }, []);

  const handleSelectEmployee = (empId) => {
    const emp = employees.find((e) => e._id === empId);
    const base = emp?.baseSalary || 15000;
    const pension = calculateStatutoryPension(base);
    const tax = calculateStatutoryTax(base);

    const earnings = [{ name: 'Base Salary', amount: base }];
    const deductions = [
      { name: 'Pension Contribution (7%)', amount: pension },
      { name: 'Income Tax (PAYE)', amount: tax }
    ];

    const totalGross = base;
    const totalDeduction = pension + tax;

    setFormData((prev) => ({
      ...prev,
      employeeId: empId,
      earnings,
      deductions,
      totalGross,
      totalDeduction,
      totalNet: totalGross - totalDeduction
    }));
  };

  // Add Earning row
  const handleAddEarning = (e) => {
    e?.preventDefault?.();
    if (!newEarningName.trim()) return;
    const amount = Number(newEarningAmount) || 0;
    const updatedEarnings = [
      ...formData.earnings,
      { name: newEarningName.trim(), amount }
    ];
    const newGross = updatedEarnings.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const ded = formData.totalDeduction;

    setFormData((prev) => ({
      ...prev,
      earnings: updatedEarnings,
      totalGross: newGross,
      totalNet: newGross - ded
    }));
    setNewEarningName('');
    setNewEarningAmount('');
  };

  const handleRemoveEarning = (index) => {
    const updatedEarnings = formData.earnings.filter((_, i) => i !== index);
    const newGross = updatedEarnings.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const ded = formData.totalDeduction;

    setFormData((prev) => ({
      ...prev,
      earnings: updatedEarnings,
      totalGross: newGross,
      totalNet: newGross - ded
    }));
  };

  // Add Deduction row
  const handleAddDeduction = (e) => {
    e?.preventDefault?.();
    if (!newDeductionName.trim()) return;
    const amount = Number(newDeductionAmount) || 0;
    const updatedDeductions = [
      ...formData.deductions,
      { name: newDeductionName.trim(), amount }
    ];
    const newDed = updatedDeductions.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const gross = formData.totalGross;

    setFormData((prev) => ({
      ...prev,
      deductions: updatedDeductions,
      totalDeduction: newDed,
      totalNet: gross - newDed
    }));
    setNewDeductionName('');
    setNewDeductionAmount('');
  };

  const handleRemoveDeduction = (index) => {
    const updatedDeductions = formData.deductions.filter((_, i) => i !== index);
    const newDed = updatedDeductions.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const gross = formData.totalGross;

    setFormData((prev) => ({
      ...prev,
      deductions: updatedDeductions,
      totalDeduction: newDed,
      totalNet: gross - newDed
    }));
  };

  // Single payroll form submit
  const handleProcessPayroll = async (e) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.fromDate || !formData.toDate) {
      alert('Please fill out all required fields marked with *');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post('/payrolls', formData);
      if (response.success) {
        setIsModalOpen(false);
        await fetchPayrolls();
      }
    } catch (err) {
      alert(err.message || 'Failed to process payroll');
    } finally {
      setSubmitting(false);
    }
  };

  // Mass payroll submit
  const handleMassProcess = async (e) => {
    e.preventDefault();
    if (!massData.fromDate || !massData.toDate) {
      alert('Period From and Period To are required');
      return;
    }
    setMassSubmitting(true);
    try {
      const res = await api.post('/payrolls/mass', massData);
      if (res.success) {
        alert(res.message || 'Mass payroll completed successfully');
        setIsMassModalOpen(false);
        await fetchPayrolls();
      }
    } catch (err) {
      alert(err.message || 'Failed to process mass payroll');
    } finally {
      setMassSubmitting(false);
    }
  };

  // Approve payroll
  const handleApprove = async (id) => {
    try {
      const response = await api.patch(`/payrolls/${id}/approve`, {
        approvedBy: user?._id
      });
      if (response.success) {
        await fetchPayrolls();
      }
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  };

  // Mark payroll as paid
  const handleMarkPaid = async (id) => {
    try {
      const response = await api.patch(`/payrolls/${id}/pay`);
      if (response.success) {
        setPayrolls((prev) =>
          prev.map((p) => (p._id === id ? { ...p, status: 'paid', paidAt: new Date() } : p))
        );
      }
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    }
  };

  // Print Payslip
  const handleOpenSlip = (item) => {
    setSelectedSlip(item);
    setIsSlipOpen(true);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-specific style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 24px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary-500" />
            <span>{t('nav.payroll')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Section 2.5 • Monthly payslips, gross calculations, deductions, and financial approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPayrolls}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canApprove && (
            <>
              <button
                onClick={() => setIsMassModalOpen(true)}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
                title="Process monthly payroll for all active employees"
              >
                <Users className="w-4 h-4" />
                <span>Mass Payroll</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>{t('actions.createPayroll')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading payroll calculations...
        </div>
      ) : payrolls.length === 0 ? (
        <EmptyState
          title="No payroll records generated"
          message="No monthly payroll calculated yet. Click above to process payroll individually or in mass."
          actionText={canApprove ? t('actions.createPayroll') : null}
          onAction={() => setIsModalOpen(true)}
          icon={CreditCard}
        />
      ) : (
        <>
          {/* Mobile Card Deck (< md) */}
          <div className="block md:hidden space-y-3">
            {payrolls.map((item) => (
              <div
                key={item._id}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.employeeId?.fullName || 'Employee'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge status={item.status} text={item.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 text-xs text-center border-y border-slate-100 dark:border-slate-700/60">
                  <div>
                    <div className="text-slate-400 text-[10px]">Gross</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {item.totalGross?.toLocaleString()} {item.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Deductions</div>
                    <div className="font-bold text-rose-600">
                      -{item.totalDeduction?.toLocaleString()} {item.currency}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Net Pay</div>
                    <div className="font-black text-emerald-600">
                      {item.totalNet?.toLocaleString()} {item.currency}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => handleOpenSlip(item)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5 text-primary-500" />
                    <span>Print Slip</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!item.approvedBy && canApprove && (
                      <button
                        onClick={() => handleApprove(item._id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition"
                      >
                        Approve
                      </button>
                    )}
                    {/* Mark paid is strictly shown only when approved */}
                    {Boolean(item.approvedBy) && item.status !== 'paid' && canPay && (
                      <button
                        onClick={() => handleMarkPaid(item._id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
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
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Gross Salary</th>
                  <th className="px-4 py-3 text-right">Deductions</th>
                  <th className="px-4 py-3 text-right">Net Payable</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {payrolls.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.employeeId?.fullName || 'Employee'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.employeeId?.department} • {item.employeeId?.position || 'Staff'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {item.totalGross?.toLocaleString()} {item.currency}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600">
                      -{item.totalDeduction?.toLocaleString()} {item.currency}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">
                      {item.totalNet?.toLocaleString()} {item.currency}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <Badge status={item.status} text={item.status} />
                        {item.approvedBy && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Approved
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* Print Slip Action */}
                      <button
                        onClick={() => handleOpenSlip(item)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition inline-flex items-center gap-1"
                        title="Print Payslip"
                      >
                        <Printer className="w-3.5 h-3.5 text-primary-500" />
                        <span>Slip</span>
                      </button>

                      {/* Approve Button */}
                      {!item.approvedBy && canApprove && (
                        <button
                          onClick={() => handleApprove(item._id)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition"
                        >
                          Approve
                        </button>
                      )}

                      {/* Mark Paid button - shown strictly when approved */}
                      {Boolean(item.approvedBy) && item.status !== 'paid' && canPay && (
                        <button
                          onClick={() => handleMarkPaid(item._id)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 transition"
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

      {/* Modal 1: Create Single Payroll Process */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createPayroll')}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleProcessPayroll} className="space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={formData.employeeId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
            >
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.fullName} ({emp.department} - Base: {emp.baseSalary || 15000} ETB)
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Period From <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.fromDate}
                onChange={(e) => setFormData({ ...formData, fromDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Period To <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.toDate}
                onChange={(e) => setFormData({ ...formData, toDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Earnings Breakdown Section */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Earnings & Gross Allowances
              </span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                Subtotal: {formData.totalGross?.toLocaleString()} ETB
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {formData.earnings.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      +{Number(item.amount)?.toLocaleString()} ETB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEarning(idx)}
                      className="text-slate-400 hover:text-rose-500 transition p-0.5"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {formData.earnings.length === 0 && (
                <p className="text-[11px] text-slate-400 italic">No earning items specified.</p>
              )}
            </div>

            {/* Simplified Add Earning Row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Earning item (e.g. Transport, Bonus)"
                value={newEarningName}
                onChange={(e) => setNewEarningName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="number"
                placeholder="Amount (ETB)"
                value={newEarningAmount}
                onChange={(e) => setNewEarningAmount(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-primary-500 font-medium"
              />
              <button
                type="button"
                onClick={handleAddEarning}
                disabled={!newEarningName.trim() || !newEarningAmount}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Deductions Breakdown Section */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Deductions & Statutory Taxes
              </span>
              <span className="text-xs font-black text-rose-600 dark:text-rose-400">
                Subtotal: -{formData.totalDeduction?.toLocaleString()} ETB
              </span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {formData.deductions.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      -{Number(item.amount)?.toLocaleString()} ETB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(idx)}
                      className="text-slate-400 hover:text-rose-500 transition p-0.5"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {formData.deductions.length === 0 && (
                <p className="text-[11px] text-slate-400 italic">No deduction items specified.</p>
              )}
            </div>

            {/* Simplified Add Deduction Row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Deduction item (e.g. Loan, Advance)"
                value={newDeductionName}
                onChange={(e) => setNewDeductionName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-primary-500"
              />
              <input
                type="number"
                placeholder="Amount (ETB)"
                value={newDeductionAmount}
                onChange={(e) => setNewDeductionAmount(e.target.value)}
                className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-primary-500 text-rose-600 font-medium"
              />
              <button
                type="button"
                onClick={handleAddDeduction}
                disabled={!newDeductionName.trim() || !newDeductionAmount}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Computed Summary */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-center">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Gross</div>
              <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                {formData.totalGross?.toLocaleString()} ETB
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Deductions</div>
              <div className="text-sm font-black text-rose-600">
                -{formData.totalDeduction?.toLocaleString()} ETB
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500">Net Payable</div>
              <div className="text-sm font-black text-emerald-600">
                {formData.totalNet?.toLocaleString()} ETB
              </div>
            </div>
          </div>

          {/* Form Actions */}
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
              {submitting ? 'Calculating...' : 'Generate Payroll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Mass Payroll Process */}
      <Modal
        isOpen={isMassModalOpen}
        onClose={() => setIsMassModalOpen(false)}
        title="Mass Payroll Process"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleMassProcess} className="space-y-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-indigo-600" />
              Batch Salary Generation
            </p>
            Generates monthly payroll records for all active employees. Calculates Ethiopian statutory 7% pension contribution and progressive income tax (Proclamation 979/2016) from base salary. Existing records for the same period will automatically be skipped.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Period From <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={massData.fromDate}
                onChange={(e) => setMassData({ ...massData, fromDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Period To <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={massData.toDate}
                onChange={(e) => setMassData({ ...massData, toDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payroll Type
              </label>
              <select
                value={massData.type}
                onChange={(e) => setMassData({ ...massData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="salary">Regular Salary</option>
                <option value="bonus">Bonus Distribution</option>
                <option value="commission">Commission</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <input
                type="text"
                disabled
                value={massData.currency}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsMassModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={massSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {massSubmitting ? 'Processing Batch...' : 'Run Mass Payroll'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Printable Payslip Studio */}
      <Modal
        isOpen={isSlipOpen}
        onClose={() => setIsSlipOpen(false)}
        title="Payslip Voucher"
        maxWidth="max-w-2xl"
      >
        {selectedSlip && (
          <div className="space-y-4">
            {/* Printable Payslip Container */}
            <div
              id="printable-payslip"
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 space-y-5"
            >
              {/* Slip Header */}
              <div className="border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                    GT-ERP SYSTEMS
                  </h2>
                  <p className="text-xs uppercase font-bold tracking-widest text-primary-600 dark:text-primary-400">
                    Confidential Employee Payslip
                  </p>
                </div>
                <div className="sm:text-right text-xs text-slate-500 dark:text-slate-400">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Slip Reference: #{selectedSlip._id?.slice(-8).toUpperCase()}
                  </p>
                  <p>
                    Period: {new Date(selectedSlip.fromDate).toLocaleDateString()} –{' '}
                    {new Date(selectedSlip.toDate).toLocaleDateString()}
                  </p>
                  <p>Issue Date: {new Date(selectedSlip.createdAt || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Employee Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Employee Name</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {selectedSlip.employeeId?.fullName || 'Employee'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Department / Role</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSlip.employeeId?.department || 'N/A'} • {selectedSlip.employeeId?.position || 'Staff'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Account</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSlip.employeeId?.accountDetails?.[0]
                      ? `${selectedSlip.employeeId.accountDetails[0].bankName} (${selectedSlip.employeeId.accountDetails[0].accountNumber})`
                      : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Status</span>
                  <span className="font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    {selectedSlip.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Approval</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {selectedSlip.approvedBy ? (selectedSlip.approvedBy?.fullName || 'Approved') : 'Pending Approval'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Currency</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedSlip.currency || 'ETB'}
                  </span>
                </div>
              </div>

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Earnings */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Earnings</span>
                    <span>Amount ({selectedSlip.currency})</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {selectedSlip.earnings && selectedSlip.earnings.length > 0 ? (
                      selectedSlip.earnings.map((e, idx) => (
                        <div key={idx} className="px-3.5 py-2 flex justify-between">
                          <span className="text-slate-700 dark:text-slate-300">{e.name}</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {Number(e.amount)?.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3.5 py-2 flex justify-between">
                        <span className="text-slate-700 dark:text-slate-300">Gross Salary</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {selectedSlip.totalGross?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="px-3.5 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 font-bold flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Total Gross Pay</span>
                      <span>{selectedSlip.totalGross?.toLocaleString()} {selectedSlip.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex justify-between">
                    <span>Deductions</span>
                    <span>Amount ({selectedSlip.currency})</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {selectedSlip.deductions && selectedSlip.deductions.length > 0 ? (
                      selectedSlip.deductions.map((d, idx) => (
                        <div key={idx} className="px-3.5 py-2 flex justify-between">
                          <span className="text-slate-700 dark:text-slate-300">{d.name}</span>
                          <span className="font-bold text-rose-600">
                            -{Number(d.amount)?.toLocaleString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-3.5 py-2 flex justify-between">
                        <span className="text-slate-700 dark:text-slate-300">Total Deductions</span>
                        <span className="font-bold text-rose-600">
                          -{selectedSlip.totalDeduction?.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="px-3.5 py-2.5 bg-rose-50/50 dark:bg-rose-950/20 font-bold flex justify-between text-rose-700 dark:text-rose-400">
                      <span>Total Deductions</span>
                      <span>-{selectedSlip.totalDeduction?.toLocaleString()} {selectedSlip.currency}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white dark:bg-primary-950 dark:border dark:border-primary-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">
                    Net Take-Home Pay
                  </span>
                  <span className="text-2xl font-black text-emerald-400">
                    {selectedSlip.totalNet?.toLocaleString()} {selectedSlip.currency}
                  </span>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <span className="font-semibold block">Disbursement Mode</span>
                  <span>Direct Bank Transfer</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 mb-1" />
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {selectedSlip.createdBy?.fullName || 'HR Officer'}
                  </span>
                  <p className="text-[10px]">Prepared By</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 mb-1" />
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {selectedSlip.approvedBy?.fullName || 'Finance Director'}
                  </span>
                  <p className="text-[10px]">Approved By</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-300 dark:border-slate-700 mb-1" />
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {selectedSlip.employeeId?.fullName || 'Employee Signature'}
                  </span>
                  <p className="text-[10px]">Acknowledged By</p>
                </div>
              </div>
            </div>

            {/* Slip Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => setIsSlipOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="px-5 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Payslip</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
