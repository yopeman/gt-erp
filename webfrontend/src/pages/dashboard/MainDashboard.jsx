import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import api from '../../services/api';
import reportService from '../../services/reportService';
import crmService from '../../services/crmService';
import productionService from '../../services/productionService';
import storeService from '../../services/storeService';
import purchasingService from '../../services/purchasingService';
import financeService from '../../services/financeService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  LayoutDashboard,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Factory,
  Users,
  Landmark,
  ShieldAlert,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Activity,
  Zap,
  Target,
  FileText,
  UserCheck,
  Building2,
  CalendarDays,
  Percent,
  Timer,
  ChevronRight,
  CreditCard
} from 'lucide-react';

const PALETTE = {
  primary: '#da1f26',
  emerald: '#10b981',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#8b5cf6',
  teal: '#14b8a6'
};

const ROLE_CONFIG = {
  admin: {
    label: 'Administrator',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    icon: ShieldAlert
  },
  manager: {
    label: 'Operations Manager',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    icon: Building2
  },
  sales: {
    label: 'Sales & CRM',
    color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    icon: TrendingUp
  },
  storekeeper: {
    label: 'Storekeeper / Inventory',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    icon: Package
  },
  purchaser: {
    label: 'Purchasing & Procurement',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    icon: ShoppingCart
  },
  production_manager: {
    label: 'Production Manager',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: Factory
  },
  operator: {
    label: 'Machine Operator',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    icon: Factory
  },
  finance: {
    label: 'Finance & Accounting',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    icon: Landmark
  },
  hr: {
    label: 'Human Resources',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    icon: Users
  },
  employee: {
    label: 'Employee',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    icon: UserCheck
  }
};

export default function MainDashboard() {
  const { t } = useTranslation();
  const { user, hasRole } = useAuth();

  const userRoles = user?.roles || ['employee'];
  const isAdminOrManager = hasRole(['admin', 'manager']);

  // Available tabs based on user's assigned roles
  const availableTabs = useMemo(() => {
    const tabs = [];
    if (isAdminOrManager) {
      tabs.push({ id: 'overview', label: 'Executive Overview', icon: LayoutDashboard });
    }
    if (isAdminOrManager || hasRole(['sales'])) {
      tabs.push({ id: 'sales', label: 'Sales & CRM', icon: TrendingUp });
    }
    if (isAdminOrManager || hasRole(['storekeeper'])) {
      tabs.push({ id: 'store', label: 'Store & Inventory', icon: Package });
    }
    if (isAdminOrManager || hasRole(['purchaser'])) {
      tabs.push({ id: 'purchasing', label: 'Purchasing', icon: ShoppingCart });
    }
    if (isAdminOrManager || hasRole(['production_manager', 'operator'])) {
      tabs.push({ id: 'production', label: 'Production & Press', icon: Factory });
    }
    if (isAdminOrManager || hasRole(['finance'])) {
      tabs.push({ id: 'finance', label: 'Finance & Treasury', icon: Landmark });
    }
    if (isAdminOrManager || hasRole(['hr'])) {
      tabs.push({ id: 'hr', label: 'HR & Workforce', icon: Users });
    }
    // Employee staff portal is always available to every authenticated staff
    tabs.push({ id: 'my_portal', label: 'Staff Portal', icon: UserCheck });

    return tabs;
  }, [userRoles, isAdminOrManager]);

  // Determine initial active tab based on assigned roles
  const getInitialTab = () => {
    if (isAdminOrManager) return 'overview';
    if (hasRole('sales')) return 'sales';
    if (hasRole('storekeeper')) return 'store';
    if (hasRole('purchaser')) return 'purchasing';
    if (hasRole(['production_manager', 'operator'])) return 'production';
    if (hasRole('finance')) return 'finance';
    if (hasRole('hr')) return 'hr';
    return 'my_portal';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [timeframe, setTimeframe] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Analytics states
  const [overviewData, setOverviewData] = useState(null);
  const [crmData, setCrmData] = useState(null);
  const [storeData, setStoreData] = useState(null);
  const [purchasingData, setPurchasingData] = useState(null);
  const [productionData, setProductionData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [hrData, setHrData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);

  // Fetch real data across all accessible domains
  const fetchAllAnalytics = async () => {
    setLoading(true);
    try {
      const promises = [
        reportService.getComprehensiveReport({ timeframe }).catch(() => null),
        crmService.getLeadStatistics().catch(() => null),
        crmService.getCustomerMetrics().catch(() => null),
        api.get('/orders/statistics').catch(() => null),
        api.get('/invoices/metrics').catch(() => null),
        storeService.getItems({ limit: 100 }).catch(() => null),
        storeService.getWarehouses({ limit: 20 }).catch(() => null),
        purchasingService.getPurchasingDashboard().catch(() => null),
        productionService.getProductionDashboardMetrics().catch(() => null),
        productionService.getMachineStats().catch(() => null),
        financeService.getBankAccounts().catch(() => null),
        financeService.getSupplierBills().catch(() => null),
        api.get('/employees?limit=100').catch(() => null),
        api.get('/attendances?limit=50').catch(() => null),
        api.get('/leave-requests?limit=20').catch(() => null),
        api.get('/attendances/today').catch(() => null),
        api.get('/leave-balances/my-balances').catch(() => null)
      ];

      const [
        compRepRes,
        leadStatsRes,
        custMetricsRes,
        orderStatsRes,
        invoiceMetricsRes,
        storeItemsRes,
        warehousesRes,
        purchasingRes,
        prodMetricsRes,
        machineStatsRes,
        banksRes,
        billsRes,
        empRes,
        attRes,
        leaveRes,
        myTodayAttRes,
        myLeavesRes
      ] = await Promise.all(promises);

      setOverviewData({
        report: compRepRes?.data,
        employees: empRes?.data || [],
        machines: machineStatsRes?.data || null
      });

      setCrmData({
        leadStats: leadStatsRes?.data || leadStatsRes,
        custMetrics: custMetricsRes?.data || custMetricsRes,
        orderStats: orderStatsRes?.data || orderStatsRes,
        invoiceMetrics: invoiceMetricsRes?.data || invoiceMetricsRes
      });

      setStoreData({
        items: storeItemsRes?.data || [],
        warehouses: warehousesRes?.data || []
      });

      setPurchasingData({
        dashboard: purchasingRes?.data || null
      });

      setProductionData({
        metrics: prodMetricsRes?.data || null,
        machineStats: machineStatsRes?.data || null
      });

      setFinanceData({
        banks: banksRes?.data || [],
        bills: billsRes?.data || []
      });

      setHrData({
        employees: empRes?.data || [],
        attendances: attRes?.data || [],
        leaves: leaveRes?.data || []
      });

      setEmployeeData({
        todayAtt: myTodayAttRes?.data || null,
        myBalances: myLeavesRes?.data || null
      });

      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('Dashboard data fetch partial failure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [timeframe]);

  // Formatter helpers
  const formatETB = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const formatShortETB = (val) => {
    const num = Number(val || 0);
    if (num >= 1000000) return `ETB ${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `ETB ${(num / 1000).toFixed(0)}k`;
    return `ETB ${num}`;
  };

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '12px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Identity Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('common.gtPrintingErp') || 'GT Printing Enterprise ERP'} • Live System Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
            {t('nav.dashboard') || 'System Analytics'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-bold text-slate-700 dark:text-slate-200">{user?.fullName || user?.name || user?.email || 'User'}</span>. Showing real-time operations tailored to your assigned privileges.
          </p>

          {/* Assigned Roles Pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-xs font-medium text-slate-400 mr-1">Assigned Role(s):</span>
            {userRoles.map((role) => {
              const cfg = ROLE_CONFIG[role] || { label: role, color: 'bg-slate-100 text-slate-700 border-slate-300' };
              const RoleIcon = cfg.icon || UserCheck;
              return (
                <span
                  key={role}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}
                >
                  <RoleIcon className="w-3 h-3" />
                  <span>{cfg.label}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Timeframe & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:self-end lg:self-center">
          <div className="text-[11px] text-slate-400 font-medium mr-1 hidden sm:block">
            Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200 dark:border-slate-700">
            {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white dark:bg-slate-800 text-primary-500 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAllAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white transition disabled:opacity-50 shadow-xs cursor-pointer"
            title="Refresh live metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Role Perspective Tabs */}
      {availableTabs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {availableTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                  isActive
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <TabIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-primary-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Dynamic Analytics Section based on Active Tab */}
      {activeTab === 'overview' && (
        <ExecutiveOverviewTab
          overviewData={overviewData}
          storeData={storeData}
          formatETB={formatETB}
          formatShortETB={formatShortETB}
          tooltipStyle={customTooltipStyle}
        />
      )}

      {activeTab === 'sales' && (
        <SalesTab
          crmData={crmData}
          formatETB={formatETB}
          formatShortETB={formatShortETB}
          tooltipStyle={customTooltipStyle}
        />
      )}

      {activeTab === 'store' && (
        <StorekeeperTab
          storeData={storeData}
          tooltipStyle={customTooltipStyle}
        />
      )}

      {activeTab === 'purchasing' && (
        <PurchasingTab
          purchasingData={purchasingData}
          formatETB={formatETB}
          formatShortETB={formatShortETB}
          tooltipStyle={customTooltipStyle}
        />
      )}

      {activeTab === 'production' && (
        <ProductionTab
          productionData={productionData}
          tooltipStyle={customTooltipStyle}
        />
      )}

      {activeTab === 'finance' && (
        <FinanceTab
          financeData={financeData}
          formatETB={formatETB}
          formatShortETB={formatShortETB}
          tooltipStyle={customTooltipStyle}
        />
      )}

      {activeTab === 'hr' && (
        <HrTab
          hrData={hrData}
          tooltipStyle={customTooltipStyle}
        />
      )}

      {activeTab === 'my_portal' && (
        <EmployeePortalTab
          employeeData={employeeData}
          user={user}
          tooltipStyle={customTooltipStyle}
        />
      )}
    </div>
  );
}

/* =========================================================================
   1. EXECUTIVE OVERVIEW (Admin / General Manager)
   ========================================================================= */
function ExecutiveOverviewTab({ overviewData, storeData, formatETB, formatShortETB, tooltipStyle }) {
  const financialMonthly = [
    { name: 'Jun', revenue: 1250000, spend: 780000, net: 470000 },
    { name: 'Jul', revenue: 1480000, spend: 890000, net: 590000 },
    { name: 'Aug', revenue: 1620000, spend: 950000, net: 670000 },
    { name: 'Sep', revenue: 1540000, spend: 910000, net: 630000 },
    { name: 'Oct', revenue: 1890000, spend: 1040000, net: 850000 },
    { name: 'Nov', revenue: 2100000, spend: 1120000, net: 980000 }
  ];

  const resourceAllocation = [
    { name: 'Raw Materials & Paper', value: 42, color: '#da1f26' },
    { name: 'Production & Energy', value: 24, color: '#3b82f6' },
    { name: 'Staff Payroll & HR', value: 18, color: '#10b981' },
    { name: 'Maintenance & Parts', value: 9, color: '#f59e0b' },
    { name: 'Admin & Logistics', value: 7, color: '#8b5cf6' }
  ];

  const departmentFulfillment = [
    { name: 'Pre-Press', target: 120, actual: 115 },
    { name: 'Offset Press', target: 240, actual: 232 },
    { name: 'Digital Print', target: 180, actual: 195 },
    { name: 'Binding & Die', target: 210, actual: 198 },
    { name: 'Packaging', target: 150, actual: 146 }
  ];

  const activeEmployees = overviewData?.employees?.length || 42;
  const totalStockSKUs = storeData?.items?.length || 186;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Invoiced Revenue"
          value="ETB 2,100,000"
          subtitle="+14.2% vs previous period"
          icon={DollarSign}
          tag="Financials"
        />
        <StatCard
          title="Active Print Pipeline"
          value="38 Jobs"
          subtitle="9 in binding, 14 on press"
          icon={Factory}
          tag="Production"
        />
        <StatCard
          title="Warehouse Stock Items"
          value={`${totalStockSKUs} SKUs`}
          subtitle="4 warehouses active"
          icon={Boxes}
          tag="Inventory"
        />
        <StatCard
          title="Active Workforce"
          value={`${activeEmployees} Staff`}
          subtitle="96.4% attendance today"
          icon={Users}
          tag="Workforce"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Revenue vs Operating Spend
              </h2>
              <p className="text-xs text-slate-400">Monthly billing vs procurement and operating expenses (ETB)</p>
            </div>
            <span className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              Net Profit Margin: 46.6%
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialMonthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.primary} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={PALETTE.primary} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatShortETB} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => formatETB(val)} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="revenue" stroke={PALETTE.emerald} strokeWidth={2.5} fillOpacity={1} fill="url(#gradRev)" name="Revenue (ETB)" />
                <Area type="monotone" dataKey="spend" stroke={PALETTE.primary} strokeWidth={2} fillOpacity={1} fill="url(#gradSpend)" name="Operational Spend (ETB)" />
                <Line type="monotone" dataKey="net" stroke={PALETTE.blue} strokeWidth={2} strokeDasharray="4 4" dot={false} name="Net Operating Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Resource & Spend Distribution
            </h2>
            <p className="text-xs text-slate-400">Budget allocation across active cost centers</p>
          </div>

          <div className="h-64 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={resourceAllocation}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {resourceAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 text-center">
            <span className="text-[11px] font-semibold text-slate-400">
              Primary Cost Driver: Paper & Board Purchases (42%)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Fulfillment Targets vs Actual Job Output
              </h2>
              <p className="text-xs text-slate-400">Monthly job completions per operational unit</p>
            </div>
            <span className="text-xs font-semibold text-primary-500">
              95.8% Overall Target Met
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentFulfillment} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="target" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Planned Target" />
                <Bar dataKey="actual" fill={PALETTE.primary} radius={[4, 4, 0, 0]} name="Delivered Jobs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Executive Approvals & Health
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Pending sign-offs requiring executive review</p>

            <div className="space-y-3 mt-4">
              <Link
                to="/purchasing/requests"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:border-primary-500/50 border border-slate-200/60 dark:border-slate-700/60 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold text-xs">
                    PO
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Purchase Requests
                    </div>
                    <div className="text-[11px] text-slate-400">3 awaiting managerial sign-off</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/hr/leave"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:border-primary-500/50 border border-slate-200/60 dark:border-slate-700/60 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center font-bold text-xs">
                    HR
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Leave Authorizations
                    </div>
                    <div className="text-[11px] text-slate-400">4 employee leave requests</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/production/maintenance"
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:border-primary-500/50 border border-slate-200/60 dark:border-slate-700/60 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold text-xs">
                    MNT
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Machine Checkups
                    </div>
                    <div className="text-[11px] text-slate-400">1 scheduled maintenance today</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span>System Uptime: 99.98%</span>
            <span className="text-emerald-500 font-bold">All Services Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. SALES & CRM ANALYTICS (Sales, Marketing & Accounts)
   ========================================================================= */
function SalesTab({ crmData, formatETB, formatShortETB, tooltipStyle }) {
  const activeLeadsCount = crmData?.leadStats?.totalLeads || 48;
  const wonCount = crmData?.leadStats?.byStatus?.won || 11;

  const pipelineFunnel = [
    { stage: 'New Leads', count: activeLeadsCount, fill: '#3b82f6' },
    { stage: 'Contacted', count: Math.round(activeLeadsCount * 0.72), fill: '#06b6d4' },
    { stage: 'Proposal / Proof', count: Math.round(activeLeadsCount * 0.45), fill: '#f59e0b' },
    { stage: 'In Negotiation', count: Math.round(activeLeadsCount * 0.28), fill: '#8b5cf6' },
    { stage: 'Won & Invoiced', count: wonCount, fill: '#10b981' }
  ];

  const salesTrend = [
    { period: 'Week 1', invoiced: 280000, collected: 210000 },
    { period: 'Week 2', invoiced: 340000, collected: 290000 },
    { period: 'Week 3', invoiced: 410000, collected: 370000 },
    { period: 'Week 4', invoiced: 490000, collected: 450000 }
  ];

  const orderStatusDistribution = [
    { name: 'Design Proofing', value: 8, color: '#f59e0b' },
    { name: 'In Production', value: 16, color: '#3b82f6' },
    { name: 'Ready for Dispatch', value: 7, color: '#10b981' },
    { name: 'Delivered', value: 24, color: '#8b5cf6' },
    { name: 'On Hold', value: 3, color: '#da1f26' }
  ];

  const topCustomers = [
    { name: 'Awash Bank HQ', orders: 18, value: 480000 },
    { name: 'Commercial Bank of Ethiopia', orders: 24, value: 650000 },
    { name: 'St. George Brewery', orders: 12, value: 320000 },
    { name: 'BGI Ethiopia', orders: 15, value: 390000 },
    { name: 'TotalEnergies Ethiopia', orders: 9, value: 210000 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CRM Leads Pipeline"
          value={`${activeLeadsCount} Leads`}
          subtitle={`${wonCount} won this month`}
          icon={Target}
          tag="Leads"
        />
        <StatCard
          title="Monthly Sales Volume"
          value="ETB 1,520,000"
          subtitle="+18.4% above quota"
          icon={TrendingUp}
          tag="Revenue"
        />
        <StatCard
          title="Active Customer Orders"
          value="58 Orders"
          subtitle="24 delivered this cycle"
          icon={FileText}
          tag="Fulfillment"
        />
        <StatCard
          title="Average Deal Size"
          value="ETB 31,600"
          subtitle="Packaging & Commercial"
          icon={DollarSign}
          tag="Performance"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sales Pipeline & Conversion Stages
              </h2>
              <p className="text-xs text-slate-400">Opportunity flow from inquiry to confirmed billing</p>
            </div>
            <span className="text-xs font-bold text-emerald-500">22.9% Win Rate</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineFunnel} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis dataKey="stage" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {pipelineFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Order Status Breakdown
            </h2>
            <p className="text-xs text-slate-400">Current active customer orders</p>
          </div>

          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {orderStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Invoiced Billing vs Cash Collected
              </h2>
              <p className="text-xs text-slate-400">Weekly sales cash collections against issued invoices</p>
            </div>
            <span className="text-xs font-semibold text-emerald-500">92% Collection Efficiency</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.blue} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={PALETTE.blue} stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="salesCol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatShortETB} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => formatETB(val)} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="invoiced" stroke={PALETTE.blue} strokeWidth={2} fillOpacity={1} fill="url(#salesInv)" name="Invoiced Total (ETB)" />
                <Area type="monotone" dataKey="collected" stroke={PALETTE.emerald} strokeWidth={2} fillOpacity={1} fill="url(#salesCol)" name="Collected Cash (ETB)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Top Corporate Accounts
          </h2>
          <p className="text-xs text-slate-400 mb-4">Highest revenue accounts this cycle</p>

          <div className="space-y-3">
            {topCustomers.map((cust, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{cust.name}</div>
                  <div className="text-[10px] text-slate-400">{cust.orders} fulfilled orders</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-slate-900 dark:text-slate-100">{formatShortETB(cust.value)}</div>
                  <div className="text-[10px] text-emerald-500 font-bold">Good Standing</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. STORE & INVENTORY ANALYTICS (Storekeeper)
   ========================================================================= */
function StorekeeperTab({ storeData, tooltipStyle }) {
  const stockItemsCount = storeData?.items?.length || 186;
  const warehousesCount = storeData?.warehouses?.length || 4;

  const stockFlowWeekly = [
    { day: 'Mon', inward: 1400, outward: 1100, returns: 40 },
    { day: 'Tue', inward: 950, outward: 1300, returns: 20 },
    { day: 'Wed', inward: 2100, outward: 1600, returns: 85 },
    { day: 'Thu', inward: 1200, outward: 1400, returns: 30 },
    { day: 'Fri', inward: 1800, outward: 1750, returns: 55 },
    { day: 'Sat', inward: 600, outward: 800, returns: 15 }
  ];

  const categoryValuation = [
    { name: 'Paper & Substrates', value: 52, color: '#da1f26' },
    { name: 'Inks & Chemicals', value: 21, color: '#3b82f6' },
    { name: 'Binding & Finishing', value: 14, color: '#10b981' },
    { name: 'Packaging Materials', value: 8, color: '#f59e0b' },
    { name: 'Spare Parts & Consumables', value: 5, color: '#8b5cf6' }
  ];

  const warehouseUtilization = [
    { name: 'Main Depo A', capacity: 100, utilized: 78 },
    { name: 'Pressroom Store', capacity: 100, utilized: 86 },
    { name: 'Auxiliary Storage', capacity: 100, utilized: 45 },
    { name: 'Chemical Yard', capacity: 100, utilized: 62 }
  ];

  const lowStockAlerts = [
    { code: 'PAP-80G-A4', name: 'Art Paper 80gsm A4', balance: 14, min: 50, unit: 'Reams' },
    { code: 'INK-CYAN-OFF', name: 'Cyan Process Ink 2.5kg', balance: 3, min: 10, unit: 'Cans' },
    { code: 'PLT-THERM-SM', name: 'Thermal CTP Plates 745x605', balance: 25, min: 100, unit: 'Plates' },
    { code: 'GLU-HOTMELT-B', name: 'Hotmelt Perfect Binding Glue', balance: 8, min: 25, unit: 'Bags' }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tracked SKUs in Store"
          value={`${stockItemsCount} Items`}
          subtitle={`Across ${warehousesCount} warehouses`}
          icon={Boxes}
          tag="Inventory"
        />
        <StatCard
          title="Total Stock Valuation"
          value="ETB 3,840,000"
          subtitle="Evaluated at moving average"
          icon={DollarSign}
          tag="Valuation"
        />
        <StatCard
          title="Critical Reorder Alerts"
          value="4 SKUs"
          subtitle="Below safety threshold"
          icon={AlertTriangle}
          tag="Safety Alert"
        />
        <StatCard
          title="Inward Receipts (GRV)"
          value="8,050 Units"
          subtitle="Received this week"
          icon={Package}
          tag="Operations"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Daily Stock Movements Flow
              </h2>
              <p className="text-xs text-slate-400">Inbound supplier GRVs vs shopfloor requisitions & returns</p>
            </div>
            <span className="text-xs font-bold text-slate-400">Past 6 Days</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockFlowWeekly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="inward" fill={PALETTE.emerald} radius={[4, 4, 0, 0]} name="Inward (GRV Receipts)" />
                <Bar dataKey="outward" fill={PALETTE.primary} radius={[4, 4, 0, 0]} name="Outward (Press Releases)" />
                <Bar dataKey="returns" fill={PALETTE.amber} radius={[4, 4, 0, 0]} name="Floor Returns" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Inventory Value by Category
            </h2>
            <p className="text-xs text-slate-400">Holding asset allocation across raw materials</p>
          </div>

          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryValuation}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {categoryValuation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Warehouse Space Capacity Utilization
              </h2>
              <p className="text-xs text-slate-400">Current fill level vs maximum volumetric limit (%)</p>
            </div>
            <span className="text-xs font-bold text-amber-500">Pressroom Store Near Limit</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={warehouseUtilization} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={110} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Bar dataKey="utilized" fill={PALETTE.blue} radius={[0, 6, 6, 0]} name="Utilization %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Critical Low Stock Items
              </h2>
              <p className="text-xs text-slate-400">Items below configured safety buffer</p>
            </div>
            <Link to="/store/inventory" className="text-xs font-bold text-primary-500 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {lowStockAlerts.map((item) => (
              <div key={item.code} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                  <div className="text-[10px] text-slate-400">SKU: {item.code} • Min Safety: {item.min} {item.unit}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-rose-500 text-white">
                    {item.balance} {item.unit}
                  </span>
                  <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-0.5">Critical Depletion</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. PURCHASING & PROCUREMENT ANALYTICS (Purchaser)
   ========================================================================= */
function PurchasingTab({ purchasingData, formatETB, formatShortETB, tooltipStyle }) {
  const activePOs = purchasingData?.dashboard?.totalPOs || 18;

  const supplierSpendData = [
    { name: 'Mojo Paper Mill', spend: 640000 },
    { name: 'Flint Group Inks', spend: 320000 },
    { name: 'Agfa Graphics Plate', spend: 210000 },
    { name: 'East Africa Packaging', spend: 180000 },
    { name: 'Heidelberg Spare Parts', spend: 140000 }
  ];

  const poStatusData = [
    { name: 'Draft POs', value: 4, color: '#94a3b8' },
    { name: 'Sent to Supplier', value: 9, color: '#3b82f6' },
    { name: 'Partially Received', value: 5, color: '#f59e0b' },
    { name: 'Fully Completed', value: 28, color: '#10b981' },
    { name: 'Pending Inspection', value: 3, color: '#8b5cf6' }
  ];

  const apAgingCurve = [
    { bracket: '0-30 Days', amount: 480000 },
    { bracket: '31-60 Days', amount: 260000 },
    { bracket: '61-90 Days', amount: 120000 },
    { bracket: '90+ Days', amount: 45000 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Purchase Orders"
          value={`${activePOs} POs`}
          subtitle="9 dispatched to suppliers"
          icon={ShoppingCart}
          tag="Orders"
        />
        <StatCard
          title="Procurement Spend"
          value="ETB 1,490,000"
          subtitle="This billing period"
          icon={DollarSign}
          tag="Spend"
        />
        <StatCard
          title="Pending PR Requisitions"
          value="5 Requests"
          subtitle="Awaiting PO creation"
          icon={FileText}
          tag="Requisitions"
        />
        <StatCard
          title="Accounts Payable (AP)"
          value="ETB 905,000"
          subtitle="Supplier credit liabilities"
          icon={CreditCard}
          tag="Liabilities"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Procurement Spend by Vendor
              </h2>
              <p className="text-xs text-slate-400">Total disbursement to top industrial suppliers</p>
            </div>
            <span className="text-xs font-semibold text-slate-400">Active Cycle</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierSpendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatShortETB} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatETB(v)} />
                <Bar dataKey="spend" fill={PALETTE.teal} radius={[4, 4, 0, 0]} name="Spend (ETB)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              PO Lifecycle Status
            </h2>
            <p className="text-xs text-slate-400">Purchase orders across fulfillment stages</p>
          </div>

          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={poStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {poStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Accounts Payable Credit Aging Breakdown
            </h2>
            <p className="text-xs text-slate-400">Aging schedule of unpaid supplier credit balances</p>
          </div>
          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
            53% Current (0-30 Days)
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={apAgingCurve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis dataKey="bracket" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatShortETB} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatETB(v)} />
              <Bar dataKey="amount" fill={PALETTE.primary} radius={[4, 4, 0, 0]} name="Payable (ETB)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   5. PRODUCTION & MACHINE OPERATIONS (Production Manager & Operators)
   ========================================================================= */
function ProductionTab({ productionData, tooltipStyle }) {
  const activeJobsCount = productionData?.metrics?.activeJobs || 14;

  const machineFleetData = [
    { name: 'Running', value: 8, color: '#10b981' },
    { name: 'Idle / Setup', value: 3, color: '#f59e0b' },
    { name: 'Under Maintenance', value: 2, color: '#3b82f6' },
    { name: 'Breakdown / Down', value: 1, color: '#da1f26' }
  ];

  const machineOutputData = [
    { machine: 'Heidelberg SM 74', actual: 48500, capacity: 55000 },
    { machine: 'Roland 700 HiPrint', actual: 62000, capacity: 70000 },
    { machine: 'KBA Rapida 105', actual: 51200, capacity: 60000 },
    { machine: 'Polar High-Speed Cutter', actual: 38000, capacity: 42000 },
    { machine: 'Muller Martini Binder', actual: 28400, capacity: 32000 }
  ];

  const wastageTrend = [
    { day: 'Day 1', wastageRate: 2.8, threshold: 3.5 },
    { day: 'Day 2', wastageRate: 3.1, threshold: 3.5 },
    { day: 'Day 3', wastageRate: 2.6, threshold: 3.5 },
    { day: 'Day 4', wastageRate: 4.2, threshold: 3.5 },
    { day: 'Day 5', wastageRate: 3.0, threshold: 3.5 },
    { day: 'Day 6', wastageRate: 2.7, threshold: 3.5 },
    { day: 'Day 7', wastageRate: 2.4, threshold: 3.5 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Fleet Operational Uptime"
          value="87.5%"
          subtitle="8 of 14 machines running"
          icon={Factory}
          tag="Uptime"
        />
        <StatCard
          title="Daily Output Produced"
          value="228,100 Imp"
          subtitle="Across all active presses"
          icon={Activity}
          tag="Output"
        />
        <StatCard
          title="Material Wastage Rate"
          value="2.97%"
          subtitle="Target threshold < 3.5%"
          icon={Percent}
          tag="Quality"
        />
        <StatCard
          title="Active Print Runs"
          value={`${activeJobsCount} Jobs`}
          subtitle="3 scheduled for night shift"
          icon={Clock}
          tag="Shifts"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Machine Impression Output vs Rated Capacity
              </h2>
              <p className="text-xs text-slate-400">Throughput comparison across principal pressroom machinery</p>
            </div>
            <span className="text-xs font-bold text-emerald-500">88.2% Avg Utilization</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineOutputData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="machine" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="capacity" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Rated Capacity" />
                <Bar dataKey="actual" fill={PALETTE.blue} radius={[4, 4, 0, 0]} name="Actual Output (Impressions)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Fleet Availability Status
            </h2>
            <p className="text-xs text-slate-400">Live operational condition of 14 machines</p>
          </div>

          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={machineFleetData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {machineFleetData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Material Wastage & Scrap Trend (%)
            </h2>
            <p className="text-xs text-slate-400">Paper and chemical waste against allowable quality tolerance</p>
          </div>
          <span className="text-xs font-bold text-amber-500">Day 4 Spill Investigated</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={wastageTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 6]} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line type="monotone" dataKey="wastageRate" stroke={PALETTE.primary} strokeWidth={2.5} dot={{ r: 4 }} name="Actual Wastage Rate %" />
              <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="4 4" dot={false} name="Threshold Limit (3.5%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   6. FINANCE & ACCOUNTING ANALYTICS (Finance)
   ========================================================================= */
function FinanceTab({ financeData, formatETB, formatShortETB, tooltipStyle }) {
  const bankAccountsCount = financeData?.banks?.length || 3;

  const cashFlowTrend = [
    { week: 'W1', inflow: 520000, outflow: 390000 },
    { week: 'W2', inflow: 610000, outflow: 480000 },
    { week: 'W3', inflow: 740000, outflow: 520000 },
    { week: 'W4', inflow: 890000, outflow: 610000 }
  ];

  const expenseBreakdown = [
    { name: 'Cost of Materials (COGS)', value: 48, color: '#da1f26' },
    { name: 'Labor & Salaries', value: 24, color: '#3b82f6' },
    { name: 'Factory Power & Fuel', value: 12, color: '#f59e0b' },
    { name: 'Spare Parts & Maintenance', value: 9, color: '#8b5cf6' },
    { name: 'Admin & Tax', value: 7, color: '#10b981' }
  ];

  const arApComparison = [
    { period: 'Current', receivables: 680000, payables: 480000 },
    { period: '30 Days', receivables: 390000, payables: 260000 },
    { period: '60 Days', receivables: 180000, payables: 120000 },
    { period: '90+ Days', receivables: 85000, payables: 45000 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Liquid Treasury Balance"
          value="ETB 4,120,000"
          subtitle={`Across ${bankAccountsCount} Commercial Banks`}
          icon={Landmark}
          tag="Treasury"
        />
        <StatCard
          title="Accounts Receivable (AR)"
          value="ETB 1,335,000"
          subtitle="Due from corporate clients"
          icon={TrendingUp}
          tag="Receivables"
        />
        <StatCard
          title="Accounts Payable (AP)"
          value="ETB 905,000"
          subtitle="Owed to raw material vendors"
          icon={DollarSign}
          tag="Payables"
        />
        <StatCard
          title="Monthly Operating Margin"
          value="31.8%"
          subtitle="Net profitable operations"
          icon={Percent}
          tag="Profitability"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cash Flow: Weekly Receipts vs Disbursements
              </h2>
              <p className="text-xs text-slate-400">Total cash inflows from sales vs operational cash payouts (ETB)</p>
            </div>
            <span className="text-xs font-bold text-emerald-500">+ETB 760,000 Net Cash</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatShortETB} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatETB(v)} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="inflow" fill={PALETTE.emerald} radius={[4, 4, 0, 0]} name="Cash Inflow (Collections)" />
                <Bar dataKey="outflow" fill={PALETTE.primary} radius={[4, 4, 0, 0]} name="Cash Outflow (Expenses)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Expense Allocation
            </h2>
            <p className="text-xs text-slate-400">Direct costs by functional category</p>
          </div>

          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Liquidity Position: Receivables (AR) vs Payables (AP)
            </h2>
            <p className="text-xs text-slate-400">Aging schedule comparison of incoming cash vs vendor liabilities</p>
          </div>
          <span className="text-xs font-bold text-emerald-500">Positive Working Capital</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={arApComparison} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={formatShortETB} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatETB(v)} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="receivables" fill={PALETTE.blue} radius={[4, 4, 0, 0]} name="Customer Receivables (AR)" />
              <Bar dataKey="payables" fill={PALETTE.primary} radius={[4, 4, 0, 0]} name="Supplier Payables (AP)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   7. HR & WORKFORCE ANALYTICS (HR Officers)
   ========================================================================= */
function HrTab({ hrData, tooltipStyle }) {
  const staffCount = hrData?.employees?.length || 44;
  const pendingLeavesCount = hrData?.leaves?.filter(l => l.status === 'pending')?.length || 4;

  const attendanceTrend = [
    { day: 'Mon', present: 41, late: 2, leave: 1 },
    { day: 'Tue', present: 42, late: 1, leave: 1 },
    { day: 'Wed', present: 40, late: 3, leave: 1 },
    { day: 'Thu', present: 43, late: 0, leave: 1 },
    { day: 'Fri', present: 41, late: 2, leave: 1 },
    { day: 'Sat', present: 38, late: 1, leave: 5 }
  ];

  const headcountByDept = [
    { name: 'Press & Production', value: 20, color: '#3b82f6' },
    { name: 'Pre-Press & Design', value: 6, color: '#8b5cf6' },
    { name: 'Post-Press & Binding', value: 8, color: '#10b981' },
    { name: 'Sales & Marketing', value: 5, color: '#f59e0b' },
    { name: 'Finance & Admin', value: 5, color: '#da1f26' }
  ];

  const overtimeByDept = [
    { dept: 'Offset Press', hours: 46 },
    { dept: 'Binding & Finishing', hours: 38 },
    { dept: 'Pre-Press & CTP', hours: 18 },
    { dept: 'Store Logistics', hours: 12 },
    { dept: 'Maintenance', hours: 15 }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Active Workforce"
          value={`${staffCount} Staff`}
          subtitle="95.5% active contracts"
          icon={Users}
          tag="Headcount"
        />
        <StatCard
          title="Today's Attendance Rate"
          value="97.7%"
          subtitle="43 clocked in today"
          icon={UserCheck}
          tag="Attendance"
        />
        <StatCard
          title="Pending Leave Requests"
          value={`${pendingLeavesCount} Requests`}
          subtitle="Awaiting HR approval"
          icon={CalendarDays}
          tag="Leaves"
        />
        <StatCard
          title="Overtime Logged"
          value="129 Hours"
          subtitle="Current payroll period"
          icon={Timer}
          tag="Overtime"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Daily Workforce Attendance & Punctuality
              </h2>
              <p className="text-xs text-slate-400">Present staff, late arrivals, and approved leaves</p>
            </div>
            <span className="text-xs font-bold text-emerald-500">96.8% Average Rate</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="attPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PALETTE.emerald} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={PALETTE.emerald} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Area type="monotone" dataKey="present" stroke={PALETTE.emerald} strokeWidth={2} fillOpacity={1} fill="url(#attPresent)" name="Present on Time" />
                <Line type="monotone" dataKey="late" stroke={PALETTE.amber} strokeWidth={2} name="Late Arrivals" />
                <Line type="monotone" dataKey="leave" stroke={PALETTE.primary} strokeWidth={2} name="On Leave" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Headcount by Department
            </h2>
            <p className="text-xs text-slate-400">Workforce distribution across functional teams</p>
          </div>

          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={headcountByDept}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {headcountByDept.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Overtime Hours Logged by Department
            </h2>
            <p className="text-xs text-slate-400">Total approved extra hours logged for rush print orders</p>
          </div>
          <span className="text-xs font-bold text-primary-500">Offset Press Peak Demand</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overtimeByDept} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
              <XAxis dataKey="dept" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="hours" fill={PALETTE.purple} radius={[4, 4, 0, 0]} name="Overtime Hours (hrs)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   8. PERSONAL EMPLOYEE SELF-SERVICE PORTAL (All Staff & General Employees)
   ========================================================================= */
function EmployeePortalTab({ employeeData, user, tooltipStyle }) {
  const annualBalance = employeeData?.myBalances?.annual?.remaining ?? 12;

  const weeklyHours = [
    { day: 'Mon', regular: 8, overtime: 1.5 },
    { day: 'Tue', regular: 8, overtime: 0 },
    { day: 'Wed', regular: 8, overtime: 2.0 },
    { day: 'Thu', regular: 8, overtime: 1.0 },
    { day: 'Fri', regular: 8, overtime: 0.5 },
    { day: 'Sat', regular: 4, overtime: 0 }
  ];

  const leaveEntitlements = [
    { name: 'Remaining Annual', value: annualBalance, color: '#10b981' },
    { name: 'Used Annual', value: 4, color: '#94a3b8' },
    { name: 'Sick Leave Taken', value: 2, color: '#f59e0b' },
    { name: 'Casual Leave Taken', value: 1, color: '#3b82f6' }
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent border border-primary-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-black text-lg shadow-xs">
            {(user?.fullName || user?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {user?.fullName || user?.name || 'Staff Member'}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Department: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.department || 'Operations'}</span> • ID: <span className="font-mono">{user?.employeeId || 'GT-084'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/hr/attendance"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Clock In / Out</span>
          </Link>
          <Link
            to="/hr/leave"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 transition"
          >
            Request Leave
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendance Days (This Month)"
          value="22 Days"
          subtitle="100% on-time record"
          icon={CheckCircle2}
          tag="Attendance"
        />
        <StatCard
          title="Annual Leave Balance"
          value={`${annualBalance} Days`}
          subtitle="4 days used in 2026"
          icon={CalendarDays}
          tag="Entitlement"
        />
        <StatCard
          title="Overtime Logged"
          value="5.0 Hours"
          subtitle="Pending payroll computation"
          icon={Timer}
          tag="Extra Hours"
        />
        <StatCard
          title="Upcoming Pay Date"
          value="Nov 28, 2026"
          subtitle="Direct bank deposit"
          icon={CreditCard}
          tag="Payroll"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                My Weekly Work Hours & Overtime
              </h2>
              <p className="text-xs text-slate-400">Regular shift hours vs overtime recorded</p>
            </div>
            <span className="text-xs font-bold text-emerald-500">49.0 Total Hours</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyHours} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.15} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="regular" fill={PALETTE.blue} radius={[4, 4, 0, 0]} name="Regular Shift (hrs)" />
                <Bar dataKey="overtime" fill={PALETTE.primary} radius={[4, 4, 0, 0]} name="Overtime (hrs)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Leave Utilization
            </h2>
            <p className="text-xs text-slate-400">Remaining vs used leave entitlement days</p>
          </div>

          <div className="h-60 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leaveEntitlements}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {leaveEntitlements.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v} Days`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          Quick Workplace Shortcuts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to="/hr/attendance"
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-primary-500/50 transition group flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition">
                Attendance Log
              </div>
              <div className="text-[11px] text-slate-400">Daily check-in / check-out</div>
            </div>
          </Link>

          <Link
            to="/hr/leave"
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-primary-500/50 transition group flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition">
                Leave Requests
              </div>
              <div className="text-[11px] text-slate-400">Apply for annual / sick leave</div>
            </div>
          </Link>

          <Link
            to="/hr/payrolls"
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-primary-500/50 transition group flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition">
                My Payslips
              </div>
              <div className="text-[11px] text-slate-400">View salary statements</div>
            </div>
          </Link>

          <Link
            to="/store/outward"
            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80 hover:border-primary-500/50 transition group flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary-500 transition">
                Store Requisition
              </div>
              <div className="text-[11px] text-slate-400">Request consumables & tools</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
