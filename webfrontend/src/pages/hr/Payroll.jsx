import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import api from '../../services/api';
import { CreditCard, Plus, CheckCircle, DollarSign, RefreshCw } from 'lucide-react';

export default function Payroll() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canApprove = hasRole(['admin', 'hr', 'finance']);
  const canPay = hasRole(['admin', 'finance']);

  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employeeId: '',
    fromDate: '',
    toDate: '',
    currency: 'ETB',
    type: 'salary',
    totalGross: 18000,
    totalDeduction: 2500,
    totalNet: 15500
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
          const gross = emp.baseSalary || 18000;
          const ded = Math.round(gross * 0.15);
          setFormData((prev) => ({
            ...prev,
            employeeId: emp._id,
            totalGross: gross,
            totalDeduction: ded,
            totalNet: gross - ded
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
  }, []);

  const handleSelectEmployee = (empId) => {
    const emp = employees.find((e) => e._id === empId);
    const gross = emp?.baseSalary || 15000;
    const ded = Math.round(gross * 0.15);
    setFormData((prev) => ({
      ...prev,
      employeeId: empId,
      totalGross: gross,
      totalDeduction: ded,
      totalNet: gross - ded
    }));
  };

  const handleGrossChange = (val) => {
    const gross = Number(val) || 0;
    const ded = Number(formData.totalDeduction) || 0;
    setFormData((prev) => ({
      ...prev,
      totalGross: gross,
      totalNet: gross - ded
    }));
  };

  const handleDeductionChange = (val) => {
    const ded = Number(val) || 0;
    const gross = Number(formData.totalGross) || 0;
    setFormData((prev) => ({
      ...prev,
      totalDeduction: ded,
      totalNet: gross - ded
    }));
  };

  const handleProcessPayroll = async (e) => {
    e.preventDefault();
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

  const handleApprove = async (id) => {
    try {
      const response = await api.patch(`/payrolls/${id}/approve`);
      if (response.success) {
        setPayrolls((prev) =>
          prev.map((p) => (p._id === id ? { ...p, approvedBy: 'Approved' } : p))
        );
        await fetchPayrolls();
      }
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  };

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

  return (
    <div className="space-y-6">
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
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{t('actions.createPayroll')}</span>
            </button>
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
          message="No monthly payroll calculated yet. Click the button above to generate a salary statement."
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
                    <div className="font-bold text-slate-800 dark:text-slate-200">{item.totalGross} {item.currency}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Deductions</div>
                    <div className="font-bold text-rose-600">{item.totalDeduction} {item.currency}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px]">Net Pay</div>
                    <div className="font-black text-emerald-600">{item.totalNet} {item.currency}</div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {!item.approvedBy && canApprove && (
                    <button
                      onClick={() => handleApprove(item._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Approve
                    </button>
                  )}
                  {item.status !== 'paid' && canPay && (
                    <button
                      onClick={() => handleMarkPaid(item._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                    >
                      Disburse / Pay
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
                      <div className="text-[11px] text-slate-400">{item.employeeId?.department}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(item.fromDate).toLocaleDateString()} - {new Date(item.toDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                      {item.totalGross?.toLocaleString()} {item.currency}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-600">
                      {item.totalDeduction?.toLocaleString()} {item.currency}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-emerald-600">
                      {item.totalNet?.toLocaleString()} {item.currency}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={item.status} text={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      {!item.approvedBy && canApprove && (
                        <button
                          onClick={() => handleApprove(item._id)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg text-blue-700 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 transition"
                        >
                          Approve
                        </button>
                      )}
                      {item.status !== 'paid' && canPay && (
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('actions.createPayroll')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleProcessPayroll} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Employee
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Period From
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
                Period To
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

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Gross (ETB)
              </label>
              <input
                type="number"
                required
                value={formData.totalGross}
                onChange={(e) => handleGrossChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deductions (ETB)
              </label>
              <input
                type="number"
                required
                value={formData.totalDeduction}
                onChange={(e) => handleDeductionChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 text-rose-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Total Net (ETB)
              </label>
              <input
                type="number"
                readOnly
                value={formData.totalNet}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm text-emerald-600 font-black"
              />
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
              {submitting ? 'Calculating...' : 'Generate Payroll'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
