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
  Factory,
  Calendar,
  Filter,
  Download,
  FileText,
  RefreshCw,
  Workflow,
  Wrench,
  Trash2,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Search,
  Activity
} from 'lucide-react';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#da1f26', '#8b5cf6', '#ec4899', '#64748b'];

export default function ProductionReports() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [machineFilter, setMachineFilter] = useState('');
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
        machine: machineFilter || undefined
      };
      if (timeframe === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const res = await reportService.getProductionReport(params);
      if (res?.success) {
        setReportData(res.data);
      } else if (res?.data?.success) {
        setReportData(res.data.data);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to load production report');
      }
    } catch (err) {
      console.error('Production report fetch error:', err);
      setError(err.message || 'Error generating production operational report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, machineFilter]);

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
    const headers = ['Type', 'Reference #', 'Date', 'Machine / Entity', 'Stage / Details', 'Quantity', 'Cost (ETB)', 'Status'];
    const rows = logs.map((r) => [
      `"${r.type}"`,
      `"${r.referenceNumber}"`,
      `"${new Date(r.date).toLocaleDateString()}"`,
      `"${r.machineOrEntity}"`,
      `"${(r.stageOrDetails || '').replace(/"/g, '""')}"`,
      `"${r.quantity || 0}"`,
      `"${r.cost || 0}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GT_ERP_Production_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
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
      `Machine: ${machineFilter || 'All Machines'}`,
      searchTable ? `Search: "${searchTable}"` : null
    ].filter(Boolean).join(' | ');

    const summaryCards = [
      {
        label: 'Completed Jobs',
        value: `${summary.completedJobsCount || 0}`,
        subtitle: `${summary.inProgressJobsCount || 0} active on floor`
      },
      {
        label: 'Fleet Uptime',
        value: `${summary.machineUptimePercent || 100}%`,
        subtitle: `${summary.totalMachines || 0} units active`
      },
      {
        label: 'Spoilage Cost',
        value: formatCurrency(summary.totalWastageCost),
        subtitle: `${summary.totalWastageRecords || 0} scrap logs`
      },
      {
        label: 'Wasted Material',
        value: `${Number(summary.totalWastedQuantity || 0).toLocaleString()} units`,
        subtitle: 'Spoiled raw material sheets'
      },
      {
        label: 'Maintenance Cost',
        value: formatCurrency(summary.totalMaintenanceCost),
        subtitle: `${summary.activeMaintenanceCount || 0} active tickets`
      }
    ];

    const tableHeaders = ['Type', 'Reference #', 'Date', 'Machine / Entity', 'Stage / Details', 'Quantity', 'Cost (ETB)', 'Status'];
    const tableRows = logsToExport.map((r) => [
      r.type || 'N/A',
      r.referenceNumber || '—',
      r.date ? new Date(r.date).toLocaleDateString() : '—',
      r.machineOrEntity || '—',
      r.stageOrDetails || '—',
      r.quantity ? Number(r.quantity).toLocaleString() : '—',
      Number(r.cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      r.status || '—'
    ]);

    const totalCost = logsToExport.reduce((acc, r) => acc + Number(r.cost || 0), 0);
    const tableFooters = [
      `Total (${logsToExport.length} entries)`,
      '',
      '',
      '',
      '',
      '',
      Number(totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ''
    ];

    exportReportToPdf({
      reportTitle: 'Production & Machine Operations Audit Report',
      reportSubtitle: 'Floor run throughput, machine fleet uptime, maintenance expenditures & spoilage wastage analysis',
      formNumber: 'FORM-GT-PRD-01',
      moduleName: 'Production Floor Operations',
      timeframeLabel,
      filterDetails: filterDetails || 'All Production Runs',
      summaryCards,
      tableHeaders,
      tableRows,
      tableFooters,
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 35 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 28, halign: 'right' },
        7: { cellWidth: 22, halign: 'center' }
      },
      fileName: `GT_ERP_Production_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.pdf`,
      user
    });
  };

  const summary = reportData?.summary || {};
  const analytics = reportData?.analytics || {};
  const logs = reportData?.unifiedLog || [];
  const machines = analytics.machineFleet || [];

  const filteredLogs = logs.filter((item) => {
    if (!searchTable) return true;
    const term = searchTable.toLowerCase();
    return (
      item.referenceNumber?.toLowerCase().includes(term) ||
      item.machineOrEntity?.toLowerCase().includes(term) ||
      item.type?.toLowerCase().includes(term) ||
      item.stageOrDetails?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Factory className="w-6 h-6 text-primary-500" />
            <span>{t('nav.productionReports') || 'Production & Machine Operations Reports'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Floor run throughput, machine fleet uptime, maintenance expenditures & spoilage wastage analysis
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

          {/* Machine Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Machine:</span>
            <select
              value={machineFilter}
              onChange={(e) => setMachineFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Machines</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
              ))}
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
          title="Completed Jobs"
          value={summary.completedJobsCount || 0}
          subtitle={`${summary.inProgressJobsCount || 0} active in floor`}
          icon={Workflow}
        />
        <StatCard
          title="Machine Fleet Uptime"
          value={`${summary.machineUptimePercent || 100}%`}
          subtitle={`${summary.totalMachines || 0} units active`}
          icon={Activity}
        />
        <StatCard
          title="Total Spoilage Cost"
          value={formatCurrency(summary.totalWastageCost)}
          subtitle={`${summary.totalWastageRecords || 0} scrap logs`}
          icon={Trash2}
        />
        <StatCard
          title="Wasted Material Qty"
          value={`${Number(summary.totalWastedQuantity || 0).toLocaleString()} units`}
          subtitle="Spoiled raw sheets & materials"
          icon={SlidersHorizontal}
        />
        <StatCard
          title="Maintenance Cost"
          value={formatCurrency(summary.totalMaintenanceCost)}
          subtitle={`${summary.activeMaintenanceCount || 0} active tickets`}
          icon={Wrench}
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wastage by Reason BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-primary-500" />
            <span>Spoilage Cost by Failure Reason</span>
          </h2>
          <div className="h-64">
            {analytics.wastageByReason && analytics.wastageByReason.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.wastageByReason} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="cost" fill="#da1f26" radius={[4, 4, 0, 0]} name="Wastage Cost (ETB)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No recorded wastage in this timeframe
              </div>
            )}
          </div>
        </div>

        {/* Jobs by Stage BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-primary-500" />
            <span>Jobs Across Production Stages</span>
          </h2>
          <div className="h-64">
            {analytics.jobsByStage && analytics.jobsByStage.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.jobsByStage} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Jobs Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No active stages recorded
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Operations & Scrap Log Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Floor Operations & Wastage Audit Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live audit trail of job executions, maintenance repairs, and recorded material spoilage
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search job, machine, ticket..."
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
                <th className="p-3">Machine / Line</th>
                <th className="p-3">Date</th>
                <th className="p-3">Details / Stage</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Cost</th>
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
                      {item.machineOrEntity}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={item.stageOrDetails}>
                      {item.stageOrDetails}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {item.quantity ? Number(item.quantity).toLocaleString() : '-'}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {item.cost ? formatCurrency(item.cost) : '-'}
                    </td>
                    <td className="p-3">
                      <Badge status={item.status} text={item.status} size="xs" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-xs text-slate-400">
                    No production events matched the filter criteria
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

