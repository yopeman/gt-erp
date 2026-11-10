import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import productionService from '../../services/productionService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Workflow,
  Plus,
  Search,
  Filter,
  Play,
  CheckCircle2,
  Clock,
  Check,
  AlertTriangle,
  Factory,
  User,
  Package,
  DollarSign,
  Calendar,
  Eye,
  Trash2,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';

const PRIORITY_BADGES = {
  urgent: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
  high: 'bg-orange-100 text-orange-800 border-orange-200 font-semibold',
  normal: 'bg-slate-100 text-slate-700 border-slate-200'
};

const STATUS_BADGES = {
  scheduled: 'bg-slate-100 text-slate-700 border-slate-200',
  prepress: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_production: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
  finishing: 'bg-purple-50 text-purple-700 border-purple-200',
  qc_check: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200'
};

export default function ProductionJobs() {
  const { t } = useTranslation();

  const [jobs, setJobs] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [isStageActionModalOpen, setIsStageActionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [stageActionType, setStageActionType] = useState('start'); // 'start' | 'complete' | 'qc'

  // New Job Form State
  const [jobForm, setJobForm] = useState({
    order: '',
    customer: '',
    service: '',
    priority: 'normal',
    targetQuantity: 1000,
    scheduledStartDate: new Date().toISOString().split('T')[0],
    scheduledCompletionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    remarks: ''
  });

  // Stage Action Form State
  const [stageForm, setStageForm] = useState({
    machine: '',
    operators: [],
    hoursRun: 1,
    completedQuantity: 0,
    passed: true,
    producedQuantity: 0,
    defectiveQuantity: 0,
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [jobsRes, ordersRes, machinesRes, employeesRes] = await Promise.all([
        productionService.getProductionJobs({
          search,
          status: statusFilter,
          priority: priorityFilter
        }),
        productionService.getOrders({ limit: 100 }),
        productionService.getMachines({ limit: 100 }),
        productionService.getEmployees({ limit: 200, status: 'active' })
      ]);

      setJobs(jobsRes.data.data.jobs || []);
      setOrders(ordersRes.data.data.orders || ordersRes.data.data || []);
      setMachines(machinesRes.data.data.machines || []);
      setEmployees(employeesRes.data.data?.employees || employeesRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch production jobs:', err);
      setError('Failed to load production floor jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, priorityFilter]);

  const handleOrderSelect = (orderId) => {
    const selectedOrder = orders.find((o) => o._id === orderId);
    if (selectedOrder) {
      setJobForm({
        ...jobForm,
        order: selectedOrder._id,
        customer: selectedOrder.customer?._id || selectedOrder.customer || '',
        service: selectedOrder.items?.[0]?.service?._id || selectedOrder.items?.[0]?.service || '',
        priority: selectedOrder.priority || 'normal',
        targetQuantity: selectedOrder.items?.[0]?.quantity || 1000
      });
    } else {
      setJobForm({ ...jobForm, order: orderId });
    }
  };

  const handleCreateJobSubmit = async (e) => {
    e.preventDefault();
    if (!jobForm.order) {
      alert('Please select a sales order');
      return;
    }
    try {
      setSubmitting(true);
      await productionService.createProductionJob(jobForm);
      setIsNewJobModalOpen(false);
      resetJobForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create job order');
    } finally {
      setSubmitting(false);
    }
  };

  const resetJobForm = () => {
    setJobForm({
      order: '',
      customer: '',
      service: '',
      priority: 'normal',
      targetQuantity: 1000,
      scheduledStartDate: new Date().toISOString().split('T')[0],
      scheduledCompletionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      remarks: ''
    });
  };

  const openStageAction = (job, stage, actionType) => {
    setSelectedJob(job);
    setActiveStage(stage);
    setStageActionType(actionType);
    setStageForm({
      machine: stage.machine?._id || stage.machine || '',
      operators: stage.operators?.map((o) => o._id || o) || [],
      hoursRun: stage.hoursRun || 1,
      completedQuantity: stage.completedQuantity || job.targetQuantity,
      passed: true,
      producedQuantity: job.producedQuantity || job.targetQuantity,
      defectiveQuantity: job.defectiveQuantity || 0,
      notes: stage.notes || ''
    });
    setIsStageActionModalOpen(true);
  };

  const handleStageActionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedJob || !activeStage) return;

    try {
      setSubmitting(true);
      if (stageActionType === 'start') {
        await productionService.startStage(selectedJob._id, activeStage._id, {
          machine: stageForm.machine || undefined,
          operators: stageForm.operators
        });
      } else if (stageActionType === 'complete') {
        await productionService.completeStage(selectedJob._id, activeStage._id, {
          hoursRun: stageForm.hoursRun,
          completedQuantity: stageForm.completedQuantity,
          notes: stageForm.notes
        });
      } else if (stageActionType === 'qc') {
        await productionService.signoffQC(selectedJob._id, activeStage._id, {
          passed: stageForm.passed,
          producedQuantity: stageForm.producedQuantity,
          defectiveQuantity: stageForm.defectiveQuantity,
          notes: stageForm.notes
        });
      }

      setIsStageActionModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update stage');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Workflow className="w-7 h-7 text-indigo-600" />
            Production Floor & Job Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Plant floor routing, sequential stage execution, machine runtime, and final QC sign-off.
          </p>
        </div>
        <button
          onClick={() => {
            resetJobForm();
            setIsNewJobModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Job Order
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Job Order # (e.g. JO-2026-0001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
          >
            <option value="all">All Production Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_production">In Production</option>
            <option value="qc_check">QC Inspection</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Jobs Floor Cards */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500 mt-2">Loading production floor jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No active job orders"
          description="Create a Job Order from an approved customer sales order to schedule press stages."
          actionText="Dispatch Job Order"
          onAction={() => {
            resetJobForm();
            setIsNewJobModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => {
            const completedStages = job.stages?.filter((s) => s.status === 'completed').length || 0;
            const totalStages = job.stages?.length || 1;
            const progressPercent = Math.round((completedStages / totalStages) * 100);

            return (
              <div
                key={job._id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition space-y-4"
              >
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                        {job.jobOrderNumber}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                          PRIORITY_BADGES[job.priority] || PRIORITY_BADGES.normal
                        }`}
                      >
                        {job.priority}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${
                          STATUS_BADGES[job.status] || STATUS_BADGES.scheduled
                        }`}
                      >
                        {job.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                      <span>Order: <strong className="text-slate-700">{job.order?.orderNumber || 'N/A'}</strong></span>
                      <span>Customer: <strong className="text-slate-700">{job.customer?.companyName || 'Walk-in'}</strong></span>
                      <span>Target: <strong className="text-slate-700">{job.targetQuantity?.toLocaleString()} units</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Overall Floor Progress</span>
                      <span className="text-sm font-bold text-slate-800">{progressPercent}%</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setIsDetailModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Costing & Details
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      progressPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Sequential Production Stages Flow */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {job.stages?.map((stage, sIdx) => {
                    const isPending = stage.status === 'pending';
                    const isInProgress = stage.status === 'in_progress';
                    const isCompleted = stage.status === 'completed';

                    return (
                      <div
                        key={stage._id || sIdx}
                        className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition ${
                          isInProgress
                            ? 'bg-blue-50/60 border-blue-300 ring-2 ring-blue-500/20'
                            : isCompleted
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : 'bg-slate-50/70 border-slate-200 opacity-80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-500">Stage {stage.sequence}</span>
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                <Check className="w-3 h-3" /> Done
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded animate-pulse">
                                Running
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Pending</span>
                            )}
                          </div>
                          <h4 className="font-semibold text-slate-900 text-sm">{stage.stageName}</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Machine: {stage.machine?.name || 'Manual Bench'}
                          </p>
                          {stage.hoursRun > 0 && (
                            <p className="text-[11px] text-slate-500">
                              Hours: {stage.hoursRun} hrs (ETB {stage.machineCost || 0})
                            </p>
                          )}
                        </div>

                        {/* Stage Controls */}
                        <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-end gap-1.5">
                          {isPending && (
                            <button
                              onClick={() => openStageAction(job, stage, 'start')}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition"
                            >
                              <Play className="w-3 h-3" /> Start Stage
                            </button>
                          )}
                          {isInProgress && (
                            <button
                              onClick={() => openStageAction(job, stage, 'complete')}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
                            >
                              <Check className="w-3 h-3" /> Complete
                            </button>
                          )}
                          {isCompleted && !stage.qcPassed && (
                            <button
                              onClick={() => openStageAction(job, stage, 'qc')}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition"
                            >
                              <ShieldCheck className="w-3 h-3" /> QC Sign-off
                            </button>
                          )}
                          {stage.qcPassed && (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" /> QC Passed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dispatch New Job Order Modal */}
      <Modal
        isOpen={isNewJobModalOpen}
        onClose={() => setIsNewJobModalOpen(false)}
        title="Dispatch Production Job Order (Work Order)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateJobSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Sales Order *
              </label>
              <select
                required
                value={jobForm.order}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">Select Order...</option>
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.orderNumber} - {o.title} ({o.customer?.companyName || 'Customer'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={jobForm.priority}
                onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Print Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={jobForm.targetQuantity}
                onChange={(e) => setJobForm({ ...jobForm, targetQuantity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Start Date *
              </label>
              <input
                type="date"
                required
                value={jobForm.scheduledStartDate}
                onChange={(e) => setJobForm({ ...jobForm, scheduledStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Completion *
              </label>
              <input
                type="date"
                required
                value={jobForm.scheduledCompletionDate}
                onChange={(e) => setJobForm({ ...jobForm, scheduledCompletionDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Production Floor Notes / Special Specifications
            </label>
            <textarea
              rows={2}
              placeholder="Paper stock GSM, ink color Pantone numbers, lamination finish, packaging cartons..."
              value={jobForm.remarks}
              onChange={(e) => setJobForm({ ...jobForm, remarks: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewJobModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !jobForm.order}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Job Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Stage Action Modal (Start / Complete / QC) */}
      {selectedJob && activeStage && (
        <Modal
          isOpen={isStageActionModalOpen}
          onClose={() => setIsStageActionModalOpen(false)}
          title={`Stage ${activeStage.sequence}: ${activeStage.stageName} - ${
            stageActionType === 'start'
              ? 'Start Execution'
              : stageActionType === 'complete'
              ? 'Mark Completed'
              : 'Quality Inspection (QC)'
          }`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleStageActionSubmit} className="space-y-4">
            {stageActionType === 'start' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assign Machine / Station
                  </label>
                  <select
                    value={stageForm.machine}
                    onChange={(e) => setStageForm({ ...stageForm, machine: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                  >
                    <option value="">Manual Bench / No Machine</option>
                    {machines
                      .filter((m) => m.status === 'available')
                      .map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.machineCode} - {m.name} (ETB {m.hourlyCostRate}/hr)
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Floor Operators
                  </label>
                  <select
                    multiple
                    value={stageForm.operators}
                    onChange={(e) => {
                      const vals = Array.from(e.target.selectedOptions, (o) => o.value);
                      setStageForm({ ...stageForm, operators: vals });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none h-24"
                  >
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple operators</p>
                </div>
              </>
            )}

            {stageActionType === 'complete' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Machine Runtime (Hours) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={stageForm.hoursRun}
                      onChange={(e) => setStageForm({ ...stageForm, hoursRun: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Output Quantity Passed
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stageForm.completedQuantity}
                      onChange={(e) => setStageForm({ ...stageForm, completedQuantity: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operator Run Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ink adjustments, paper feeder alignment notes..."
                    value={stageForm.notes}
                    onChange={(e) => setStageForm({ ...stageForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                  />
                </div>
              </>
            )}

            {stageActionType === 'qc' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Total Good Units Passed *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={stageForm.producedQuantity}
                      onChange={(e) => setStageForm({ ...stageForm, producedQuantity: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none font-bold text-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Defective / Spoiled Units
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stageForm.defectiveQuantity}
                      onChange={(e) => setStageForm({ ...stageForm, defectiveQuantity: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none font-bold text-rose-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quality Inspection Verdict
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        checked={stageForm.passed === true}
                        onChange={() => setStageForm({ ...stageForm, passed: true })}
                        className="text-emerald-600"
                      />
                      <span className="text-emerald-700 font-semibold">Passed & Released</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        checked={stageForm.passed === false}
                        onChange={() => setStageForm({ ...stageForm, passed: false })}
                        className="text-rose-600"
                      />
                      <span className="text-rose-700 font-semibold">Rejected</span>
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsStageActionModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Confirm Stage Action'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Costing & Job Order Details Modal */}
      {selectedJob && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Job Order: ${selectedJob.jobOrderNumber}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-start bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">
                  {selectedJob.jobOrderNumber}
                </span>
                <h4 className="font-bold text-slate-900 text-base">{selectedJob.order?.title}</h4>
                <p className="text-xs text-slate-500">
                  Customer: {selectedJob.customer?.companyName} • Target: {selectedJob.targetQuantity?.toLocaleString()} units
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${
                  STATUS_BADGES[selectedJob.status] || ''
                }`}
              >
                {selectedJob.status?.replace('_', ' ')}
              </span>
            </div>

            {/* Actual Cost Rollup vs Profitability */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Production Actual Cost Rollup Engine
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-slate-400 block">Machine Runtime Cost</span>
                  <span className="font-bold text-slate-800">
                    ETB {Number(selectedJob.costRollup?.totalMachineCost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-slate-400 block">Raw Materials Drawn</span>
                  <span className="font-bold text-slate-800">
                    ETB {Number(selectedJob.costRollup?.totalMaterialCost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <span className="text-slate-400 block">Scrap / Wastage Cost</span>
                  <span className="font-bold text-rose-600">
                    ETB {Number(selectedJob.costRollup?.totalWastageCost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-indigo-200 rounded-lg">
                  <span className="text-indigo-600 font-semibold block">Total Actual Cost</span>
                  <span className="font-bold text-indigo-700 text-sm">
                    ETB {Number(selectedJob.costRollup?.totalActualCost || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

