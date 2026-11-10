import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import {
  TrendingUp,
  Users,
  Target,
  CalendarClock,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Phone,
  Mail,
  Building2,
  CheckCircle2,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function CrmDashboard() {
  const { t } = useTranslation();

  const [leadStats, setLeadStats] = useState(null);
  const [customerMetrics, setCustomerMetrics] = useState(null);
  const [followupMetrics, setFollowupMetrics] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [todayFollowups, setTodayFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const [leadStatsRes, customerMetricsRes, followupMetricsRes, recentLeadsRes, todayFollowupsRes] =
        await Promise.all([
          crmService.getLeadStatistics(),
          crmService.getCustomerMetrics(),
          crmService.getFollowupMetrics(),
          crmService.getLeads({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
          crmService.getFollowups({ scope: 'today', limit: 5 })
        ]);

      setLeadStats(leadStatsRes.data || leadStatsRes);
      setCustomerMetrics(customerMetricsRes.data || customerMetricsRes);
      setFollowupMetrics(followupMetricsRes.data || followupMetricsRes);
      setRecentLeads(recentLeadsRes.data?.leads || recentLeadsRes.leads || []);
      setTodayFollowups(todayFollowupsRes.data?.followups || todayFollowupsRes.followups || []);
    } catch (err) {
      setError(err?.message || 'Failed to load CRM dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getLeadStatusVariant = (status) => {
    switch (status) {
      case 'new': return 'info';
      case 'contacted': return 'primary';
      case 'qualified': return 'warning';
      case 'proposal_sent': return 'indigo';
      case 'converted': return 'success';
      case 'lost': return 'danger';
      default: return 'neutral';
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading CRM dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-primary-500" />
            CRM & Sales Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track customer acquisition pipeline, scheduled follow-ups, and sales opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/crm/leads"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
          <Link
            to="/crm/followups"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            <CalendarClock className="w-4 h-4" />
            Schedule Follow-up
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Customers"
          value={customerMetrics?.totalCustomers || 0}
          subtitle={`${customerMetrics?.activeCustomers || 0} Active clients`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Leads"
          value={leadStats?.activePipelineCount || 0}
          subtitle={`Conversion rate: ${leadStats?.conversionRate || 0}%`}
          icon={Target}
          color="emerald"
        />
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(leadStats?.activePipelineValue || 0)}
          subtitle="Estimated value of active leads"
          icon={DollarSign}
          color="purple"
        />
        <StatCard
          title="Pending Follow-ups"
          value={followupMetrics?.pending || 0}
          subtitle={`${followupMetrics?.overdue || 0} overdue actions`}
          icon={CalendarClock}
          color={followupMetrics?.overdue > 0 ? 'amber' : 'indigo'}
        />
      </div>

      {/* Lead Pipeline Stages Visual Bar */}
      {leadStats?.statusBreakdown && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-primary-500" />
              Lead Conversion Pipeline
            </h2>
            <Link to="/crm/leads" className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View All Leads <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { key: 'new', label: 'New Inquiries', count: leadStats.statusBreakdown.new, color: 'bg-blue-500' },
              { key: 'contacted', label: 'Contacted', count: leadStats.statusBreakdown.contacted, color: 'bg-cyan-500' },
              { key: 'qualified', label: 'Qualified', count: leadStats.statusBreakdown.qualified, color: 'bg-amber-500' },
              { key: 'proposal_sent', label: 'Proposal Sent', count: leadStats.statusBreakdown.proposalSent, color: 'bg-indigo-500' },
              { key: 'converted', label: 'Converted', count: leadStats.statusBreakdown.converted, color: 'bg-emerald-500' },
              { key: 'lost', label: 'Lost / Closed', count: leadStats.statusBreakdown.lost, color: 'bg-rose-500' },
            ].map((stage) => (
              <div key={stage.key} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{stage.label}</span>
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1.5">{stage.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Section: Recent Leads & Today's Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              Recent Inquiries & Leads
            </h2>
            <Link to="/crm/leads" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              Manage
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No leads registered yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLeads.map((lead) => (
                <div key={lead._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {lead.name}
                      </span>
                      {lead.companyName && (
                        <span className="text-xs text-slate-400 truncate">({lead.companyName})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {lead.phone}
                      </span>
                      <span>Est: {formatCurrency(lead.estimatedValue)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <Badge variant={getLeadStatusVariant(lead.status)}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Follow-up Agenda */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-indigo-500" />
              Today's Scheduled Follow-ups
            </h2>
            <Link to="/crm/followups" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
              View Calendar
            </Link>
          </div>

          {todayFollowups.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              No follow-ups due today. You are all caught up!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {todayFollowups.map((item) => (
                <div key={item._id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {item.agenda}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-medium">
                        <Clock className="w-3 h-3" />
                        {new Date(item.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>Target: {item.lead?.name || item.customer?.name || 'Contact'}</span>
                    </div>
                  </div>
                  <Badge variant={item.status === 'completed' ? 'success' : 'warning'}>
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

