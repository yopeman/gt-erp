import React, { useState, useEffect } from 'react';
import { 
  ArrowDownRight, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  Eye, 
  CreditCard, 
  Building2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import financeService from '../../services/financeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

export default function SupplierBills() {
  const [activeTab, setActiveTab] = useState('bills'); // 'bills' | 'payments'
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    bankAccount: '',
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    withholdingReceiptNumber: '',
    notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billsRes, paymentsRes, banksRes] = await Promise.allSettled([
        financeService.getSupplierBills(),
        financeService.getSupplierPayments(),
        financeService.getBankAccounts()
      ]);

      setBills(billsRes.status === 'fulfilled' && billsRes.value?.data ? billsRes.value.data : []);
      setPayments(paymentsRes.status === 'fulfilled' && paymentsRes.value?.data ? paymentsRes.value.data : []);
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

  const openPayModal = (bill) => {
    setSelectedBill(bill);
    setPaymentForm({
      amount: bill.financials?.remainingBalance || 0,
      bankAccount: bankAccounts[0]?._id || '',
      paymentMethod: 'bank_transfer',
      referenceNumber: '',
      withholdingReceiptNumber: '',
      notes: `Settlement for Bill ${bill.billNumber}`
    });
    setError('');
    setIsPaymentModalOpen(true);
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    if (!selectedBill) return;

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        paymentNumber: `SPAY-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        supplier: selectedBill.supplier?._id || selectedBill.supplier,
        supplierBill: selectedBill._id,
        purchaseOrder: selectedBill.purchaseOrder?._id || selectedBill.purchaseOrder,
        bankAccount: paymentForm.bankAccount,
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: new Date(),
        amount: Number(paymentForm.amount),
        referenceNumber: paymentForm.referenceNumber,
        withholdingReceiptNumber: paymentForm.withholdingReceiptNumber,
        paidBy: bankAccounts[0]?._id, // fallback employee id or current user id
        notes: paymentForm.notes
      };

      await financeService.createSupplierPayment(payload);
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err?.message || 'Failed to submit supplier payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val || 0);
  };

  const filteredBills = bills.filter(b => {
    const matchSearch = (b.billNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                        (b.supplierInvoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                        (b.supplier?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.paymentStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowDownRight className="h-7 w-7 text-primary-500" />
            Accounts Payable & Supplier Invoices
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supplier bills matched against POs and warehouse GRVs, with 2% WHT and 15% Input VAT.
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
          onClick={() => setActiveTab('bills')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'bills'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Supplier Bills ({bills.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Disbursements & Payments ({payments.length})
        </button>
      </div>

      {activeTab === 'bills' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Bill #, Supplier name or vendor invoice #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="w-full sm:w-56">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Payment Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Fully Settled</option>
              </select>
            </div>
          </div>

          {/* Bills Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Bill Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">15% VAT</th>
                    <th className="py-3 px-4 text-right">2% WHT</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Remaining Due</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-slate-400">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary-500" />
                        Loading Supplier Bills...
                      </td>
                    </tr>
                  ) : filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-12 text-center text-slate-400">
                        No supplier bills found.
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-primary-600 dark:text-primary-400 text-xs">
                          {b.billNumber}
                          <div className="text-[10px] text-slate-400 font-normal">Inv: {b.supplierInvoiceNumber}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white text-xs">
                          {b.supplier?.name || 'Supplier'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-right text-xs">
                          {formatCurrency(b.financials?.subtotal)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-blue-600 dark:text-blue-400">
                          {formatCurrency(b.financials?.vatAmount)}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-amber-600 dark:text-amber-400">
                          -{formatCurrency(b.financials?.withholdingTaxAmount)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-xs">
                          {formatCurrency(b.financials?.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-xs text-rose-600 dark:text-rose-400">
                          {formatCurrency(b.financials?.remainingBalance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                            b.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            b.paymentStatus === 'partially_paid' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {(b.paymentStatus || 'unpaid').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {b.paymentStatus !== 'paid' && (
                            <button
                              onClick={() => openPayModal(b)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400 hover:bg-primary-100"
                            >
                              Pay Bill
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
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Payment #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Bill Reference</th>
                  <th className="py-3 px-4">Bank Account</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Amount (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-slate-400">
                      No supplier disbursements recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{p.paymentNumber}</td>
                      <td className="py-3 px-4 text-xs">{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 font-medium text-xs">{p.supplier?.name || 'Supplier'}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{p.supplierBill?.billNumber || 'Bill'}</td>
                      <td className="py-3 px-4 text-xs font-medium">{p.bankAccount?.accountName || 'Bank'}</td>
                      <td className="py-3 px-4 text-xs capitalize">{(p.paymentMethod || '').replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 text-right font-bold text-xs">{formatCurrency(p.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 capitalize">
                          {p.status || 'cleared'}
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

      {/* Pay Supplier Modal */}
      {selectedBill && (
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Pay Supplier Bill: ${selectedBill.billNumber}`}
        >
          <form onSubmit={handleCreatePayment} className="space-y-4">
            {error && <div className="text-rose-500 text-xs">{error}</div>}

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="font-semibold">{selectedBill.supplier?.name || 'Supplier'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Bill Amount:</span>
                <span className="font-semibold">{formatCurrency(selectedBill.financials?.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Outstanding Balance:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(selectedBill.financials?.remainingBalance)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Disbursement Amount (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedBill.financials?.remainingBalance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-bold text-primary-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Funding Bank / Wallet *</label>
                <select
                  required
                  value={paymentForm.bankAccount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankAccount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                >
                  <option value="">Select Bank...</option>
                  {bankAccounts.map(b => (
                    <option key={b._id} value={b._id}>{b.accountName} ({formatCurrency(b.currentBalance)})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="cpo">CPO</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Bank Reference / Check #</label>
                <input
                  type="text"
                  placeholder="e.g. FT26101928"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Withholding Tax Certificate # (2% WHT)</label>
              <input
                type="text"
                placeholder="e.g. WHT-2026-987"
                value={paymentForm.withholdingReceiptNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, withholdingReceiptNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
              >
                Post Disbursement
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

