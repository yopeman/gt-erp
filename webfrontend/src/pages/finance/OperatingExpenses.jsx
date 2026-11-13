import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Wrench, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign,
  Building2
} from 'lucide-react';
import financeService from '../../services/financeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

export default function OperatingExpenses() {
  const [vouchers, setVouchers] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    expenseAccount: '',
    costCenter: 'production_floor',
    vendorName: '',
    description: '',
    amount: '',
    vatRate: 0,
    withholdingTaxRate: 0,
    bankAccount: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    status: 'draft'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vouchersRes, banksRes, coaRes] = await Promise.allSettled([
        financeService.getExpenseVouchers(),
        financeService.getBankAccounts(),
        financeService.getAccounts()
      ]);

      setVouchers(vouchersRes.status === 'fulfilled' && vouchersRes.value?.data ? vouchersRes.value.data : []);
      setBankAccounts(banksRes.status === 'fulfilled' && banksRes.value?.data ? banksRes.value.data : []);
      const accounts = coaRes.status === 'fulfilled' && coaRes.value?.data ? coaRes.value.data : [];
      setExpenseAccounts(accounts.filter(a => a.accountType === 'expense' || a.accountType === 'cogs'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const baseAmount = Number(formData.amount) || 0;
  const vatAmount = (baseAmount * (Number(formData.vatRate) || 0)) / 100;
  const whtAmount = (baseAmount * (Number(formData.withholdingTaxRate) || 0)) / 100;
  const netPaidAmount = baseAmount + vatAmount - whtAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...formData,
        voucherNumber: `EXP-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        amount: baseAmount,
        vatRate: Number(formData.vatRate) || 0,
        vatAmount,
        withholdingTaxRate: Number(formData.withholdingTaxRate) || 0,
        withholdingTaxAmount: whtAmount,
        netPaidAmount,
        recordedBy: bankAccounts[0]?._id // fallback employee profile
      };

      await financeService.createExpenseVoucher(payload);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err?.message || 'Failed to submit expense voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndPay = async (id) => {
    try {
      await financeService.approveAndPayExpenseVoucher(id);
      fetchData();
    } catch (err) {
      alert(err?.message || 'Payment approval failed');
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
            <Receipt className="h-7 w-7 text-primary-500" />
            Operating Expenses & Maintenance Costing
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Factory overheads, machine breakdown repair bills, logistics & administrative operating expenses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-outline border-slate-300 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => { setError(''); setIsCreateModalOpen(true); }}
            className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Expense Voucher
          </button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Voucher #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Cost Center</th>
                <th className="py-3 px-4">Expense Head</th>
                <th className="py-3 px-4">Vendor / Payee</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Net Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-slate-400">
                    No operating expense vouchers created yet.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{v.voucherNumber}</td>
                    <td className="py-3 px-4 text-xs">{v.expenseDate ? new Date(v.expenseDate).toLocaleDateString() : '-'}</td>
                    <td className="py-3 px-4 text-xs capitalize font-medium">{(v.costCenter || '').replace(/_/g, ' ')}</td>
                    <td className="py-3 px-4 text-xs">{v.expenseAccount?.accountName || 'Expense'}</td>
                    <td className="py-3 px-4 text-xs font-medium">{v.vendorName}</td>
                    <td className="py-3 px-4 text-xs max-w-xs truncate" title={v.description}>{v.description}</td>
                    <td className="py-3 px-4 text-right font-bold text-xs">{formatCurrency(v.netPaidAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        v.status === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {v.status || 'draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {v.status !== 'paid' && (
                        <button
                          onClick={() => handleApproveAndPay(v._id)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        >
                          Approve & Pay
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

      {/* New Voucher Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Record Operating Expense Voucher"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-rose-500 text-xs">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Expense Account (GL) *</label>
              <select
                required
                value={formData.expenseAccount}
                onChange={(e) => setFormData({ ...formData, expenseAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select Account...</option>
                {expenseAccounts.map(a => (
                  <option key={a._id} value={a._id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Cost Center *</label>
              <select
                value={formData.costCenter}
                onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="production_floor">Production Floor</option>
                <option value="plant_maintenance">Plant Maintenance</option>
                <option value="sales_and_marketing">Sales & Marketing</option>
                <option value="administration">Administration</option>
                <option value="logistics">Logistics</option>
                <option value="executive">Executive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Vendor / Payee Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. TotalEnergies Ethiopia"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Base Expense Amount (ETB) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">VAT Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.vatRate}
                onChange={(e) => setFormData({ ...formData, vatRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Withholding Tax Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={formData.withholdingTaxRate}
                onChange={(e) => setFormData({ ...formData, withholdingTaxRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs flex justify-between font-bold">
            <span>Net Paid Amount:</span>
            <span className="text-primary-600">{formatCurrency(netPaidAmount)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Payment Bank Account *</label>
              <select
                required
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select Account...</option>
                {bankAccounts.map(b => (
                  <option key={b._id} value={b._id}>{b.accountName} ({formatCurrency(b.currentBalance)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="telebirr">Telebirr</option>
                <option value="cash">Cash</option>
                <option value="petty_cash">Petty Cash</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Expense Description *</label>
            <textarea
              required
              rows="2"
              placeholder="e.g. Heidelberg 4-color offset machine replacement roller bearing"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Save Voucher
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

