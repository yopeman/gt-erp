import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import reportService from '../../services/reportService';
import { exportReportToPdf } from '../../utils/reportPdfExport';
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
  TrendingUp,
  Calendar,
  Filter,
  Download,
  FileText,
  RefreshCw,
  ShoppingCart,
  Receipt,
  Target,
  DollarSign,
  Building2,
  AlertTriangle,
  Search,
  CheckCircle2,
  Percent
} from 'lucide-react';

const PIE_COLORS = ['#da1f26', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export default function CrmReports() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTable, setSearchTable] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        timeframe,
        status: statusFilter || undefined
      };
      if (timeframe === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const res = await reportService.getCrmReport(params);
      if (res?.success) {
        setReportData(res.data);
      } else if (res?.data?.success) {
        setReportData(res.data.data);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to load CRM report');
      }
    } catch (err) {
      console.error('CRM report fetch error:', err);
      setError(err.message || 'Error compiling CRM analytics report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, statusFilter]);

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
    const headers = ['Type', 'Reference / Order', 'Date', 'Customer / Party', 'Department', 'Details', 'Amount (ETB)', 'Status'];
    const rows = logs.map((r) => [
      `"${r.type}"`,
      `"${r.referenceNumber}"`,
      `"${new Date(r.date).toLocaleDateString()}"`,
      `"${r.actor}"`,
      `"${r.department}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${r.amount || 0}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GT_ERP_CRM_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const logsToExport = filteredLogs.length > 0 ? filteredLogs : (reportData?.unifiedLog || []);
    if (!reportData || logsToExport.length === 0) {
      alert('No data available to export.');
      return;
    }

    const timeframeLabel = timeframe === 'custom'
      ? `Custom (${customStartDate} to ${customEndDate})`
      : timeframe.toUpperCase();

    const filterDetails = [
      `Status: ${statusFilter || 'All'}`,
      searchTable ? `Search: "${searchTable}"` : null
    ].filter(Boolean).join(' | ');

    const summaryCards = [
      {
        label: 'Total Sales Value',
        value: formatCurrency(summary.totalSalesRevenue),
        subtitle: `${summary.totalOrdersCount || 0} orders booked`
      },
      {
        label: 'Orders Completed',
        value: `${summary.completedOrdersCount || 0}`,
        subtitle: `${summary.inProductionOrdersCount || 0} in production`
      },
      {
        label: 'Lead Conversion',
        value: `${summary.conversionRate || 0}%`,
        subtitle: `${summary.convertedLeadsCount || 0} of ${summary.totalLeads || 0} leads`
      },
      {
        label: 'Unpaid Receivables',
        value: formatCurrency(summary.totalUnpaidReceivables),
        subtitle: `Invoiced: ${formatCurrency(summary.totalInvoicedAmount)}`
      },
      {
        label: 'Estimated Margin',
        value: `${summary.estimatedProfitMargin || 0}%`,
        subtitle: `Cost: ${formatCurrency(summary.totalEstimatedCost)}`
      }
    ];

    const tableHeaders = ['Type', 'Reference / Order', 'Date', 'Customer / Party', 'Department', 'Details', 'Amount (ETB)', 'Status'];
    const tableRows = logsToExport.map((r) => [
      r.type || 'N/A',
      r.referenceNumber || '—',
      r.date ? new Date(r.date).toLocaleDateString() : '—',
      r.actor || '—',
      r.department || '—',
      r.details || '—',
      Number(r.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
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
      Number(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ''
    ];

    exportReportToPdf({
      reportTitle: 'CRM & Sales Performance Audit Report',
      reportSubtitle: 'Printing orders throughput, revenue by service, customer receivables & lead pipeline analytics',
      formNumber: 'FORM-GT-CRM-01',
      moduleName: 'CRM & Sales Operations',
      timeframeLabel,
      filterDetails: filterDetails || 'All Records',
      summaryCards,
      tableHeaders,
      tableRows,
      tableFooters,
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 38 },
        4: { cellWidth: 26 },
        5: { cellWidth: 'auto' },
        6: { cellWidth: 30, halign: 'right' },
        7: { cellWidth: 22, halign: 'center' }
      },
      fileName: `GT_ERP_CRM_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`,
      user
    });
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
      item.details?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary-500" />
            <span>{t('nav.crmReports') || 'CRM & Sales Performance Reports'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Printing orders throughput, revenue by service, customer receivables & lead pipeline analytics
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
            onClick={handleExportPDF}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
            title="Export official PDF report in form format"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF</span>
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

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="quotation">Quotation</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_production">In Production</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
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
          title="Total Sales Value"
          value={formatCurrency(summary.totalSalesRevenue)}
          subtitle={`${summary.totalOrdersCount || 0} orders booked`}
          icon={DollarSign}
        />
        <StatCard
          title="Orders Completed"
          value={summary.completedOrdersCount || 0}
          subtitle={`${summary.inProductionOrdersCount || 0} in production`}
          icon={Receipt}
        />
        <StatCard
          title="Lead Conversion"
          value={`${summary.conversionRate || 0}%`}
          subtitle={`${summary.convertedLeadsCount || 0} of ${summary.totalLeads || 0} converted`}
          icon={Target}
        />
        <StatCard
          title="Unpaid Receivables"
          value={formatCurrency(summary.totalUnpaidReceivables)}
          subtitle={`Invoiced: ${formatCurrency(summary.totalInvoicedAmount)}`}
          icon={ShoppingCart}
        />
        <StatCard
          title="Estimated Margin"
          value={`${summary.estimatedProfitMargin || 0}%`}
          subtitle={`Est. Cost: ${formatCurrency(summary.totalEstimatedCost)}`}
          icon={Percent}
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Printing Service BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary-500" />
            <span>Top Revenue by Printing Service</span>
          </h2>
          <div className="h-64">
            {analytics.revenueByService && analytics.revenueByService.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.revenueByService} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#da1f26" radius={[4, 4, 0, 0]} name="Revenue (ETB)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No service revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Lead Conversion Funnel / Status PieChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary-500" />
            <span>Lead Status Distribution</span>
          </h2>
          <div className="h-64">
            {analytics.leadsByStatus && analytics.leadsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.leadsByStatus}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analytics.leadsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No lead status records in this timeframe
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed CRM Orders & Invoices Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              CRM & Sales Transaction Ledger
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unified activity log of sales orders, lead acquisitions, and official invoices
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search order, customer..."
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
                <th className="p-3">Customer / Party</th>
                <th className="p-3">Date</th>
                <th className="p-3">Details</th>
                <th className="p-3">Amount</th>
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
                      {item.actor}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={item.details}>
                      {item.details}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {item.amount ? formatCurrency(item.amount) : '-'}
                    </td>
                    <td className="p-3">
                      <Badge status={item.status} text={item.status} size="xs" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-xs text-slate-400">
                    No CRM records found matching the active filters
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

