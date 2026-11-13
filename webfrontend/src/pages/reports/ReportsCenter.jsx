import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import reportService from '../../services/reportService';
import storeService from '../../services/storeService';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  ShoppingCart,
  Boxes,
  RotateCcw,
  Users,
  Building2,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Package,
  Search,
  Factory,
  Landmark
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

export default function ReportsCenter() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const location = useLocation();

  // Timeframe state
  const [timeframe, setTimeframe] = useState('monthly'); // 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Actor / Role Perspective Tab
  const initialActor = location.pathname.includes('/store/')
    ? 'storekeeper'
    : location.pathname.includes('/purchasing/')
    ? 'purchaser'
    : 'all';
  const [activeActorTab, setActiveActorTab] = useState(initialActor);

  // Secondary Filters
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [vatFilter, setVatFilter] = useState('');
  const [searchTable, setSearchTable] = useState('');

  // Data & Loading States
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
        actor: activeActorTab,
        warehouse: warehouseFilter || undefined,
        department: departmentFilter || undefined,
        vatStatus: vatFilter || undefined
      };

      if (timeframe === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      const [res, whRes] = await Promise.allSettled([
        reportService.getComprehensiveReport(params),
        storeService.getWarehouses({ limit: 50 })
      ]);

      if (res.status === 'fulfilled' && res.value?.success) {
        setReportData(res.value.data);
      } else {
        throw new Error(res.value?.message || 'Failed to load report analytics');
      }

      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load operational report:', err);
      setError(err.message || 'Error compiling operations report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, activeActorTab, warehouseFilter, departmentFilter, vatFilter]);

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!reportData?.unifiedLog || reportData.unifiedLog.length === 0) {
      alert('No records available to export for the selected date range.');
      return;
    }

    const headers = ['Type', 'Document Number', 'Date', 'Actor / Party', 'Department', 'Warehouse', 'Details', 'Amount / Value', 'Tax / VAT', 'Status'];
    const rows = reportData.unifiedLog.map((r) => [
      `"${r.type}"`,
      `"${r.referenceNumber}"`,
      `"${new Date(r.date).toLocaleDateString()}"`,
      `"${r.actor}"`,
      `"${r.department}"`,
      `"${r.warehouse}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      r.amount !== null ? `"${r.amount}"` : '""',
      `"${r.vatStatus}"`,
      `"${r.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GT_ERP_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = reportData?.summary || {};
  const analytics = reportData?.analytics || {};
  const logs = reportData?.unifiedLog || [];

  const filteredLogs = logs.filter((item) => {
    if (!searchTable) return true;
    const term = searchTable.toLowerCase();
    return (
      item.referenceNumber?.toLowerCase().includes(term) ||
      item.actor?.toLowerCase().includes(term) ||
      item.type?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term) ||
      item.details?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" />
            <span>Dedicated Operations & Multi-Actor Reports Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit, material consumption, procurement spend, and VAT performance reports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shadow-xs"
            title="Export to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
            title="Print Executive Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Module Reporting Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { title: 'HR Workforce', path: '/hr/reports', icon: Users, desc: 'Attendance & Payroll' },
          { title: 'Store & Inventory', path: '/store/reports', icon: Package, desc: 'Stock & Movements' },
          { title: 'Procurement', path: '/purchasing/reports', icon: ShoppingCart, desc: 'Spend & Orders' },
          { title: 'CRM & Sales', path: '/crm/reports', icon: TrendingUp, desc: 'Orders & Receivables' },
          { title: 'Production Floor', path: '/production/reports', icon: Factory, desc: 'Jobs & Spoilage' },
          { title: 'Finance Ledger', path: '/finance/reports', icon: Landmark, desc: 'P&L, AP & Taxes' }
        ].map((mod) => {
          const ModIcon = mod.icon;
          const isCurrent = location.pathname === mod.path;
          return (
            <Link
              key={mod.path}
              to={mod.path}
              className={`p-3 rounded-2xl border transition flex flex-col justify-between group ${
                isCurrent
                  ? 'bg-primary-500 text-white border-primary-500 shadow-xs'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary-500/60 hover:shadow-xs text-slate-800 dark:text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-1.5 rounded-lg ${isCurrent ? 'bg-white/20' : 'bg-primary-50 dark:bg-primary-950/60 text-primary-500'}`}>
                  <ModIcon className="w-4 h-4" />
                </div>
                <ArrowRight className={`w-3.5 h-3.5 transition group-hover:translate-x-0.5 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <div className="mt-2.5">
                <div className="text-xs font-bold leading-tight">{mod.title}</div>
                <div className={`text-[10px] truncate mt-0.5 ${isCurrent ? 'text-primary-100' : 'text-slate-400'}`}>
                  {mod.desc}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Timeframe & Date Range Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Timeframe Quick Pills */}
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
                {tItem.label}
              </button>
            ))}
          </div>

          {/* Active Period Display */}
          {reportData?.range && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span>
                Report Period: <strong className="text-slate-800 dark:text-slate-200">
                  {new Date(reportData.range.startDate).toLocaleDateString()}
                </strong>{' '}
                —{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {new Date(reportData.range.endDate).toLocaleDateString()}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Custom Date Range Picker when Custom is chosen */}
        {timeframe === 'custom' && (
          <form
            onSubmit={handleApplyCustomDate}
            className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs"
          >
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700 dark:text-slate-300">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700 dark:text-slate-300">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                required
              />
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold transition shadow-xs"
            >
              Apply Custom Range
            </button>
          </form>
        )}
      </div>

      {/* Dedicated Actor / Role Perspectives */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-x-auto text-xs">
        {[
          { id: 'all', label: 'All Operations & Executive', icon: Building2 },
          { id: 'storekeeper', label: 'Storekeeper Report', icon: Boxes },
          { id: 'purchaser', label: 'Purchaser & Sourcing Report', icon: ShoppingCart },
          { id: 'employee', label: 'Employee & Dept Requisitions', icon: Users },
          { id: 'manager', label: 'Manager & Admin Governance', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeActorTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveActorTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/80 dark:text-primary-300 border border-primary-200 dark:border-primary-800 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Dropdown Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />

          {/* Warehouse Filter */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.warehouseName}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* VAT Filter */}
          <select
            value={vatFilter}
            onChange={(e) => setVatFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="">All VAT Statuses</option>
            <option value="with_vat">With VAT (15%)</option>
            <option value="without_vat">Without VAT (0% Non-VAT)</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {(warehouseFilter || departmentFilter || vatFilter) && (
          <button
            onClick={() => {
              setWarehouseFilter('');
              setDepartmentFilter('');
              setVatFilter('');
            }}
            className="text-xs text-rose-600 hover:underline font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* KPI Overview Grid (Dynamic based on Actor Perspective) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(summary.totalSpend)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">Total Procurement Spend ({summary.totalPOs || 0} POs)</div>
          </div>
        </div>

        {/* VAT Collected / Paid */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalVatAmount)}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              15% VAT Paid ({summary.withVatCount || 0} VAT / {summary.withoutVatCount || 0} Non-VAT)
            </div>
          </div>
        </div>

        {/* Goods Receipts / Inward */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {summary.totalAcceptedItemsQty?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Items Received in Warehouse ({summary.totalGrnCount || 0} GRVs)
            </div>
          </div>
        </div>

        {/* Outward Materials Issued */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100">
              {summary.totalIssuedItemsQty?.toLocaleString() || 0}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Items Issued to Production ({summary.completedRequestsCount || 0} Requisitions)
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sourcing Spend by Supplier */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-500" />
              <span>Sourcing Spend by Supplier</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">Top Vendors</span>
          </div>

          <div className="space-y-2.5">
            {(!analytics.spendBySupplier || analytics.spendBySupplier.length === 0) ? (
              <p className="text-xs text-slate-400 py-4 text-center">No purchase order spend recorded for this period.</p>
            ) : (
              analytics.spendBySupplier.map((sup, idx) => {
                const percent = summary.totalSpend > 0 ? ((sup.amount / summary.totalSpend) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{sup.name}</span>
                      <span className="font-bold">{formatCurrency(sup.amount)} ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Material Consumption by Department */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span>Material Consumption by Department</span>
            </h3>
            <span className="text-xs font-bold text-slate-400">Requisitions Issued</span>
          </div>

          <div className="space-y-2.5">
            {(!analytics.consumptionByDept || analytics.consumptionByDept.length === 0) ? (
              <p className="text-xs text-slate-400 py-4 text-center">No department requisitions issued during this period.</p>
            ) : (
              analytics.consumptionByDept.map((dept, idx) => {
                const percent = summary.totalIssuedItemsQty > 0 ? ((dept.quantity / summary.totalIssuedItemsQty) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.name}</span>
                      <span className="font-bold">{dept.quantity.toLocaleString()} units ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Secondary Insight Row: VAT Ratio & Staff Return Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* VAT Ratio Card */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">VAT Status Ratio</div>
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-bold text-emerald-600">With VAT: {summary.withVatCount || 0} POs</div>
            <div className="text-sm font-bold text-slate-500">Non-VAT: {summary.withoutVatCount || 0} POs</div>
          </div>
          <div className="text-[11px] text-slate-500">
            VAT Spend: <strong>{formatCurrency(summary.withVatSpend)}</strong> | Non-VAT Spend: <strong>{formatCurrency(summary.withoutVatSpend)}</strong>
          </div>
        </div>

        {/* Staff Returns Breakdown */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Returns Condition</div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-600 font-bold">Good Restocked: {summary.goodReturnedQty || 0}</span>
            <span className="text-rose-600 font-bold">Damaged/Scrap: {(summary.damagedReturnedQty || 0) + (summary.scrapReturnedQty || 0)}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Total Staff Returns Processed: <strong>{summary.totalReturnsCount || 0} SRVs</strong>
          </div>
        </div>

        {/* Live Warehouse Valuation */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory Health & Valuation</div>
          <div className="text-lg font-black text-slate-900 dark:text-slate-100">
            {formatCurrency(summary.totalValuation)}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{summary.lowStockCount || 0} items below reorder point</span>
          </div>
        </div>
      </div>

      {/* Unified Transaction & Audit Activity Ledger Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Operations & Procurement Audit Ledger
            </h3>
            <p className="text-[11px] text-slate-400">
              Detailed chronological records for {timeframe.toUpperCase()} period ({filteredLogs.length} entries)
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit records..."
              value={searchTable}
              onChange={(e) => setSearchTable(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Doc #</th>
                <th className="px-3 py-2.5">Actor / Party</th>
                <th className="px-3 py-2.5">Department</th>
                <th className="px-3 py-2.5">Warehouse</th>
                <th className="px-3 py-2.5">Amount / Value</th>
                <th className="px-3 py-2.5">Tax (VAT)</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No transactions or movements found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(0, 100).map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.date).toLocaleDateString()}
                    </td>

                    <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {log.type}
                    </td>

                    <td className="px-3 py-2.5 font-mono font-bold text-primary-600 dark:text-primary-400">
                      {log.referenceNumber}
                    </td>

                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                      {log.actor}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {log.department}
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                      {log.warehouse}
                    </td>

                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                      {log.amount !== null ? formatCurrency(log.amount) : '—'}
                    </td>

                    <td className="px-3 py-2.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {log.vatStatus}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <Badge status={log.status} text={log.status} size="xs" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

