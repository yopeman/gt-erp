import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import api from '../../services/api';
import {
  Users,
  Clock,
  CalendarDays,
  CreditCard,
  FileCheck2,
  Briefcase,
  ArrowRight,
  TrendingUp,
  UserPlus,
  RefreshCw
} from 'lucide-react';

export default function HrDashboard() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const canManageEmployees = hasRole(['admin', 'hr']);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    attendancesToday: 0,
    pendingLeaves: 0,
    pendingClearances: 0,
    openJobs: 0
  });

  const [recentLeaves, setRecentLeaves] = useState([]);
  const [recentAttendances, setRecentAttendances] = useState([]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [empRes, attRes, leaveRes, jobRes, clearRes] = await Promise.allSettled([
        api.get('/employees?limit=100'),
        api.get('/attendances?limit=10'),
        api.get('/leave-requests?limit=10'),
        api.get('/job-positions?status=open'),
        api.get('/clearances?limit=10')
      ]);

      const employees = empRes.status === 'fulfilled' && empRes.value?.data ? empRes.value.data : [];
      const attendances = attRes.status === 'fulfilled' && attRes.value?.data ? attRes.value.data : [];
      const leaves = leaveRes.status === 'fulfilled' && leaveRes.value?.data ? leaveRes.value.data : [];
      const jobs = jobRes.status === 'fulfilled' && jobRes.value?.data ? jobRes.value.data : [];
      const clearances = clearRes.status === 'fulfilled' && clearRes.value?.data ? clearRes.value.data : [];

      setStats({
        totalEmployees: employees.length,
        activeEmployees: employees.filter((e) => e.status === 'active').length,
        attendancesToday: attendances.length,
        pendingLeaves: leaves.filter((l) => l.decision === 'pending').length,
        pendingClearances: clearances.filter((c) => c.status === 'pending').length,
        openJobs: jobs.length
      });

      setRecentLeaves(leaves.slice(0, 5));
      setRecentAttendances(attendances.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-rose-600 p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider mb-2">
              HR Module • Section 2.1 Functional Overview
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t('nav.hrDashboard')}
            </h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-xl">
              {t('app.company')} workforce operations, daily attendance, active leave approvals, and employee records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center gap-2 backdrop-blur-xs transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{t('actions.refresh')}</span>
            </button>
            {canManageEmployees && (
              <Link
                to="/hr/employees"
                className="px-4 py-2 rounded-xl bg-white text-primary-600 hover:bg-slate-100 font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('actions.createEmployee')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('nav.employees')}
          value={loading ? '...' : stats.totalEmployees}
          subtitle={`${stats.activeEmployees} ${t('active workforce')}`}
          icon={Users}
          tag="Staff"
          onClick={() => navigate('/hr/employees')}
        />
        <StatCard
          title={t('nav.attendance')}
          value={loading ? '...' : stats.attendancesToday}
          subtitle={t("today's attendance log")}
          icon={Clock}
          tag="Daily"
          onClick={() => navigate('/hr/attendance')}
        />
        <StatCard
          title={t('nav.leave')}
          value={loading ? '...' : stats.pendingLeaves}
          subtitle={t('pending decision')}
          icon={CalendarDays}
          tag="Approvals"
          onClick={() => navigate('/hr/leave')}
        />
        <StatCard
          title={t('nav.clearances')}
          value={loading ? '...' : stats.pendingClearances}
          subtitle={t('ongoing exit signoffs')}
          icon={FileCheck2}
          tag="Clearance"
          onClick={() => navigate('/hr/clearances')}
        />
      </div>

      {/* Two Columns: Recent Leaves & Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending / Recent Leaves */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary-500" />
              <span>{t('nav.leave')} ({recentLeaves.length})</span>
            </h3>
            <Link 
              to="/hr/leave" 
              className="text-xs text-primary-500 font-semibold hover:underline flex items-center gap-1"
            >
              <span>{t('actions.viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/60">
            {recentLeaves.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {t('no leave requests filed yet in the system.')}
              </div>
            ) : (
              recentLeaves.map((item) => (
                <div key={item._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.employee?.fullName || t('Employee')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {t(item.type)} • {new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge status={item.decision} text={t(item.decision)} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/80">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>{t('nav.attendance')} ({recentAttendances.length})</span>
            </h3>
            <Link 
              to="/hr/attendance" 
              className="text-xs text-primary-500 font-semibold hover:underline flex items-center gap-1"
            >
              <span>{t('actions.viewDetails')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/60">
            {recentAttendances.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {t('no attendance punches recorded today.')}
              </div>
            ) : (
              recentAttendances.map((att) => (
                <div key={att._id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {att.employee?.fullName || t('Employee')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      In: {att.startTime || '--:--'} • Out: {att.endTime || '--:--'}
                    </div>
                  </div>
                  <Badge status={att.type || 'onTime'} text={t(att.type || 'On Time')} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
