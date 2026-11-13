import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import reportService from '../../services/reportService';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
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
  Users,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  Clock,
  Timer,
  CalendarDays,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Search,
  ArrowRight
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

export default function HrReports() {
  const { t } = useTranslation();

  const [timeframe, setTimeframe] = useState('monthly');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState('');
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
        department: departmentFilter || undefined
      };
      if (timeframe === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      const res = await reportService.getHrReport(params);
      if (res?.success) {
        setReportData(res.data);
      } else if (res?.data?.success) {
        setReportData(res.data.data);
      } else {
        throw new Error(res?.message || res?.data?.message || 'Failed to load HR report');
      }
    } catch (err) {
      console.error('HR report fetch error:', err);
      setError(err.message || 'Error generating HR analytics report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [timeframe, departmentFilter]);

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
    const headers = ['Type', 'Employee / Reference', 'Date', 'Department', 'Details', 'Metric / Value', 'Status'];
    const rows = logs.map((r) => [
      `"${r.type}"`,
      `"${r.referenceNumber}"`,
      `"${new Date(r.date).toLocaleDateString()}"`,
      `"${r.department}"`,
      `"${(r.details || '').replace(/"/g, '""')}"`,
      `"${r.metric || ''}"`,
      `"${r.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GT_ERP_HR_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
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
      item.type?.toLowerCase().includes(term) ||
      item.department?.toLowerCase().includes(term) ||
      item.details?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" />
            <span>{t('nav.hrReports') || 'HR & Workforce Analytics Report'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Workforce headcount, attendance metrics, overtime hours, leave records & payroll expenditures
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

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
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
          title="Total Workforce"
          value={summary.totalHeadcount || 0}
          subtitle={`${summary.activeHeadcount || 0} active employees`}
          icon={Users}
        />
        <StatCard
          title="Attendance Rate"
          value={`${summary.attendanceRate || 100}%`}
          subtitle={`${summary.presentCount || 0} on-time • ${summary.lateCount || 0} late`}
          icon={Clock}
        />
        <StatCard
          title="Approved Overtime"
          value={`${summary.totalApprovedOtHours || 0} hrs`}
          subtitle={`Cost: ${formatCurrency(summary.totalOtCost)}`}
          icon={Timer}
        />
        <StatCard
          title="Leave Days Taken"
          value={`${summary.totalLeaveDays || 0} days`}
          subtitle={`${summary.approvedLeavesCount || 0} approved • ${summary.pendingLeavesCount || 0} pending`}
          icon={CalendarDays}
        />
        <StatCard
          title="Total Net Payroll"
          value={formatCurrency(summary.totalNetPayroll)}
          subtitle={`Gross: ${formatCurrency(summary.totalGrossPayroll)}`}
          icon={CreditCard}
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Headcount BarChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-500" />
            <span>Staff Headcount by Department</span>
          </h2>
          <div className="h-64">
            {analytics.headcountByDept && analytics.headcountByDept.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.headcountByDept} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#da1f26" radius={[4, 4, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department data available
              </div>
            )}
          </div>
        </div>

        {/* Leave Distribution PieChart */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary-500" />
            <span>Leave Days Taken by Type</span>
          </h2>
          <div className="h-64">
            {analytics.leaveByType && analytics.leaveByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.leaveByType}
                    dataKey="days"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analytics.leaveByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No leave records for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Activity Log Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Workforce Operations & Audit Trail
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing recent attendance, overtime authorizations, and approved leaves
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff, department..."
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
                <th className="p-3">Employee</th>
                <th className="p-3">Department</th>
                <th className="p-3">Date</th>
                <th className="p-3">Details</th>
                <th className="p-3">Metric</th>
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
                    <td className="p-3 text-slate-500 dark:text-slate-400">
                      {item.department}
                    </td>
                    <td className="p-3 text-slate-500">
                      {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={item.details}>
                      {item.details}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                      {item.metric || '-'}
                    </td>
                    <td className="p-3">
                      <Badge status={item.status} text={item.status} size="xs" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-xs text-slate-400">
                    No HR records matched your filters
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

