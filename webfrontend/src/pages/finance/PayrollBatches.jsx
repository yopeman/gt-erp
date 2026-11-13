import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  UserCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  Building2
} from 'lucide-react';
import financeService from '../../services/financeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

export default function PayrollBatches() {
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'advances'
  const [batches, setBatches] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [disburseForm, setDisburseForm] = useState({
    bankAccount: '',
    disbursementMethod: 'bank_bulk_transfer',
    bankTransactionReference: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, advRes, banksRes] = await Promise.allSettled([
        financeService.getPayrollBatches(),
        financeService.getEmployeeAdvances(),
        financeService.getBankAccounts()
      ]);

      setBatches(batchesRes.status === 'fulfilled' && batchesRes.value?.data ? batchesRes.value.data : []);
      setAdvances(advRes.status === 'fulfilled' && advRes.value?.data ? advRes.value.data : []);
      setBankAccounts(banksRes.status === 'fulfilled' && banksRes.value?.data ? banksRes.value.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openDisburseModal = (b) => {
    setSelectedBatch(b);
    setDisburseForm({
      bankAccount: b.bankAccount?._id || bankAccounts[0]?._id || '',
      disbursementMethod: b.disbursementMethod || 'bank_bulk_transfer',
      bankTransactionReference: ''
    });
    setError('');
    setIsDisburseModalOpen(true);
  };

  const handleDisburse = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setSubmitting(true);
    setError('');
    try {
      await financeService.disbursePayrollBatch(selectedBatch._id, disburseForm);
      setIsDisburseModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err?.message || 'Failed to disburse payroll batch');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val || 0);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary-500" />
            Payroll Mass Disbursements & Employee Advances
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Bulk salary payouts, 7% & 11% pension liability, employment income tax & advance deductions.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="btn btn-outline border-slate-300 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('batches')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'batches'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Payroll Batches ({batches.length})
        </button>
        <button
          onClick={() => setActiveTab('advances')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'advances'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Employee Loans & Advances ({advances.length})
        </button>
      </div>

      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Headcount</th>
                  <th className="py-3 px-4 text-right">Gross Pay</th>
                  <th className="py-3 px-4 text-right">Income Tax</th>
                  <th className="py-3 px-4 text-right">Pension (18%)</th>
                  <th className="py-3 px-4 text-right">Net Payout</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-slate-400">
                      No payroll disbursement batches created yet.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{b.batchNumber}</td>
                      <td className="py-3 px-4 text-xs font-medium">{b.month}/{b.year}</td>
                      <td className="py-3 px-4 text-xs font-semibold">{b.employeeCount} staff</td>
                      <td className="py-3 px-4 text-right text-xs">{formatCurrency(b.financialSummary?.totalGrossPay)}</td>
                      <td className="py-3 px-4 text-right text-xs text-rose-600">{formatCurrency(b.financialSummary?.totalEmploymentIncomeTax)}</td>
                      <td className="py-3 px-4 text-right text-xs text-amber-600">
                        {formatCurrency((b.financialSummary?.totalEmployeePension || 0) + (b.financialSummary?.totalEmployerPension || 0))}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(b.financialSummary?.totalNetSalaryDisbursement)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          b.status === 'disbursed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {b.status || 'draft'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.status !== 'disbursed' && (
                          <button
                            onClick={() => openDisburseModal(b)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100"
                          >
                            Disburse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'advances' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Advance #</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Approved Amount</th>
                  <th className="py-3 px-4 text-right">Repaid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-400">
                      No employee salary advances requested yet.
                    </td>
                  </tr>
                ) : (
                  advances.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{a.advanceNumber}</td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {a.employee?.firstName ? `${a.employee.firstName} ${a.employee.lastName}` : 'Staff Member'}
                      </td>
                      <td className="py-3 px-4 text-xs">{a.requestDate ? new Date(a.requestDate).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 text-right font-medium text-xs">{formatCurrency(a.approvedAmount)}</td>
                      <td className="py-3 px-4 text-right text-xs text-emerald-600">{formatCurrency(a.totalRepaidAmount)}</td>
                      <td className="py-3 px-4 text-right font-bold text-xs text-rose-600">{formatCurrency(a.remainingBalance)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {(a.status || 'requested').replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disburse Modal */}
      {selectedBatch && (
        <Modal
          isOpen={isDisburseModalOpen}
          onClose={() => setIsDisburseModalOpen(false)}
          title={`Execute Salary Payout: ${selectedBatch.batchNumber}`}
        >
          <form onSubmit={handleDisburse} className="space-y-4">
            {error && <div className="text-rose-500 text-xs">{error}</div>}

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Payroll Month:</span>
                <span className="font-semibold">{selectedBatch.month}/{selectedBatch.year}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Staff:</span>
                <span className="font-semibold">{selectedBatch.employeeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Net Disbursement:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {formatCurrency(selectedBatch.financialSummary?.totalNetSalaryDisbursement)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Funding Bank Account *</label>
              <select
                required
                value={disburseForm.bankAccount}
                onChange={(e) => setDisburseForm({ ...disburseForm, bankAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select Bank Account...</option>
                {bankAccounts.map(b => (
                  <option key={b._id} value={b._id}>{b.accountName} (Balance: {formatCurrency(b.currentBalance)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Bank Bulk Reference #</label>
              <input
                type="text"
                placeholder="e.g. CBE-SALARY-202610"
                value={disburseForm.bankTransactionReference}
                onChange={(e) => setDisburseForm({ ...disburseForm, bankTransactionReference: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsDisburseModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Disburse & Generate Ledger Entry
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

