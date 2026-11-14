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
  Package,
  Boxes,
  Calendar,
  Filter,
  Download,
  FileText,
  RefreshCw,
  RotateCcw,
  History,
  SlidersHorizontal,
  Warehouse,
  AlertTriangle,
  Search,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

const DEPARTMENTS = [
  'Production',
  'Pre-Press',
  'Post-Press & Binding',
  'Maintenance',
  'Design & Creative',
  'Administration',
  'Logistics',
  'Sales & Marketing',
  'Finance',
  'Store & Inventory'
];

const PIE_COLORS = ['#da1f26', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function StoreReports() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
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
        actor: 'storekeeper',
        warehouse: warehouseFilter || undefined,
        department: departmentFilter || undefined
      };
      if (timeframe === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      const [res, whRes] = await Promise.allSettled([
        reportService.getStoreReport(params),
        storeService.getWarehouses({ limit: 50 })
      ]);

      if (res.status === 'fulfilled') {
        const val = res.value;
        if (val?.success) {
          setReportData(val.data);
        } else if (val?.data?.success) {
          setReportData(val.data.data);
        } else {
          throw new Error(val?.message || val?.data?.message || 'Failed to load store report');
        }
      } else {
        throw new Error(res.reason?.message || 'Failed to fetch store analytics');
      }

      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
    } catch (err) {
      console.error('Store report fetch error:', err);
      setError(err.message || 'Error compiling store inventory report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, warehouseFilter, departmentFilter]);

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
    const headers = ['Type', 'Reference #', 'Date', 'Party / Requestor', 'Department', 'Warehouse', 'Details', 'Status'];
    const rows = logs.map((r) => [
      `"${r.type}"`,
      `"${r.referenceNumber}"`,
      `"${new Date(r.date).toLocaleDateString()}"`,
      `"${r.actor}"`,
      `"${r.department}"`,
      `"${r.warehouse}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GT_ERP_Store_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : storeLogs;
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
      `Department: ${departmentFilter || 'All'}`,
      searchTable ? `Search: "${searchTable}"` : null
    ].filter(Boolean).join(' | ');

    const summaryCards = [
      {
        label: 'Stock Valuation',
        value: formatCurrency(summary.totalValuation),
        subtitle: 'On-hand physical assets'
      },
      {
        label: 'Low Stock Warning',
        value: `${summary.lowStockCount || 0}`,
        subtitle: 'Items below min safe level'
      },
      {
        label: 'Requisitions Issued',
        value: `${summary.completedRequestsCount || 0} SIV`,
        subtitle: `${summary.totalIssuedItemsQty || 0} units released`
      },
      {
        label: 'Staff Returns',
        value: `${summary.totalReturnsCount || 0} SRV`,
        subtitle: `Restocked: ${summary.goodReturnedQty || 0} items`
      },
      {
        label: 'Stock Movements',
        value: `${summary.movementsCount || 0}`,
        subtitle: 'Audit ledger entries'
      }
    ];

    const tableHeaders = ['Type', 'Reference #', 'Date', 'Party / Requestor', 'Department', 'Warehouse', 'Details / Movement', 'Status'];
    const tableRows = logsToExport.map((r) => [
      r.type || 'N/A',
      r.referenceNumber || '—',
      r.date ? new Date(r.date).toLocaleDateString() : '—',
      r.actor || '—',
      r.department || '—',
      r.warehouse || '—',
      r.details || '—',
      r.status || '—'
    ]);

    const tableFooters = [
      `Total (${logsToExport.length} entries)`,
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ];

    exportReportToPdf({
      reportTitle: 'Store & Stock Inventory Audit Report',
      reportSubtitle: 'Real-time inventory valuation, stock movements ledger, material issues (SIV) and returns (SRV)',
      formNumber: 'FORM-GT-STR-01',
      moduleName: 'Store & Warehouse Operations',
      timeframeLabel,
      filterDetails: filterDetails || 'All Inventory Records',
      summaryCards,
      tableHeaders,
      tableRows,
      tableFooters,
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 38 },
        4: { cellWidth: 26 },
        5: { cellWidth: 26 },
        6: { cellWidth: 'auto' },
        7: { cellWidth: 22, halign: 'center' }
      },
      fileName: `GT_ERP_Store_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`,
      user
    });
  };

  const summary = reportData?.summary || {};
  const analytics = reportData?.analytics || {};
  const logs = reportData?.unifiedLog || [];

  // Filter logs for Store-focused entries
  const storeLogs = logs.filter((item) =>
    item.type.includes('Material') ||
    item.type.includes('Return') ||
    item.type.includes('Stock') ||
    item.type.includes('Adjustment')
  );

  const filteredLogs = storeLogs.filter((item) => {
    if (!searchTable) return true;
    const term = searchTable.toLowerCase();
    return (
      item.referenceNumber?.toLowerCase().includes(term) ||
      item.actor?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term) ||
      item.warehouse?.toLowerCase().includes(term) ||
      item.details?.toLowerCase().includes(term)
    );
  });

  // Movements by type for pie chart
  const movementsData = analytics.movementsByType ? [
    { name: 'Stock Issues (SIV)', value: analytics.movementsByType.stockIssue || 0 },
    { name: 'GRV Receipts', value: analytics.movementsByType.purchaseReceipt || 0 },
    { name: 'Staff Returns', value: analytics.movementsByType.stockReturn || 0 },
    { name: 'Transfers', value: analytics.movementsByType.transfer || 0 },
    { name: 'Adjustments', value: analytics.movementsByType.adjustment || 0 },
    { name: 'Damaged Scrap', value: analytics.movementsByType.damaged || 0 }
  ].filter(m => m.value > 0) : [];

  const handleAnalyzeWithChatGPT = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : (storeLogs.length > 0 ? storeLogs : (reportData?.unifiedLog || []));
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
      `Department: ${departmentFilter || 'All'}`,
      searchTable ? `Search: "${searchTable}"` : null
    ].filter(Boolean).join(' | ');

    const summaryCards = [
      {
        label: 'Total Inventory Valuation',
        value: formatCurrency(summary.totalStockValuation),
        subtitle: `${summary.totalStockItemsCount || 0} trackable SKUs`
      },
      {
        label: 'Active Stock SKUs',
        value: `${summary.activeStockItemsCount || 0}`,
        subtitle: `${summary.zeroStockCount || 0} out of stock`
      },
      {
        label: 'Material Issues (SIV)',
        value: `${summary.totalSivIssuesCount || 0}`,
        subtitle: `Valued: ${formatCurrency(summary.totalSivValue)}`
      },
      {
        label: 'Goods Received (GRV)',
        value: `${summary.totalGrvCount || 0}`,
        subtitle: `${summary.totalReceivedQty || 0} units accepted`
      },
      {
        label: 'Low Stock Alerts',
        value: `${summary.lowStockAlertsCount || 0} items`,
        subtitle: 'At or below reorder threshold'
      },
      {
        label: 'Total Movements Ledger',
        value: `${summary.totalMovementsCount || 0}`,
        subtitle: 'Audit ledger entries'
      }
    ];

    const tableHeaders = ['Type', 'Reference #', 'Date', 'Party / Requestor', 'Department', 'Warehouse', 'Details / Movement', 'Status'];
    const tableRows = logsToExport.map((r) => [
      r.type || 'N/A',
      r.referenceNumber || '—',
      r.date ? new Date(r.date).toLocaleDateString() : '—',
      r.actor || '—',
      r.department || '—',
      r.warehouse || '—',
      r.details || '—',
      r.status || '—'
    ]);

    analyzeReportWithChatGPT({
      reportTitle: 'Store & Stock Inventory Reports',
      reportSubtitle: 'Real-time inventory valuation, stock movements ledger, material issues (SIV) and returns (SRV)',
      moduleName: 'Store & Warehouse Operations',
      timeframeLabel,
      filterDetails: filterDetails || 'All Inventory Records',
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
            <Package className="w-6 h-6 text-primary-500" />
            <span>{t('Store & Stock Inventory Reports')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Real-time inventory valuation, stock movements ledger, material issues (SIV) and returns (SRV)')}
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

            {/* Department Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t('Department')}:</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('All Departments')}</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{t(dept)}</option>
                ))}
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
          title="Stock Valuation"
          value={formatCurrency(summary.totalValuation)}
          subtitle={t('On-hand physical assets')}
          icon={Boxes}
        />
        <StatCard
          title="Low Stock Warning"
          value={summary.lowStockCount || 0}
          subtitle={t('Items below min safe level')}
          icon={ShieldAlert}
        />
        <StatCard
          title="Requisitions Issued"
          value={`${summary.completedRequestsCount || 0} SIV`}
          subtitle={`${summary.totalIssuedItemsQty || 0} ${t('units released')}`}
          icon={Package}
        />
        <StatCard
          title="Staff Returns"
          value={`${summary.totalReturnsCount || 0} SRV`}
          subtitle={`${t('Restocked')}: ${summary.goodReturnedQty || 0} ${t('items')}`}
          icon={RotateCcw}
        />
        <StatCard
          title="Stock Movements"
          value={summary.movementsCount || 0}
          subtitle={t('Audit ledger entries')}
          icon={History}
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Material Consumption by Department BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-primary-500" />
            <span>{t('Material Consumption by Department (Qty)')}</span>
          </h2>
          <div className="h-64">
            {analytics.consumptionByDept && analytics.consumptionByDept.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.consumptionByDept} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#da1f26" radius={[4, 4, 0, 0]} name={t('Units Issued')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {t('No consumption records in this period')}
              </div>
            )}
          </div>
        </div>

        {/* Top Consumed Items BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary-500" />
            <span>{t('Most Consumed Inventory Materials')}</span>
          </h2>
          <div className="h-64">
            {analytics.topConsumedItems && analytics.topConsumedItems.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topConsumedItems} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} name={t('Units Issued')} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {t('No material issues recorded')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Store Activity Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t('Material Requisitions & Staff Return Ledger')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('Audit log of approved material requisitions (SIV) and return vouchers (SRV)')}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={t('Search reference, party, item...')}
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
                <th className="p-3">{t('Reference #')}</th>
                <th className="p-3">{t('Date')}</th>
                <th className="p-3">{t('Requestor / Party')}</th>
                <th className="p-3">{t('Department')}</th>
                <th className="p-3">{t('Warehouse')}</th>
                <th className="p-3">{t('Details')}</th>
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
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {item.actor}
                    </td>
                    <td className="p-3 text-slate-500">
                      {t(item.department)}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.warehouse}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={item.details}>
                      {item.details}
                    </td>
                    <td className="p-3">
                      <Badge status={item.status} text={item.status} size="xs" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-xs text-slate-400">
                    {t('No store records found matching your filters')}
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

