import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import purchasingService from '../../services/purchasingService';
import StatCard from '../../components/common/StatCard';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Building2,
  RefreshCw,
  Eye,
  ArrowRight,
  TrendingDown,
  DollarSign
} from 'lucide-react';

export default function CreditPurchases() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();

  // Active Tab: 'orders' | 'aging'
  const [activeTab, setActiveTab] = useState('orders');

  const [dashboardData, setDashboardData] = useState(null);
  const [creditOrders, setCreditOrders] = useState([]);
  const [agingData, setAgingData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modals
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Settlement Form State
  const [settleForm, setSettleForm] = useState({
    purchaseOrderId: '',
    amount: '',
    paymentMethod: 'bank transfer',
    transactionReference: '',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Extend Due Date Form State
  const [extendForm, setExtendForm] = useState({
    newDueDate: '',
    reason: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, ordersRes, agingRes, supRes] = await Promise.allSettled([
        purchasingService.getCreditDashboard(),
        purchasingService.getCreditPurchases({ limit: 100 }),
        purchasingService.getAgingReport(),
        purchasingService.getSuppliers({ limit: 100 })
      ]);

      if (dashRes.status === 'fulfilled' && dashRes.value?.data) {
        setDashboardData(dashRes.value.data);
      }
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        setCreditOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
      }
      if (agingRes.status === 'fulfilled' && agingRes.value?.data) {
        setAgingData(agingRes.value.data);
      }
      if (supRes.status === 'fulfilled' && supRes.value?.data) {
        setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load credit purchases:', err);
      setError(err.message || 'Failed to load credit management data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Open Settle Modal for a specific PO
  const handleOpenSettle = (po) => {
    setSelectedOrder(po);
    setSettleForm({
      purchaseOrderId: po._id,
      amount: po.balanceDue || 0,
      paymentMethod: 'bank transfer',
      transactionReference: '',
      bankName: 'Commercial Bank of Ethiopia (CBE)',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Settlement for credit PO ${po.purchaseOrderNumber}`
    });
    setIsSettleModalOpen(true);
  };

  // Open Extend Modal
  const handleOpenExtend = (po) => {
    setSelectedOrder(po);
    const currDue = po.paymentDueDate ? new Date(po.paymentDueDate).toISOString().split('T')[0] : '';
    setExtendForm({
      newDueDate: currDue,
      reason: ''
    });
    setIsExtendModalOpen(true);
  };

  // Handle Settle Submit
  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (Number(settleForm.amount) <= 0) {
      alert('Settlement amount must be greater than zero');
      return;
    }
    if (Number(settleForm.amount) > Number(selectedOrder.balanceDue)) {
      alert(`Settlement amount cannot exceed balance due (${formatCurrency(selectedOrder.balanceDue)})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.settleCreditPurchase(settleForm);
      if (res.success) {
        setIsSettleModalOpen(false);
        setSelectedOrder(null);
        await fetchData();
        alert('Payment settlement recorded! Supplier credit and PO balances updated.');
      } else {
        alert(res.message || 'Failed to record settlement');
      }
    } catch (err) {
      alert(err.message || 'Error processing settlement');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Extend Submit
  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    if (!extendForm.newDueDate) {
      alert('Please choose a new due date');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.extendCreditDueDate(selectedOrder._id, extendForm);
      if (res.success) {
        setIsExtendModalOpen(false);
        setSelectedOrder(null);
        await fetchData();
        alert('Payment due date updated successfully.');
      } else {
        alert(res.message || 'Failed to extend due date');
      }
    } catch (err) {
      alert(err.message || 'Error extending due date');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter credit orders
  const filteredOrders = creditOrders.filter((o) => {
    if (overdueOnly && !o.isOverdue) return false;
    if (statusFilter && o.paymentStatus !== statusFilter) return false;
    if (supplierFilter && o.supplier?._id !== supplierFilter) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchNum = o.purchaseOrderNumber?.toLowerCase().includes(term);
      const matchSupp = o.supplier?.supplierName?.toLowerCase().includes(term);
      const matchTerms = o.paymentTerms?.toLowerCase().includes(term);
      if (!matchNum && !matchSupp && !matchTerms) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-primary-500" />
            {t('credit & ap aging')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('track vendor debts, payment deadlines, partial settlements, and ap aging reports')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
            {t('actions.refresh')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('total outstanding payable')}
          value={formatCurrency(dashboardData?.totalOutstandingPayable)}
          subtitle={`Across ${dashboardData?.totalCreditOrdersCount || 0} active credit orders`}
          icon={CreditCard}
          tag="Liabilities"
        />

        <StatCard
          title={t('total overdue amount')}
          value={formatCurrency(dashboardData?.totalOverdueAmount)}
          subtitle={`${dashboardData?.overdueOrdersCount || 0} orders past due date`}
          icon={AlertTriangle}
          tag="Overdue"
        />

        <StatCard
          title={t('due in 7 days')}
          value={formatCurrency(dashboardData?.dueIn7DaysAmount)}
          subtitle={`${dashboardData?.dueIn7DaysCount || 0} upcoming settlements`}
          icon={Clock}
          tag="Urgent"
        />

        <StatCard
          title={t('total credit settled')}
          value={formatCurrency(dashboardData?.totalPaid)}
          subtitle="Lifetime payments against credit"
          icon={CheckCircle2}
          tag="Paid"
        />
      </div>

      {/* Main Tabs (Credit Orders vs AP Aging Report) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          {t('active credit purchases')} ({filteredOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('aging')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === 'aging'
              ? 'bg-primary-600 text-white shadow-xs'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {t('accounts payable (ap) aging report')}
        </button>
      </div>

      {/* TAB 1: CREDIT ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('search...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                />
                {t('show overdue only')}
              </label>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="">{t('all payment statuses')}</option>
                <option value="unpaid">{t('unpaid')}</option>
                <option value="partially paid">{t('partially paid')}</option>
                <option value="overdue">{t('overdue')}</option>
                <option value="paid">{t('paid')}</option>
              </select>

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="">{t('all suppliers')}</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.supplierName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                <p className="text-sm">{t('loading purchasing & procurement metrics...')}</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title={t('no records found')}
                description={search || overdueOnly ? t('Try adjusting your search filters.') : t('no records found')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <tr>
                      <th className="py-3 px-4 font-bold">{t('po number')}</th>
                      <th className="py-3 px-4 font-bold">{t('supplier')}</th>
                      <th className="py-3 px-4 font-bold">{t('grand total')}</th>
                      <th className="py-3 px-4 font-bold">{t('paid')}</th>
                      <th className="py-3 px-4 font-bold">{t('balance due')}</th>
                      <th className="py-3 px-4 font-bold">{t('due date')}</th>
                      <th className="py-3 px-4 font-bold">{t('aging status')}</th>
                      <th className="py-3 px-4 font-bold text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredOrders.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 font-mono">
                          <Link to={`/purchasing/orders?id=${o._id}`} className="hover:underline text-primary-600">
                            {o.purchaseOrderNumber}
                          </Link>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {o.supplier?.supplierName || 'Supplier'}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(o.grandTotal)}
                        </td>

                        <td className="py-3.5 px-4 text-emerald-600 font-medium">
                          {formatCurrency(o.paidAmount)}
                        </td>

                        <td className="py-3.5 px-4 font-black text-rose-600">
                          {formatCurrency(o.balanceDue)}
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {o.paymentDueDate ? new Date(o.paymentDueDate).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3.5 px-4">
                          {o.isOverdue ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                              <AlertTriangle className="w-3 h-3" />
                              {o.overdueDays} days overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              Due in {o.remainingDays} days
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {o.balanceDue > 0 && (
                              <>
                                <button
                                  onClick={() => handleOpenSettle(o)}
                                  title="Record Payment Settlement"
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs"
                                >
                                  <DollarSign className="w-3 h-3" />
                                  Settle
                                </button>

                                <button
                                  onClick={() => handleOpenExtend(o)}
                                  title="Extend Due Date"
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                >
                                  Extend
                                </button>
                              </>
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
        </div>
      )}

      {/* TAB 2: ACCOUNTS PAYABLE (AP) AGING REPORT */}
      {activeTab === 'aging' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Standard Accounts Payable (AP) Aging Report
              </h3>
              <p className="text-xs text-slate-500">
                Aged supplier payables categorized by delinquency buckets (Current, 1-30, 31-60, 61-90, 90+ days)
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border hover:bg-slate-50 self-start sm:self-auto"
            >
              Print Aging Report
            </button>
          </div>

          {/* Grand Totals Bar */}
          {agingData?.grandTotals && (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border text-xs">
              <div>
                <span className="text-slate-400 block">Current (Not Due):</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(agingData.grandTotals.current)}
                </span>
              </div>
              <div>
                <span className="text-amber-500 block">1 - 30 Days:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(agingData.grandTotals.days1To30)}
                </span>
              </div>
              <div>
                <span className="text-orange-500 block">31 - 60 Days:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(agingData.grandTotals.days31To60)}
                </span>
              </div>
              <div>
                <span className="text-rose-500 block">61 - 90 Days:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(agingData.grandTotals.days61To90)}
                </span>
              </div>
              <div>
                <span className="text-rose-700 block font-bold">90+ Days Past:</span>
                <span className="font-bold text-rose-700">
                  {formatCurrency(agingData.grandTotals.daysOver90)}
                </span>
              </div>
              <div>
                <span className="text-slate-900 dark:text-slate-100 block font-black uppercase">Total Payable:</span>
                <span className="font-black text-rose-600 text-sm">
                  {formatCurrency(agingData.grandTotals.totalOutstanding)}
                </span>
              </div>
            </div>
          )}

          {/* Aging Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3 text-right">Current</th>
                  <th className="py-2.5 px-3 text-right">1 - 30 Days</th>
                  <th className="py-2.5 px-3 text-right">31 - 60 Days</th>
                  <th className="py-2.5 px-3 text-right">61 - 90 Days</th>
                  <th className="py-2.5 px-3 text-right">Over 90 Days</th>
                  <th className="py-2.5 px-3 text-right font-black">Total Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {(agingData?.suppliers || []).map((s, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      <Link to={`/purchasing/suppliers?id=${s.supplierId}`} className="hover:underline text-primary-600">
                        {s.supplierName}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{s.supplierCode}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700 dark:text-slate-300">
                      {s.current > 0 ? formatCurrency(s.current) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-600 font-medium">
                      {s.days1To30 > 0 ? formatCurrency(s.days1To30) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-orange-600 font-medium">
                      {s.days31To60 > 0 ? formatCurrency(s.days31To60) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-medium">
                      {s.days61To90 > 0 ? formatCurrency(s.days61To90) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-700 font-bold">
                      {s.daysOver90 > 0 ? formatCurrency(s.daysOver90) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-slate-100">
                      {formatCurrency(s.totalOutstanding)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTLEMENT MODAL */}
      <Modal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        title={`Settle Credit Purchase - ${selectedOrder?.purchaseOrderNumber || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSettleSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Supplier:</span>
              <span className="font-bold">{selectedOrder?.supplier?.supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Invoice Amount:</span>
              <span>{formatCurrency(selectedOrder?.grandTotal)}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Outstanding Balance Due:</span>
              <span>{formatCurrency(selectedOrder?.balanceDue)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Settlement Amount (ETB) *
            </label>
            <input
              type="number"
              min="0.01"
              max={selectedOrder?.balanceDue || 999999999}
              step="any"
              value={settleForm.amount}
              onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border font-bold text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method *
            </label>
            <select
              value={settleForm.paymentMethod}
              onChange={(e) => setSettleForm({ ...settleForm, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900"
            >
              <option value="bank transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Bank Name / Remittance Account
            </label>
            <input
              type="text"
              value={settleForm.bankName}
              onChange={(e) => setSettleForm({ ...settleForm, bankName: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transaction / Reference Number (FT / Cheque #)
            </label>
            <input
              type="text"
              placeholder="e.g. FT2608472910"
              value={settleForm.transactionReference}
              onChange={(e) => setSettleForm({ ...settleForm, transactionReference: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={settleForm.paymentDate}
              onChange={(e) => setSettleForm({ ...settleForm, paymentDate: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsSettleModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
            >
              {submitting ? 'Recording...' : 'Confirm Settlement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* EXTEND DUE DATE MODAL */}
      <Modal
        isOpen={isExtendModalOpen}
        onClose={() => setIsExtendModalOpen(false)}
        title={`Extend Due Date - ${selectedOrder?.purchaseOrderNumber || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleExtendSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              New Payment Due Date *
            </label>
            <input
              type="date"
              value={extendForm.newDueDate}
              onChange={(e) => setExtendForm({ ...extendForm, newDueDate: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Extension Reason / Vendor Agreement
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Supplier granted 15 days extension due to plant maintenance schedule"
              value={extendForm.reason}
              onChange={(e) => setExtendForm({ ...extendForm, reason: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsExtendModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs"
            >
              {submitting ? 'Updating...' : 'Save New Due Date'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

