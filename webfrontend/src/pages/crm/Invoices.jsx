import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  DollarSign,
  Plus,
  Search,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Printer,
  Eye,
  Clock,
  Building2,
  User,
  ArrowRight
} from 'lucide-react';

const PAYMENT_STATUSES = [
  { value: 'all', label: 'All Payment Statuses' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'paid', label: 'Fully Paid' }
];

export default function Invoices() {
  const { t } = useTranslation();

  const [invoices, setInvoices] = useState([]);
  const [orders, setOrders] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isOrderInvoiceModalOpen, setIsOrderInvoiceModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState(null);

  // Record Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'bank_transfer',
    referenceNumber: '',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    notes: ''
  });

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.paymentStatus = statusFilter;

      const [invRes, metricsRes] = await Promise.all([
        crmService.getInvoices(params),
        crmService.getInvoiceMetrics()
      ]);

      setInvoices(invRes.data?.invoices || invRes.invoices || []);
      setMetrics(metricsRes.data || metricsRes);
    } catch (err) {
      setError(err?.message || 'Failed to fetch tax invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersForInvoicing = async () => {
    try {
      const res = await crmService.getOrders({ limit: 100 });
      // Orders that do not yet have an invoice assigned
      const unInvoiced = (res.data?.orders || res.orders || []).filter((o) => !o.invoice);
      setOrders(unInvoiced);
      if (unInvoiced.length > 0) {
        setSelectedOrderId(unInvoiced[0]._id);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  useEffect(() => {
    fetchOrdersForInvoicing();
  }, []);

  const handleIssueInvoiceFromOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    try {
      setSubmitting(true);
      await crmService.createInvoiceFromOrder(selectedOrderId, {});
      setIsOrderInvoiceModalOpen(false);
      fetchInvoices();
      fetchOrdersForInvoicing();
      alert('Official tax invoice issued successfully!');
    } catch (err) {
      alert(err?.message || 'Failed to issue invoice from order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPaymentModal = (invoice) => {
    setPaymentModalInvoice(invoice);
    setPaymentForm({
      amount: invoice.remainingBalance || invoice.grandTotal,
      paymentMethod: 'bank_transfer',
      referenceNumber: '',
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      notes: ''
    });
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!paymentModalInvoice) return;
    try {
      setSubmitting(true);
      await crmService.recordCustomerPayment({
        invoiceId: paymentModalInvoice._id,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        bankDetails: { bankName: paymentForm.bankName },
        notes: paymentForm.notes
      });
      setPaymentModalInvoice(null);
      fetchInvoices();
      alert('Payment receipt successfully recorded and credit balance updated!');
    } catch (err) {
      alert(err?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = async (id) => {
    try {
      const res = await crmService.getInvoiceById(id);
      setViewingInvoice(res.data || res);
    } catch (err) {
      alert(err?.message || 'Failed to load invoice details');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(val || 0);
  };

  const getPaymentBadgeVariant = (st) => {
    switch (st) {
      case 'paid': return 'success';
      case 'partially_paid': return 'warning';
      case 'unpaid': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-primary-500" />
            Official Tax Invoices & Receivables
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate Ethiopian VAT invoices, track customer receivables, and register collections directly against ledger balances.
          </p>
        </div>

        <button
          onClick={() => setIsOrderInvoiceModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Issue Invoice from Order
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Financial Metrics Ribbon */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {formatCurrency(metrics.totalInvoiced)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Collected Revenue</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(metrics.totalPaid)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Due</span>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {formatCurrency(metrics.totalReceivables)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overdue Invoices</span>
            <div className={`text-2xl font-black mt-1 ${metrics.overdueInvoicesCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
              {metrics.overdueInvoicesCount}
            </div>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchInvoices()}
            placeholder="Search by invoice # or client TIN..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading tax invoices...</div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices issued yet"
            description="Generate official tax invoices from confirmed customer orders."
            actionLabel="Issue Invoice"
            onAction={() => setIsOrderInvoiceModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid Amount</th>
                  <th className="py-3 px-4">Remaining Balance</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{inv.customer?.name}</div>
                      {inv.customerTin && (
                        <div className="text-[10px] text-slate-400">TIN: {inv.customerTin}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(inv.remainingBalance)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getPaymentBadgeVariant(inv.paymentStatus)}>
                        {inv.paymentStatus.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewInvoice(inv._id)}
                          title="View Official Tax Invoice"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {inv.paymentStatus !== 'paid' && (
                          <button
                            onClick={() => handleOpenPaymentModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Record Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Invoice from Order Modal */}
      <Modal
        isOpen={isOrderInvoiceModalOpen}
        onClose={() => setIsOrderInvoiceModalOpen(false)}
        title="Issue Official Tax Invoice from Sales Order"
      >
        <form onSubmit={handleIssueInvoiceFromOrder} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a confirmed sales order. The system will generate an official tax invoice with 15% VAT and update the client's credit receivables balance.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Sales Order *
            </label>
            <select
              required
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {orders.length === 0 ? (
                <option value="">No un-invoiced orders available</option>
              ) : (
                orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} - {o.customer?.name} ({formatCurrency(o.financials?.grandTotal)})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOrderInvoiceModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || orders.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {submitting ? 'Issuing...' : 'Generate Tax Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Customer Payment Modal */}
      {paymentModalInvoice && (
        <Modal
          isOpen={Boolean(paymentModalInvoice)}
          onClose={() => setPaymentModalInvoice(null)}
          title={`Record Payment for ${paymentModalInvoice.invoiceNumber}`}
        >
          <form onSubmit={handleSavePayment} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Client</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {paymentModalInvoice.customer?.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Remaining Balance</span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                  {formatCurrency(paymentModalInvoice.remainingBalance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Amount (ETB) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={paymentModalInvoice.remainingBalance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Channel / Method *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="bank_transfer">Bank Transfer (CBE / Dashen / Awash)</option>
                  <option value="check">Bank Cheque / CPO</option>
                  <option value="telebirr">Telebirr Merchant</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="cash">Cash in Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reference # / Cheque #
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-9988221 or Cheque #00441"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={paymentForm.bankName}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Notes</label>
              <textarea
                rows="2"
                placeholder="Optional notes or depositor name..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPaymentModalInvoice(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Confirm Receipt'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Official Tax Invoice Dossier Modal */}
      {viewingInvoice && (
        <Modal
          isOpen={Boolean(viewingInvoice)}
          onClose={() => setViewingInvoice(null)}
          title={`Official Tax Invoice: ${viewingInvoice.invoiceNumber}`}
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 text-xs printable-area">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">GT PRINTING PRESS PLC</h2>
                <p className="text-slate-500 text-xs">Official VAT / Tax Commercial Invoice</p>
                <div className="text-[11px] text-slate-400 mt-1">Company TIN: 0012998844 • VAT Reg: 998811</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-primary-600">{viewingInvoice.invoiceNumber}</div>
                <div className="text-slate-400 text-[11px]">Issued: {new Date(viewingInvoice.issueDate).toLocaleDateString()}</div>
                <div className="text-slate-400 text-[11px]">Due Date: {new Date(viewingInvoice.dueDate).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Billed To:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{viewingInvoice.customer?.name}</div>
                <div className="text-slate-500">TIN: {viewingInvoice.customerTin || 'N/A'}</div>
                {viewingInvoice.customerVat && (
                  <div className="text-slate-500">VAT: {viewingInvoice.customerVat}</div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Payment Status:</span>
                <div className="mt-1">
                  <Badge variant={getPaymentBadgeVariant(viewingInvoice.paymentStatus)}>
                    {viewingInvoice.paymentStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="border rounded-xl border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingInvoice.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{it.itemDescription}</td>
                      <td className="py-2.5 px-3 text-right">{it.quantity?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(it.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financials & Balances */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(viewingInvoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>15% Ethiopian VAT:</span>
                <span>{formatCurrency(viewingInvoice.vatAmount)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                <span>Grand Total:</span>
                <span>{formatCurrency(viewingInvoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400 pt-1">
                <span>Paid to Date:</span>
                <span className="text-emerald-400">{formatCurrency(viewingInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-400 border-t border-slate-800 pt-1">
                <span>Remaining Due:</span>
                <span>{formatCurrency(viewingInvoice.remainingBalance)}</span>
              </div>
            </div>

            {/* Payment Receipts History */}
            {viewingInvoice.payments?.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Collections & Receipt Vouchers
                </h4>
                <div className="divide-y border rounded-xl border-slate-200 dark:border-slate-800 divide-slate-100 dark:divide-slate-800">
                  {viewingInvoice.payments.map((p) => (
                    <div key={p._id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">Receipt: {p.receiptNumber}</div>
                        <div className="text-[11px] text-slate-400 capitalize">
                          {p.paymentMethod.replace(/_/g, ' ')} • {new Date(p.paymentDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(p.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <Printer className="w-4 h-4" /> Print Tax Invoice
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

