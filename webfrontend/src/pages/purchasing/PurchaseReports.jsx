import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import reportService from '../../services/reportService';
import storeService from '../../services/storeService';
import { exportReportToPdf } from '../../utils/reportPdfExport';
import { analyzeReportWithChatGPT } from '../../utils/reportAiAnalysis';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  ShoppingCart,
  Calendar,
  Filter,
  Download,
  FileText,
  RefreshCw,
  CreditCard,
  DollarSign,
  Building2,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowDownToLine,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const PIE_COLORS = ['#da1f26', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function PurchaseReports() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [vatFilter, setVatFilter] = useState('');
  const [searchTable, setSearchTable] = useState('');

  const [reportData, setReportData] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        timeframe,
        actor: 'purchaser',
        warehouse: warehouseFilter || undefined,
        vatStatus: vatFilter || undefined
      };
      if (timeframe === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      const [res, whRes] = await Promise.allSettled([
        reportService.getPurchaseReport(params),
        storeService.getWarehouses({ limit: 50 })
      ]);

      if (res.status === 'fulfilled') {
        const val = res.value;
        if (val?.success) {
          setReportData(val.data);
        } else if (val?.data?.success) {
          setReportData(val.data.data);
        } else {
          throw new Error(val?.message || val?.data?.message || 'Failed to load purchasing report');
        }
      } else {
        throw new Error(res.reason?.message || 'Failed to fetch procurement analytics');
      }

      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
    } catch (err) {
      console.error('Purchasing report fetch error:', err);
      setError(err.message || 'Error compiling procurement spend report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, warehouseFilter, vatFilter]);

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleExportCSV = () => {
    const logs = reportData?.unifiedLog || [];
    if (logs.length === 0) {
      alert(t('No data available to export.'));
      return;
    }
    const headers = ['Type', 'PO Number', 'Date', 'Supplier / Vendor', 'Department', 'Warehouse', 'Details', 'Amount (ETB)', 'VAT Status', 'Status'];
    const rows = logs.map((r) => [
      `"${r.type}"`,
      `"${r.referenceNumber}"`,
      `"${new Date(r.date).toLocaleDateString()}"`,
      `"${r.actor}"`,
      `"${r.department}"`,
      `"${r.warehouse}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${r.amount || 0}"`,
      `"${r.vatStatus}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GT_ERP_Purchasing_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : purchasingLogs;
    if (!reportData || logsToExport.length === 0) {
      alert(t('No data available to export.'));
      return;
    }

    const timeframeLabel = timeframe === 'custom'
      ? `Custom (${customStartDate} to ${customEndDate})`
      : timeframe.toUpperCase();

    const selectedWh = warehouses.find((w) => w._id === warehouseFilter)?.name || warehouseFilter;
    const filterDetails = [
      `Warehouse: ${selectedWh || 'All'}`,
      `VAT: ${vatFilter ? (vatFilter === 'with_vat' ? 'With VAT' : 'No VAT') : 'All'}`,
      searchTable ? `Search: "${searchTable}"` : null
    ].filter(Boolean).join(' | ');

    const summaryCards = [
      {
        label: 'Procurement Spend',
        value: formatCurrency(summary.totalSpend),
        subtitle: `${summary.totalPOs || 0} purchase orders placed`
      },
      {
        label: 'VAT Recoverable',
        value: formatCurrency(summary.totalVatAmount),
        subtitle: `${summary.withVatCount || 0} POs with 15% VAT`
      },
      {
        label: 'Credit Purchases',
        value: formatCurrency(summary.totalCreditSpend),
        subtitle: 'Accounts Payable commitments'
      },
      {
        label: 'Cash Purchases',
        value: formatCurrency(summary.totalCashSpend),
        subtitle: 'Immediate cash outflow'
      },
      {
        label: 'Goods Received (GRN)',
        value: `${summary.totalGrnCount || 0} GRNs`,
        subtitle: `${summary.totalAcceptedItemsQty || 0} items accepted`
      }
    ];

    const tableHeaders = ['Type', 'PO Number', 'Date', 'Supplier / Vendor', 'Department', 'Warehouse', 'Details', 'Amount (ETB)', 'VAT Status', 'Status'];
    const tableRows = logsToExport.map((r) => [
      r.type || 'N/A',
      r.referenceNumber || '—',
      r.date ? new Date(r.date).toLocaleDateString() : '—',
      r.actor || '—',
      r.department || '—',
      r.warehouse || '—',
      r.details || '—',
      Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      r.vatStatus || '—',
      r.status || '—'
    ]);

    const totalAmount = logsToExport.reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const tableFooters = [
      `Total (${logsToExport.length} entries)`,
      '',
      '',
      '',
      '',
      '',
      '',
      Number(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      '',
      ''
    ];

    exportReportToPdf({
      reportTitle: 'Procurement & Spend Analytics Audit Report',
      reportSubtitle: 'Vendor procurement spend, purchase order commitments, goods receipts and VAT performance',
      formNumber: 'FORM-GT-PUR-01',
      moduleName: 'Purchasing & Supply Chain',
      timeframeLabel,
      filterDetails: filterDetails || 'All Purchasing Records',
      summaryCards,
      tableHeaders,
      tableRows,
      tableFooters,
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 35 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 'auto' },
        7: { cellWidth: 26, halign: 'right' },
        8: { cellWidth: 20, halign: 'center' },
        9: { cellWidth: 20, halign: 'center' }
      },
      fileName: `GT_ERP_Purchasing_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`,
      user
    });
  };

  const summary = reportData?.summary || {};
  const analytics = reportData?.analytics || {};
  const logs = reportData?.unifiedLog || [];

  // Filter logs for Purchasing-focused entries
  const purchasingLogs = logs.filter((item) =>
    item.type.includes('Purchase') ||
    item.type.includes('Receipt') ||
    item.type.includes('Supplier')
  );

  const filteredLogs = purchasingLogs.filter((item) => {
    if (!searchTable) return true;
    const term = searchTable.toLowerCase();
    return (
      item.referenceNumber?.toLowerCase().includes(term) ||
      item.actor?.toLowerCase().includes(term) ||
      item.warehouse?.toLowerCase().includes(term) ||
      item.details?.toLowerCase().includes(term)
    );
  });

  // Payment Breakdown for pie chart
  const paymentBreakdownData = [
    { name: 'Credit Purchases (AP)', value: summary.totalCreditSpend || 0 },
    { name: 'Cash Purchases', value: summary.totalCashSpend || 0 }
  ].filter(p => p.value > 0);

  const handleAnalyzeWithChatGPT = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : (purchasingLogs.length > 0 ? purchasingLogs : (reportData?.unifiedLog || []));
    if (!reportData || logsToExport.length === 0) {
      alert(t('No data available to analyze.'));
      return;
    }

    const timeframeLabel = timeframe === 'custom'
      ? `Custom (${customStartDate} to ${customEndDate})`
      : timeframe.toUpperCase();

    const selectedWh = warehouses.find((w) => w._id === warehouseFilter)?.name || warehouseFilter;
    const filterDetails = [
      `Warehouse: ${selectedWh || 'All'}`,
      `VAT: ${vatFilter ? (vatFilter === 'with_vat' ? 'With VAT' : 'No VAT') : 'All'}`,
      searchTable ? `Search: "${searchTable}"` : null
    ].filter(Boolean).join(' | ');

    const summaryCards = [
      {
        label: 'Procurement Spend',
        value: formatCurrency(summary.totalSpend),
        subtitle: `${summary.totalPOs || 0} purchase orders placed`
      },
      {
        label: 'VAT Recoverable',
        value: formatCurrency(summary.totalVatAmount),
        subtitle: `${summary.withVatCount || 0} POs with 15% VAT`
      },
      {
        label: 'Credit Purchases',
        value: formatCurrency(summary.totalCreditSpend),
        subtitle: 'Accounts Payable commitments'
      },
      {
        label: 'Cash Purchases',
        value: formatCurrency(summary.totalCashSpend),
        subtitle: 'Immediate cash outflow'
      },
      {
        label: 'Goods Received (GRN)',
        value: `${summary.totalGrnCount || 0} GRNs`,
        subtitle: `${summary.totalAcceptedItemsQty || 0} items accepted`
      }
    ];

    const tableHeaders = ['Type', 'PO Number', 'Date', 'Supplier / Vendor', 'Department', 'Warehouse', 'Details', 'Amount (ETB)', 'VAT Status', 'Status'];
    const tableRows = logsToExport.map((r) => [
      r.type || 'N/A',
      r.referenceNumber || '—',
      r.date ? new Date(r.date).toLocaleDateString() : '—',
      r.actor || '—',
      r.department || '—',
      r.warehouse || '—',
      r.details || '—',
      Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      r.vatStatus || '—',
      r.status || '—'
    ]);

    analyzeReportWithChatGPT({
      reportTitle: 'Procurement & Spend Analytics Reports',
      reportSubtitle: 'Vendor procurement spend, purchase order commitments, goods receipts and VAT performance',
      moduleName: 'Purchasing & Supply Chain',
      timeframeLabel,
      filterDetails: filterDetails || 'All Purchasing Records',
      summaryCards,
      tableHeaders,
      tableRows,
      analytics: reportData?.analytics
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary-500" />
            <span>{t('Procurement & Spend Analytics Reports')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Vendor procurement spend, purchase order commitments, goods receipts and VAT performance')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title={t('Refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('Refresh')}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('Export CSV')}</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
            title={t('Export official PDF report in form format')}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('Export PDF')}</span>
          </button>

          <button
            onClick={handleAnalyzeWithChatGPT}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5"
            title={t('Analyze report with ChatGPT')}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('AI Analysis')}</span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Timeframe Quick Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 self-start lg:self-auto overflow-x-auto">
            {[
              { id: 'daily', label: 'Daily (Today)' },
              { id: 'weekly', label: 'Weekly (7 Days)' },
              { id: 'monthly', label: 'Monthly (This Month)' },
              { id: 'yearly', label: 'Yearly (This Year)' },
              { id: 'custom', label: 'Custom Range' }
            ].map((tItem) => (
              <button
                key={tItem.id}
                onClick={() => setTimeframe(tItem.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                  timeframe === tItem.id
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {t(tItem.label)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Warehouse Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('Warehouse')}:</span>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Warehouses')}</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>{wh.warehouseName}</option>
                ))}
              </select>
            </div>

            {/* VAT Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('VAT Status')}:</span>
              <select
                value={vatFilter}
                onChange={(e) => setVatFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All VAT Statuses')}</option>
                <option value="with_vat">{t('With VAT Registered Suppliers')}</option>
                <option value="without_vat">{t('Non-VAT Purchases')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Range Picker */}
        {timeframe === 'custom' && (
          <form onSubmit={handleApplyCustomDate} className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">{t('From')}:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">{t('To')}:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition"
            >
              {t('Apply Filter')}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Procurement Spend"
          value={formatCurrency(summary.totalSpend)}
          subtitle={`${summary.totalPOs || 0} ${t('purchase orders placed')}`}
          icon={DollarSign}
        />
        <StatCard
          title="VAT Recoverable"
          value={formatCurrency(summary.totalVatAmount)}
          subtitle={`${summary.withVatCount || 0} ${t('POs with 15% VAT')}`}
          icon={Percent}
        />
        <StatCard
          title="Credit Purchases"
          value={formatCurrency(summary.totalCreditSpend)}
          subtitle={t('Accounts Payable commitments')}
          icon={CreditCard}
        />
        <StatCard
          title="Cash Purchases"
          value={formatCurrency(summary.totalCashSpend)}
          subtitle={t('Immediate bank / cash outflow')}
          icon={DollarSign}
        />
        <StatCard
          title="Goods Received (GRN)"
          value={`${summary.totalGrnCount || 0} GRNs`}
          subtitle={`${summary.totalAcceptedItemsQty || 0} ${t('items accepted')}`}
          icon={ArrowDownToLine}
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Supplier BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-500" />
            <span>{t('Top Suppliers by Procurement Spend (ETB)')}</span>
          </h2>
          <div className="h-64">
            {analytics.spendBySupplier && analytics.spendBySupplier.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.spendBySupplier} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#da1f26" radius={[4, 4, 0, 0]} name={t('Spend (ETB)')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {t('No supplier spend recorded in this period')}
              </div>
            )}
          </div>
        </div>

        {/* Credit vs Cash Payment Distribution PieChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-500" />
            <span>{t('Procurement Payment Terms Distribution')}</span>
          </h2>
          <div className="h-64">
            {paymentBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${t(name)} ${(percent * 100).toFixed(0)}%`}
                  >
                    {paymentBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {t('No purchases recorded for this period')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Purchasing Activity Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t('Purchase Orders & Sourcing Audit Trail')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('Complete audit log of committed purchase orders and supplier transactions')}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t('Search PO, supplier, details...')}
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 uppercase text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              <tr>
                <th className="p-3">{t('Type')}</th>
                <th className="p-3">{t('PO Number')}</th>
                <th className="p-3">{t('Date')}</th>
                <th className="p-3">{t('Supplier')}</th>
                <th className="p-3">{t('Warehouse')}</th>
                <th className="p-3">{t('Details')}</th>
                <th className="p-3">{t('Amount')}</th>
                <th className="p-3">{t('VAT Status')}</th>
                <th className="p-3">{t('Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                      {t(item.type)}
                    </td>
                    <td className="p-3 font-semibold text-primary-600 dark:text-primary-400">
                      {item.referenceNumber}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                      {item.actor}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.warehouse}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={item.details}>
                      {item.details}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {item.amount ? formatCurrency(item.amount) : '-'}
                    </td>
                    <td className="p-3 text-slate-500">
                      {t(item.vatStatus)}
                    </td>
                    <td className="p-3">
                      <Badge status={item.status} text={item.status} size="xs" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-xs text-slate-400">
                    {t('No purchasing records matched your filters')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

