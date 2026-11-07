import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import purchasingService from '../../services/purchasingService';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  ShoppingCart,
  FileText,
  Building2,
  ArrowDownToLine,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldAlert,
  Boxes,
  RotateCcw
} from 'lucide-react';

export default function PurchasingDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await purchasingService.getPurchasingDashboard();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        throw new Error(res.message || 'Failed to load dashboard metrics');
      }
    } catch (err) {
      console.error('Failed to load purchasing dashboard:', err);
      setError(err.message || 'Failed to load purchasing overview');
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-500 mb-3" />
        <p className="text-sm font-medium">Loading Purchasing & Procurement metrics...</p>
      </div>
    );
  }

  const credit = data?.creditOverview || {};
  const prs = data?.purchaseRequests || {};
  const grs = data?.goodsReceipts || {};
  const pos = data?.purchaseOrdersByStatus || {};
  const topSuppliers = data?.topSuppliers || [];
  const recentOrders = data?.recentOrders || [];
  const recentRequests = data?.recentRequests || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary-500" />
            {t('purchasing.dashboardTitle')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('purchasing.dashboardSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
            {t('actions.refresh')}
          </button>
          <Link
            to="/purchasing/requests"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            {t('New Purchase Request')}
          </Link>
        </div>
      </div>

      {/* Overdue Credit Warning Banner */}
      {credit.overdueAmount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              {t('Outstanding Overdue Credit Alert')} ({credit.overdueCount} orders overdue)
            </h4>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
              {t('Total overdue accounts payable to suppliers is')}{' '}
              <span className="font-bold">{formatCurrency(credit.overdueAmount)}</span>. {t('Please review settlements.')}
            </p>
          </div>
          <Link
            to="/purchasing/credit"
            className="px-3 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white shadow-xs transition"
          >
            {t('Manage AP & Credit')}
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('Total Lifetime Purchases')}
          value={formatCurrency(data?.totalPurchasesValue)}
          subtitle={`${data?.totalOrdersCount || 0} total purchase orders`}
          icon={TrendingUp}
          tag="Spend"
        />

        <StatCard
          title={t("This Month's Purchasing")}
          value={formatCurrency(data?.thisMonthSpend)}
          subtitle={`${data?.thisMonthOrdersCount || 0} orders placed this month`}
          icon={ShoppingCart}
          tag="Monthly"
        />

        <StatCard
          title={t('Pending PRs for Approval')}
          value={prs.pending || 0}
          subtitle={`${prs.total || 0} total requests registered`}
          icon={Clock}
          tag={prs.pending > 0 ? 'Action Req' : 'Normal'}
          onClick={() => navigate('/purchasing/requests')}
        />

        <StatCard
          title={t('GRVs Pending Inspection')}
          value={grs.pendingInspection || 0}
          subtitle="Awaiting store physical count"
          icon={ArrowDownToLine}
          tag="Store Sync"
          onClick={() => navigate('/purchasing/goods-receipts')}
        />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('Total Accounts Payable')}
          value={formatCurrency(credit.outstandingCredit)}
          subtitle={`Across ${credit.totalCreditOrders || 0} credit orders`}
          icon={CreditCard}
          tag="Credit"
          onClick={() => navigate('/purchasing/credit')}
        />

        <StatCard
          title={t('Active Approved POs')}
          value={pos.approved || pos.sent || 0}
          subtitle={`${pos.received || 0} fully received, ${pos.completed || 0} closed`}
          icon={FileText}
          tag="Orders"
          onClick={() => navigate('/purchasing/orders')}
        />

        <StatCard
          title={t('Active Registered Suppliers')}
          value={data?.suppliers?.active || 0}
          subtitle={`${data?.suppliers?.total || 0} total registered suppliers`}
          icon={Building2}
          tag="Vendors"
          onClick={() => navigate('/purchasing/suppliers')}
        />

        <StatCard
          title={t('Total Amount Settled')}
          value={formatCurrency(data?.totalPaid)}
          subtitle="Paid against verified supplier invoices"
          icon={CheckCircle2}
          tag="Settled"
          onClick={() => navigate('/purchasing/payments')}
        />
      </div>

      {/* Quick Navigation Action Pills */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {t('Quick Navigation:')}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/purchasing/requests"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            {t('Purchase Requests')}
          </Link>
          <Link
            to="/purchasing/orders"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            {t('Purchase Orders')}
          </Link>
          <Link
            to="/purchasing/suppliers"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-emerald-500" />
            {t('Suppliers & Vendors')}
          </Link>
          <Link
            to="/purchasing/goods-receipts"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1.5"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-500" />
            {t('Goods Received (GRV)')}
          </Link>
          <Link
            to="/purchasing/credit"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5 text-rose-500" />
            {t('Credit & AP Aging')}
          </Link>
          <Link
            to="/purchasing/payments"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
            {t('Payments')}
          </Link>
          <Link
            to="/purchasing/returns"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-orange-500" />
            {t('Supplier Returns')}
          </Link>
        </div>
      </div>

      {/* Grid: Top Suppliers & Pipeline Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Suppliers by Spend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('Top Suppliers by Purchase Volume')}
              </h3>
              <p className="text-xs text-slate-500">{t('Highest procurement spend partners')}</p>
            </div>
            <Link
              to="/purchasing/suppliers"
              className="text-xs font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-1"
            >
              {t('View all suppliers')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {topSuppliers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {t('No supplier purchase data recorded yet.')}
            </div>
          ) : (
            <div className="space-y-4">
              {topSuppliers.map((s, idx) => {
                const maxSpend = topSuppliers[0]?.totalSpend || 1;
                const percentage = Math.min(100, Math.round((s.totalSpend / maxSpend) * 100));

                return (
                  <div key={s.supplierId || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">
                        {idx + 1}. {s.supplierName} ({s.supplierCode})
                      </span>
                      <span className="text-slate-900 dark:text-slate-100 font-bold">
                        {formatCurrency(s.totalSpend)}
                        <span className="text-slate-400 font-normal ml-1.5">
                          ({s.totalOrders} {s.totalOrders === 1 ? t('order') : t('orders')})
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PO & PR Pipeline Breakdown */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t('Procurement Workflow Status Pipeline')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {t('Real-time progression from department requests to POs and verified receiving')}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">{t('Purchase Requests')}</span>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-amber-600 font-medium">{t('Pending:')}</span>
                    <span className="font-bold">{prs.pending || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600 font-medium">{t('Approved:')}</span>
                    <span className="font-bold">{prs.approved || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sky-600 font-medium">{t('Converted to PO:')}</span>
                    <span className="font-bold">{prs.converted || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-medium">{t('Rejected:')}</span>
                    <span className="font-bold">{prs.rejected || 0}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-500">{t('Purchase Orders (PO)')}</span>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">{t('Draft:')}</span>
                    <span className="font-bold">{pos.draft || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sky-600 font-medium">{t('Approved/Sent:')}</span>
                    <span className="font-bold">{(pos.approved || 0) + (pos.sent || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-600 font-medium">{t('Partially Recv:')}</span>
                    <span className="font-bold">{pos['partially received'] || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600 font-medium">{t('Received:')}</span>
                    <span className="font-bold">{pos.received || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 text-xs text-primary-800 dark:text-primary-300 flex items-center justify-between">
            <span>{t('GRV stock verification updates warehouse inventory automatically.')}</span>
            <Link
              to="/purchasing/goods-receipts"
              className="font-bold underline hover:text-primary-600 inline-flex items-center gap-1"
            >
              {t('Verify GRVs')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Grid: Recent Orders & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Purchase Orders */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('Recent Purchase Orders')}
              </h3>
              <p className="text-xs text-slate-500">{t('Latest official orders issued to suppliers')}</p>
            </div>
            <Link
              to="/purchasing/orders"
              className="text-xs font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-1"
            >
              {t('All orders')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {t('No purchase orders created yet.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400">
                    <th className="pb-2 font-semibold">{t('PO Number')}</th>
                    <th className="pb-2 font-semibold">{t('Supplier')}</th>
                    <th className="pb-2 font-semibold">{t('Grand Total')}</th>
                    <th className="pb-2 font-semibold text-right">{t('Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {recentOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        <Link to={`/purchasing/orders?id=${o._id}`} className="hover:underline text-primary-600">
                          {o.purchaseOrderNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        {o.supplier?.supplierName || 'N/A'}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(o.grandTotal)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge status={o.status} text={o.status} size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Purchase Requests */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('Recent Purchase Requests')}
              </h3>
              <p className="text-xs text-slate-500">{t('Internal requisitions from Store and departments')}</p>
            </div>
            <Link
              to="/purchasing/requests"
              className="text-xs font-semibold text-primary-600 hover:text-primary-500 flex items-center gap-1"
            >
              {t('All requests')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {t('No purchase requests created yet.')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400">
                    <th className="pb-2 font-semibold">{t('PR Number')}</th>
                    <th className="pb-2 font-semibold">{t('Department')}</th>
                    <th className="pb-2 font-semibold">{t('Estimated Total')}</th>
                    <th className="pb-2 font-semibold text-right">{t('Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {recentRequests.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-slate-100">
                        <Link to={`/purchasing/requests?id=${r._id}`} className="hover:underline text-primary-600">
                          {r.requestNumber}
                        </Link>
                      </td>
                      <td className="py-2.5 text-slate-700 dark:text-slate-300">
                        {r.department}
                      </td>
                      <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(r.estimatedTotalAmount)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge status={r.status} text={r.status} size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

