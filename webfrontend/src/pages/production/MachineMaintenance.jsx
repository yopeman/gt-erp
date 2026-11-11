import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import productionService from '../../services/productionService';
import { extractArray, extractData } from '../../services/api';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Check,
  User,
  Factory,
  Package,
  DollarSign,
  Calendar,
  Eye,
  Trash2,
  FileText
} from 'lucide-react';

const PRIORITY_BADGES = {
  critical: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
  high: 'bg-orange-100 text-orange-800 border-orange-200 font-semibold',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200'
};

const STATUS_BADGES = {
  reported: 'bg-blue-50 text-blue-700 border-blue-200',
  approved: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-50 text-slate-600 border-slate-200'
};

export default function MachineMaintenance() {
  const { t } = useTranslation();

  const [maintenances, setMaintenances] = useState([]);
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modals
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // New Ticket Form State
  const [ticketForm, setTicketForm] = useState({
    machine: '',
    maintenanceType: 'breakdown_repair',
    priority: 'high',
    reportedBy: '',
    assignedTechnician: '',
    externalServiceProvider: '',
    issueDescription: ''
  });

  // Completion Form State
  const [completionForm, setCompletionForm] = useState({
    downtimeHours: 0,
    rootCause: '',
    correctiveActionTaken: '',
    technicianLaborCost: 0,
    externalServiceCost: 0,
    sparePartsUsed: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [mntRes, mchRes, empRes, itemsRes] = await Promise.allSettled([
        productionService.getMaintenances({
          search,
          status: statusFilter,
          priority: priorityFilter,
          maintenanceType: typeFilter
        }),
        productionService.getMachines({ limit: 100 }),
        productionService.getEmployees({ limit: 200, status: 'active' }),
        productionService.getInventoryItems({ limit: 100 })
      ]);

      if (mntRes.status === 'fulfilled') {
        setMaintenances(extractArray(mntRes.value, 'maintenances'));
      } else {
        console.error('Failed to fetch maintenance tickets:', mntRes.reason);
        setError(mntRes.reason?.message || 'Failed to load maintenance records.');
      }

      if (mchRes.status === 'fulfilled') {
        setMachines(extractArray(mchRes.value, 'machines'));
      }
      if (empRes.status === 'fulfilled') {
        setEmployees(extractArray(empRes.value, 'employees'));
      }
      if (itemsRes.status === 'fulfilled') {
        setInventoryItems(extractArray(itemsRes.value, 'items'));
      }
    } catch (err) {
      console.error('Failed to fetch maintenance tickets:', err);
      setError('Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, priorityFilter, typeFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await productionService.createMaintenance(ticketForm);
      setIsNewTicketModalOpen(false);
      resetTicketForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create maintenance ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartRepair = async (id) => {
    try {
      await productionService.startMaintenance(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start repair');
    }
  };

  const openCompleteModal = (ticket) => {
    setSelectedTicket(ticket);
    setCompletionForm({
      downtimeHours: ticket.downtimeHours || 1,
      rootCause: ticket.rootCause || '',
      correctiveActionTaken: ticket.correctiveActionTaken || '',
      technicianLaborCost: ticket.technicianLaborCost || 0,
      externalServiceCost: ticket.externalServiceCost || 0,
      sparePartsUsed: []
    });
    setIsCompleteModalOpen(true);
  };

  const handleAddSparePart = () => {
    setCompletionForm({
      ...completionForm,
      sparePartsUsed: [
        ...completionForm.sparePartsUsed,
        { item: '', quantity: 1, unitCost: 0, totalCost: 0 }
      ]
    });
  };

  const handleSparePartChange = (index, field, value) => {
    const updated = [...completionForm.sparePartsUsed];
    updated[index][field] = value;

    if (field === 'item') {
      const selectedItem = inventoryItems.find((itm) => itm._id === value);
      if (selectedItem) {
        updated[index].unitCost = selectedItem.costPrice || 0;
      }
    }

    const qty = Number(updated[index].quantity || 0);
    const unit = Number(updated[index].unitCost || 0);
    updated[index].totalCost = Number((qty * unit).toFixed(2));

    setCompletionForm({ ...completionForm, sparePartsUsed: updated });
  };

  const handleRemoveSparePart = (index) => {
    const updated = completionForm.sparePartsUsed.filter((_, i) => i !== index);
    setCompletionForm({ ...completionForm, sparePartsUsed: updated });
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      setSubmitting(true);
      await productionService.completeMaintenance(selectedTicket._id, completionForm);
      setIsCompleteModalOpen(false);
      setSelectedTicket(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  const resetTicketForm = () => {
    setTicketForm({
      machine: '',
      maintenanceType: 'breakdown_repair',
      priority: 'high',
      reportedBy: '',
      assignedTechnician: '',
      externalServiceProvider: '',
      issueDescription: ''
    });
  };

  const totalSparePartsCost = completionForm.sparePartsUsed.reduce(
    (sum, p) => sum + (p.totalCost || 0),
    0
  );
  const totalCostEstimate =
    totalSparePartsCost +
    Number(completionForm.technicianLaborCost || 0) +
    Number(completionForm.externalServiceCost || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-7 h-7 text-indigo-600" />
            Machine Maintenance & Breakdown Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Plant breakdown response, technician assignments, downtime tracking, and spare parts inventory deduction.
          </p>
        </div>
        <button
          onClick={() => {
            resetTicketForm();
            setIsNewTicketModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Log Breakdown Ticket
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket #, issue description..."
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
            <option value="all">All Statuses</option>
            <option value="reported">Reported</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500 mt-2">Loading maintenance tickets...</p>
        </div>
      ) : maintenances.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance tickets found"
          description="Log emergency repairs or preventive maintenance to maintain plant machine reliability."
          actionText="Log Breakdown"
          onAction={() => {
            resetTicketForm();
            setIsNewTicketModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Ticket #</th>
                <th className="py-3 px-4">Equipment</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Issue Summary</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Downtime</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenances.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-bold text-indigo-600">
                    {ticket.maintenanceNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{ticket.machine?.name}</div>
                    <div className="text-xs text-slate-400">{ticket.machine?.machineCode}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                        PRIORITY_BADGES[ticket.priority] || PRIORITY_BADGES.medium
                      }`}
                    >
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="capitalize text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                      {ticket.maintenanceType?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                    {ticket.issueDescription}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700 font-medium">
                    {ticket.assignedTechnician
                      ? `${ticket.assignedTechnician.firstName} ${ticket.assignedTechnician.lastName}`
                      : ticket.externalServiceProvider || 'Unassigned'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                        STATUS_BADGES[ticket.status] || STATUS_BADGES.reported
                      }`}
                    >
                      {ticket.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold text-slate-800">
                    {ticket.downtimeHours ? `${ticket.downtimeHours} hrs` : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {ticket.status === 'reported' && (
                        <button
                          onClick={() => handleStartRepair(ticket._id)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition shadow-xs"
                          title="Start Repair"
                        >
                          <Play className="w-3 h-3" />
                          Start
                        </button>
                      )}
                      {ticket.status === 'in_progress' && (
                        <button
                          onClick={() => openCompleteModal(ticket)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition shadow-xs"
                          title="Complete & Restore"
                        >
                          <Check className="w-3 h-3" />
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Breakdown / New Ticket Modal */}
      <Modal
        isOpen={isNewTicketModalOpen}
        onClose={() => setIsNewTicketModalOpen(false)}
        title="Log Machine Breakdown / Repair Ticket"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Equipment *
              </label>
              <select
                required
                value={ticketForm.machine}
                onChange={(e) => setTicketForm({ ...ticketForm, machine: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">Select Equipment...</option>
                {machines.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.machineCode} - {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maintenance Type *
              </label>
              <select
                value={ticketForm.maintenanceType}
                onChange={(e) => setTicketForm({ ...ticketForm, maintenanceType: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="breakdown_repair">Emergency Breakdown Repair</option>
                <option value="preventive">Scheduled Preventive Overhaul</option>
                <option value="calibration">Sensor & Register Calibration</option>
                <option value="emergency_repair">Urgent Floor Repair</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority Level *
              </label>
              <select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="critical">Critical (Plant Stoppage)</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reported By *
              </label>
              <select
                required
                value={ticketForm.reportedBy}
                onChange={(e) => setTicketForm({ ...ticketForm, reportedBy: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">Select Reporter...</option>
                {employees.map((emp) => {
                  const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Staff';
                  const code = emp.employeeCode || emp.employeeId || '';
                  return (
                    <option key={emp._id} value={emp._id}>
                      {name} {code ? `(${code})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Technician (Internal)
              </label>
              <select
                value={ticketForm.assignedTechnician}
                onChange={(e) => setTicketForm({ ...ticketForm, assignedTechnician: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">Select Technician...</option>
                {employees.map((emp) => {
                  const name = emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Technician';
                  const pos = emp.position || 'Technician';
                  return (
                    <option key={emp._id} value={emp._id}>
                      {name} ({pos})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                External Service Provider (If outsourced)
              </label>
              <input
                type="text"
                placeholder="e.g. Heidelberg Technical Services"
                value={ticketForm.externalServiceProvider}
                onChange={(e) => setTicketForm({ ...ticketForm, externalServiceProvider: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Issue Description / Failure Symptom *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe error code, abnormal vibration, hydraulic leak, paper jam sensor fault..."
              value={ticketForm.issueDescription}
              onChange={(e) => setTicketForm({ ...ticketForm, issueDescription: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTicketModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Creating Ticket...' : 'Log Ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete & Resolve Repair Modal */}
      {selectedTicket && (
        <Modal
          isOpen={isCompleteModalOpen}
          onClose={() => setIsCompleteModalOpen(false)}
          title={`Resolve Repair: ${selectedTicket.maintenanceNumber}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleCompleteSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-800">{selectedTicket.machine?.name}</span>
                <p className="text-slate-500">{selectedTicket.issueDescription}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold uppercase">
                {selectedTicket.priority}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Downtime Hours *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={completionForm.downtimeHours}
                  onChange={(e) => setCompletionForm({ ...completionForm, downtimeHours: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Technician Labor (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={completionForm.technicianLaborCost}
                  onChange={(e) => setCompletionForm({ ...completionForm, technicianLaborCost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  External Service (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={completionForm.externalServiceCost}
                  onChange={(e) => setCompletionForm({ ...completionForm, externalServiceCost: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Root Cause Analysis
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Worn gripper spring, oil seal degradation, electrical spike..."
                  value={completionForm.rootCause}
                  onChange={(e) => setCompletionForm({ ...completionForm, rootCause: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrective Action Taken
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Replaced tension belt, recalibrated optical register sensor..."
                  value={completionForm.correctiveActionTaken}
                  onChange={(e) => setCompletionForm({ ...completionForm, correctiveActionTaken: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
                />
              </div>
            </div>

            {/* Spare Parts Usage from Store */}
            <div className="border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Spare Parts Consumed From Store ({completionForm.sparePartsUsed.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddSparePart}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Part
                </button>
              </div>

              {completionForm.sparePartsUsed.map((part, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded">
                  <div className="col-span-6">
                    <select
                      value={part.item}
                      onChange={(e) => handleSparePartChange(index, 'item', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value="">Select Spare Part / Item...</option>
                      {inventoryItems.map((itm) => (
                        <option key={itm._id} value={itm._id}>
                          {itm.itemCode} - {itm.itemName} (Stock: {itm.currentStock || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={part.quantity}
                      onChange={(e) => handleSparePartChange(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-center"
                    />
                  </div>
                  <div className="col-span-3 text-xs text-right font-medium text-slate-700">
                    ETB {Number(part.totalCost || 0).toFixed(2)}
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveSparePart(index)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-800">
                <span>Total Maintenance Expense:</span>
                <span className="text-indigo-600">ETB {totalCostEstimate.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
              >
                {submitting ? 'Resolving...' : 'Complete & Restore Machine'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Ticket #${selectedTicket.maintenanceNumber}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">
                  {selectedTicket.machine?.machineCode}
                </span>
                <h4 className="font-bold text-slate-900">{selectedTicket.machine?.name}</h4>
                <p className="text-xs text-slate-500 capitalize">
                  {selectedTicket.maintenanceType?.replace('_', ' ')} • Priority:{' '}
                  {selectedTicket.priority}
                </p>
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${
                  STATUS_BADGES[selectedTicket.status] || ''
                }`}
              >
                {selectedTicket.status?.replace('_', ' ')}
              </span>
            </div>

            <div className="bg-white p-3 border border-slate-200 rounded-lg space-y-1.5 text-xs">
              <span className="font-semibold text-slate-700">Issue Description:</span>
              <p className="text-slate-600">{selectedTicket.issueDescription}</p>
            </div>

            {selectedTicket.rootCause && (
              <div className="bg-white p-3 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                <span className="font-semibold text-slate-700">Root Cause:</span>
                <p className="text-slate-600">{selectedTicket.rootCause}</p>
              </div>
            )}

            {selectedTicket.correctiveActionTaken && (
              <div className="bg-white p-3 border border-slate-200 rounded-lg space-y-1.5 text-xs">
                <span className="font-semibold text-slate-700">Corrective Action Taken:</span>
                <p className="text-slate-600">{selectedTicket.correctiveActionTaken}</p>
              </div>
            )}

            {/* Spare Parts */}
            {selectedTicket.sparePartsUsed && selectedTicket.sparePartsUsed.length > 0 && (
              <div className="space-y-2 text-xs">
                <h5 className="font-bold text-slate-700 uppercase">Spare Parts Consumed</h5>
                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {selectedTicket.sparePartsUsed.map((part, i) => (
                    <div key={i} className="p-2.5 flex justify-between items-center">
                      <span>{part.item?.itemName || 'Item'} (Qty: {part.quantity})</span>
                      <span className="font-semibold text-slate-800">
                        ETB {Number(part.totalCost || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800">
              <span>Total Maintenance Cost:</span>
              <span className="text-indigo-600">ETB {Number(selectedTicket.totalMaintenanceCost || 0).toFixed(2)}</span>
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

