import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import reportService from '../../services/reportService';
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
  Landmark,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Receipt,
  Building2,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  Search,
  CheckCircle2,
  FileCheck2
} from 'lucide-react';

const PIE_COLORS = ['#10b981', '#f59e0b', '#da1f26', '#3b82f6', '#8b5cf6'];

export default function FinanceReports() {
  const { t } = useTranslation();

  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'pnl' | 'ap' | 'treasury' | 'tax'
  const [searchTable, setSearchTable] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { timeframe };
      if (timeframe === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const res = await reportService.getFinanceReport(params);
      if (res?.success) {
        setReportData(res.data);
      } else if (res?.data?.success) {
        setReportData(res.data.data);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to load financial report');
      }
    } catch (err) {
      console.error('Finance report fetch error:', err);
      setError(err.message || 'Error generating finance & general ledger report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe]);

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
      alert('No data available to export.');
      return;
    }
    const headers = ['Type', 'Reference #', 'Date', 'Party / Vendor', 'Category / Cost Center', 'Amount (ETB)', 'VAT / Tax', 'Status'];
    const rows = logs.map((r) => [
      `"${r.type}"`,
      `"${r.referenceNumber}"`,
      `"${new Date(r.date).toLocaleDateString()}"`,
      `"${r.party}"`,
      `"${r.category}"`,
      `"${r.amount || 0}"`,
      `"${r.vat || 0}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GT_ERP_Finance_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
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

  const apAgingData = [
    { name: 'Current (0-30 Days)', value: analytics.apAging?.current || 0 },
    { name: '31 - 60 Days', value: analytics.apAging?.thirtyDays || 0 },
    { name: '60+ Days Overdue', value: analytics.apAging?.sixtyDaysPlus || 0 }
  ];

  const filteredLogs = logs.filter((item) => {
    if (!searchTable) return true;
    const term = searchTable.toLowerCase();
    return (
      item.referenceNumber?.toLowerCase().includes(term) ||
      item.party?.toLowerCase().includes(term) ||
      item.category?.toLowerCase().includes(term) ||
      item.type?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary-500" />
            <span>{t('nav.financeReports') || 'Financial Statements & Reports'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            General ledger summaries, profit & loss statement, AP aging, treasury reserves & tax compliance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
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
                {tItem.label}
              </button>
            ))}
          </div>

          {/* Perspective Subtabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
            {[
              { id: 'overview', label: 'Executive Overview' },
              { id: 'pnl', label: 'Income Statement (P&L)' },
              { id: 'ap', label: 'Accounts Payable & Aging' },
              { id: 'treasury', label: 'Treasury & Reserves' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Picker */}
        {timeframe === 'custom' && (
          <form onSubmit={handleApplyCustomDate} className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">To:</label>
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
              Apply Filter
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
          title="Gross Invoiced Revenue"
          value={formatCurrency(summary.totalGrossRevenue)}
          subtitle={`Collected: ${formatCurrency(summary.totalPaymentsReceived)}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Accounts Payable Billed"
          value={formatCurrency(summary.totalBillsAmount)}
          subtitle={`Outstanding: ${formatCurrency(summary.totalBillsOutstanding)}`}
          icon={Receipt}
        />
        <StatCard
          title="Operating Expenses"
          value={formatCurrency(summary.totalOperatingExpenses)}
          subtitle="Administrative & Floor Overhead"
          icon={CreditCard}
        />
        <StatCard
          title="Net Operating Profit"
          value={formatCurrency(summary.netOperatingProfit)}
          subtitle={`Gross Margin: ${formatCurrency(summary.grossProfit)}`}
          icon={DollarSign}
        />
        <StatCard
          title="Bank & Cash Reserves"
          value={formatCurrency(summary.totalBankReserves)}
          subtitle="Available Liquid Treasury"
          icon={Landmark}
        />
      </div>

      {/* P&L Statement View if pnl tab is active */}
      {activeTab === 'pnl' && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-primary-500" />
            <span>Profit & Loss Statement (Income Statement)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                <tr className="font-bold bg-slate-50 dark:bg-slate-900/60">
                  <td className="p-3">Operating Revenue (Invoices & Sales)</td>
                  <td className="p-3 text-right text-emerald-600 font-black">{formatCurrency(summary.totalGrossRevenue)}</td>
                </tr>
                <tr>
                  <td className="p-3 pl-6 text-slate-500">Less: Cost of Materials & Procurement (AP Bills)</td>
                  <td className="p-3 text-right text-rose-500">({formatCurrency(summary.totalBillsAmount)})</td>
                </tr>
                <tr className="font-bold bg-slate-50/50 dark:bg-slate-800/50">
                  <td className="p-3">Gross Operating Margin</td>
                  <td className="p-3 text-right font-black">{formatCurrency(summary.grossProfit)}</td>
                </tr>
                <tr>
                  <td className="p-3 pl-6 text-slate-500">Less: Total Operating Overhead (Vouchers)</td>
                  <td className="p-3 text-right text-rose-500">({formatCurrency(summary.totalOperatingExpenses)})</td>
                </tr>
                <tr className="font-black text-sm bg-primary-50/50 dark:bg-primary-950/30 text-slate-900 dark:text-slate-100 border-t-2 border-primary-500">
                  <td className="p-3">Net Operating Income / (Loss)</td>
                  <td className="p-3 text-right text-primary-600 dark:text-primary-400">{formatCurrency(summary.netOperatingProfit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Cost Center BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-500" />
            <span>Operating Expenses by Cost Center</span>
          </h2>
          <div className="h-64">
            {analytics.expensesByCostCenter && analytics.expensesByCostCenter.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.expensesByCostCenter} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#da1f26" radius={[4, 4, 0, 0]} name="Expense (ETB)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No expense vouchers in this period
              </div>
            )}
          </div>
        </div>

        {/* AP Aging Breakdown PieChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary-500" />
            <span>Accounts Payable Aging Profile</span>
          </h2>
          <div className="h-64">
            {apAgingData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={apAgingData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {apAgingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No outstanding vendor payables
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Financial Activity Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              General Ledger Transactions & AP/AR Audit Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unified financial audit trail of supplier bills, operational expense vouchers, and invoices
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, party, account..."
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
                <th className="p-3">Type</th>
                <th className="p-3">Reference #</th>
                <th className="p-3">Party / Vendor</th>
                <th className="p-3">Date</th>
                <th className="p-3">Category</th>
                <th className="p-3">Amount</th>
                <th className="p-3">VAT</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                    <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                      {item.type}
                    </td>
                    <td className="p-3 font-semibold text-primary-600 dark:text-primary-400">
                      {item.referenceNumber}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {item.party}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.category}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.vat ? formatCurrency(item.vat) : '-'}
                    </td>
                    <td className="p-3">
                      <Badge status={item.status} text={item.status} size="xs" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-xs text-slate-400">
                    No financial records matched your active filters
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

