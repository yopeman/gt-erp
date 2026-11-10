import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import productionService from '../../services/productionService';
import {
  Factory,
  Workflow,
  Wrench,
  ClipboardCheck,
  Trash2,
  Gauge,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Power,
  Layers,
  DollarSign
} from 'lucide-react';

export default function ProductionDashboard() {
  const { t } = useTranslation();

  const [metrics, setMetrics] = useState(null);
  const [machines, setMachines] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [breakdownTickets, setBreakdownTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const [metricRes, mchRes, jobsRes, mntRes] = await Promise.all([
          productionService.getProductionDashboardMetrics(),
          productionService.getMachines({ limit: 12 }),
          productionService.getProductionJobs({ status: 'in_production', limit: 5 }),
          productionService.getMaintenances({ status: 'reported', limit: 5 })
        ]);

        setMetrics(metricRes.data.data);
        setMachines(mchRes.data.data.machines || []);
        setActiveJobs(jobsRes.data.data.jobs || []);
        setBreakdownTickets(mntRes.data.data.maintenances || []);
      } catch (err) {
        console.error('Failed to load production dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Factory className="w-7 h-7 text-indigo-600" />
            Production Operations Executive Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Plant throughput, real-time machine fleet utilization, scrap rates, and active print runs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/production/jobs"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Workflow className="w-4 h-4" />
            Dispatch Work Order
          </Link>
          <Link
            to="/production/maintenance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Wrench className="w-4 h-4" />
            Log Breakdown
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">In Production</p>
              <p className="text-xl font-bold text-blue-600">{metrics.inProductionJobs || 0}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{metrics.totalJobs || 0} total jobs</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Fleet Utilization</p>
              <p className="text-xl font-bold text-emerald-600">{metrics.utilizationRate || 0}%</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {metrics.machinesRunning || 0} of {metrics.totalMachines || 0} running
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Good Output</p>
              <p className="text-xl font-bold text-indigo-600">
                {Number(metrics.volume?.totalProduced || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">passed units</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Defect Scrap Rate</p>
              <p className="text-xl font-bold text-rose-600">{metrics.scrapRate || 0}%</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {Number(metrics.volume?.totalDefective || 0).toLocaleString()} spoiled
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Breakdown Alerts</p>
              <p className="text-xl font-bold text-amber-600">{metrics.activeBreakdowns || 0}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">machines locked</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Machine Fleet Status & Floor Jobs Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plant Equipment Fleet */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Factory className="w-4 h-4 text-indigo-600" />
              Machine Fleet Live Status
            </h2>
            <Link
              to="/production/machines"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View All Equipment <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {machines.map((m) => {
              const isRunning = m.status === 'running';
              const isAvail = m.status === 'available';
              const isMnt = m.status === 'maintenance';
              const isBrk = m.status === 'breakdown';

              return (
                <div
                  key={m._id}
                  className={`p-3 rounded-lg border text-xs flex flex-col justify-between ${
                    isRunning
                      ? 'bg-blue-50/50 border-blue-200'
                      : isMnt
                      ? 'bg-amber-50/50 border-amber-200'
                      : isBrk
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-indigo-600">{m.machineCode}</span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          isRunning
                            ? 'bg-blue-100 text-blue-700 animate-pulse'
                            : isMnt
                            ? 'bg-amber-100 text-amber-700'
                            : isBrk
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 line-clamp-1">{m.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Rate: ETB {Number(m.hourlyCostRate || 0).toFixed(0)}/hr
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-400">
                    Total Hours: {m.totalOperatingHours || 0} hrs
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Active Jobs & Breakdown Alerts */}
        <div className="space-y-6">
          {/* Active Print Runs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-indigo-600" />
                Active Floor Jobs
              </h3>
              <Link to="/production/jobs" className="text-xs text-indigo-600 hover:underline">
                View All
              </Link>
            </div>

            {activeJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No jobs currently on the floor.</p>
            ) : (
              <div className="space-y-2">
                {activeJobs.map((j) => (
                  <div key={j._id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-indigo-600">{j.jobOrderNumber}</span>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {j.targetQuantity?.toLocaleString()} units
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 line-clamp-1">{j.order?.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{j.customer?.companyName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Breakdown / Maintenance Alert Queue */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Reported Breakdowns ({breakdownTickets.length})
              </h3>
              <Link to="/production/maintenance" className="text-xs text-rose-600 hover:underline">
                Manage
              </Link>
            </div>

            {breakdownTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Zero reported breakdowns. All systems go!</p>
            ) : (
              <div className="space-y-2">
                {breakdownTickets.map((t) => (
                  <div key={t._id} className="p-2.5 bg-rose-50/40 rounded-lg border border-rose-100 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-rose-600">{t.maintenanceNumber}</span>
                      <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded">
                        {t.priority}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800">{t.machine?.name}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{t.issueDescription}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

