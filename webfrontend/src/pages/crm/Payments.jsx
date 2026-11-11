import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import { extractArray, extractData } from '../../services/api';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  CreditCard,
  Search,
  Calendar,
  Clock,
  Printer,
  DollarSign,
  AlertCircle,
  Eye,
  Building2,
  User,
  CheckCircle2,
  Landmark,
  FileText
} from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'all', label: 'All Channels' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Bank Cheque / CPO' },
  { value: 'telebirr', label: 'Telebirr' },
  { value: 'cbe_birr', label: 'CBE Birr' },
  { value: 'cash', label: 'Cash in Hand' }
];

export default function Payments() {
  const { t } = useTranslation();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  // Modal
  const [viewingPayment, setViewingPayment] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (methodFilter !== 'all') params.paymentMethod = methodFilter;

      const res = await crmService.getCustomerPayments(params);
      setPayments(extractArray(res, 'payments'));
    } catch (err) {
      setError(err?.message || 'Failed to fetch customer payment vouchers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [methodFilter]);

  const handleViewPayment = async (id) => {
    try {
      const res = await crmService.getCustomerPaymentById(id);
      setViewingPayment(extractData(res));
    } catch (err) {
      alert(err?.message || 'Failed to load receipt details');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(val || 0);
  };

  const getMethodBadge = (m) => {
    switch (m) {
      case 'bank_transfer': return <Badge variant="primary">Bank Wire</Badge>;
      case 'check': return <Badge variant="indigo">Cheque</Badge>;
      case 'telebirr': return <Badge variant="cyan">Telebirr</Badge>;
      case 'cbe_birr': return <Badge variant="purple">CBE Birr</Badge>;
      case 'cash': return <Badge variant="success">Cash</Badge>;
      default: return <Badge variant="neutral">{m}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-primary-500" />
            Payment Receipts & Collections Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction history of settled accounts, bank transfers, cheque vouchers, and mobile payments.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
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
            onKeyDown={(e) => e.key === 'Enter' && fetchPayments()}
            placeholder="Search by receipt # or reference..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading payment collections...</div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No payment receipts found"
            description="Payments recorded against official invoices will appear in this ledger."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Payment Date</th>
                  <th className="py-3 px-4">Channel / Method</th>
                  <th className="py-3 px-4">Reference #</th>
                  <th className="py-3 px-4">Amount Collected</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {p.receiptNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.customer?.name || p.customer?.companyName || 'Customer'}</div>
                      {p.customer?.tinNumber && (
                        <div className="text-[10px] text-slate-400">TIN: {p.customer.tinNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-800 dark:text-slate-200 font-medium">
                      {p.invoice?.invoiceNumber || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {new Date(p.paymentDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {getMethodBadge(p.paymentMethod)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {p.referenceNumber || '-'}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewPayment(p._id)}
                        title="View Official Receipt Voucher"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Payment Receipt Voucher Modal */}
      {viewingPayment && (
        <Modal
          isOpen={Boolean(viewingPayment)}
          onClose={() => setViewingPayment(null)}
          title={`Payment Receipt Voucher: ${viewingPayment.receiptNumber}`}
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 text-xs printable-area">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">GT PRINTING PRESS PLC</h2>
                <p className="text-slate-500 text-xs">Official Customer Payment Receipt Voucher</p>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-emerald-600">{viewingPayment.receiptNumber}</div>
                <div className="text-slate-400 text-[11px]">
                  Date: {new Date(viewingPayment.paymentDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Received From */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Received From:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{viewingPayment.customer?.name || viewingPayment.customer?.companyName || 'Customer'}</div>
                <div className="text-slate-500">TIN: {viewingPayment.customer?.tinNumber || 'N/A'}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Applied to Invoice:</span>
                <div className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {viewingPayment.invoice?.invoiceNumber}
                </div>
              </div>
            </div>

            {/* Voucher Details Card */}
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Amount Received:</span>
                <span className="text-xl font-black text-emerald-400">{formatCurrency(viewingPayment.amount)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Method:</span>
                <span className="font-semibold text-white capitalize">{viewingPayment.paymentMethod.replace(/_/g, ' ')}</span>
              </div>
              {viewingPayment.referenceNumber && (
                <div className="flex justify-between text-slate-400">
                  <span>Cheque / Reference #:</span>
                  <span className="font-mono text-white">{viewingPayment.referenceNumber}</span>
                </div>
              )}
              {viewingPayment.bankDetails?.bankName && (
                <div className="flex justify-between text-slate-400">
                  <span>Deposited To:</span>
                  <span className="text-white">{viewingPayment.bankDetails.bankName}</span>
                </div>
              )}
              {viewingPayment.receivedBy && (
                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>Received By Cashier / Rep:</span>
                  <span className="text-white">
                    {viewingPayment.receivedBy.firstName} {viewingPayment.receivedBy.lastName} ({viewingPayment.receivedBy.employeeId})
                  </span>
                </div>
              )}
            </div>

            {/* Printable button */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <Printer className="w-4 h-4" /> Print Voucher
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

