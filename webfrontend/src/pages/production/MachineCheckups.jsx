import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import productionService from '../../services/productionService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  Factory,
  Eye,
  Trash2,
  Wrench,
  ArrowRight
} from 'lucide-react';

const DEFAULT_TASKS = {
  daily: [
    'Inspect lubrication & oil reservoir levels',
    'Clean ink fountains & blanket cylinders',
    'Verify emergency stop buttons & optical safety light guards',
    'Check pneumatic air pressure & suction filters',
    'Inspect delivery gripper chains & feeder timing'
  ],
  weekly: [
    'Check drive belts, gear mesh & roller tension',
    'Clean electronic sensors & sheet register optical eyes',
    'Inspect dampening solution pH & electrical conductivity',
    'Lubricate delivery gripper shaft bearings'
  ],
  monthly: [
    'Grease main cylinder bearings & drive chain couplings',
    'Calibrate color spectrophotometer & register guide marks',
    'Deep electrical cabinet audit & exhaust fan cleaning',
    'Check hydraulic pressure & cutting knife sharpness (cutters)'
  ]
};

export default function MachineCheckups() {
  const { t } = useTranslation();

  const [checkups, setCheckups] = useState([]);
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [machineFilter, setMachineFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isNewCheckupModalOpen, setIsNewCheckupModalOpen] = useState(false);
  const [selectedCheckup, setSelectedCheckup] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form State
  const [formMachine, setFormMachine] = useState('');
  const [formType, setFormType] = useState('daily');
  const [formInspector, setFormInspector] = useState('');
  const [formInspectionDate, setFormInspectionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [checklistItems, setChecklistItems] = useState([]);
  const [formRemarks, setFormRemarks] = useState('');
  const [createTicketOnFail, setCreateTicketOnFail] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [checkupsRes, machinesRes, employeesRes] = await Promise.all([
        productionService.getCheckups({
          machine: machineFilter,
          type: typeFilter,
          overallStatus: statusFilter
        }),
        productionService.getMachines({ limit: 100 }),
        productionService.getEmployees({ limit: 200, status: 'active' })
      ]);

      setCheckups(checkupsRes.data.data.checkups || []);
      setMachines(machinesRes.data.data.machines || []);
      setEmployees(employeesRes.data.data?.employees || employeesRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch checkups:', err);
      setError('Failed to load checkups list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [machineFilter, typeFilter, statusFilter]);

  // When machine or type changes in form, dynamically populate checklist items
  useEffect(() => {
    if (!formMachine) {
      setChecklistItems([]);
      return;
    }

    const machineObj = machines.find((m) => m._id === formMachine);
    const customTasks = machineObj?.checklists?.[formType];
    const tasksToUse =
      customTasks && customTasks.length > 0 ? customTasks : DEFAULT_TASKS[formType] || [];

    setChecklistItems(
      tasksToUse.map((task) => ({
        task,
        status: 'pass',
        notes: ''
      }))
    );
  }, [formMachine, formType, machines]);

  const handleItemStatusChange = (index, status) => {
    const updated = [...checklistItems];
    updated[index].status = status;
    setChecklistItems(updated);
  };

  const handleItemNotesChange = (index, notes) => {
    const updated = [...checklistItems];
    updated[index].notes = notes;
    setChecklistItems(updated);
  };

  const handleSubmitCheckup = async (e) => {
    e.preventDefault();
    if (!formMachine) {
      alert('Please select a machine');
      return;
    }
    if (!formInspector) {
      alert('Please select the inspecting operator');
      return;
    }
    if (checklistItems.length === 0) {
      alert('Checklist cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      await productionService.createCheckup({
        machine: formMachine,
        type: formType,
        inspectedBy: formInspector,
        inspectionDate: formInspectionDate,
        checklistItems,
        remarks: formRemarks,
        createTicketOnFail
      });
      setIsNewCheckupModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record checkup');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormMachine('');
    setFormType('daily');
    setFormInspector('');
    setChecklistItems([]);
    setFormRemarks('');
  };

  const hasFailures = checklistItems.some((item) => item.status === 'fail');

  const openDetails = (checkup) => {
    setSelectedCheckup(checkup);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-indigo-600" />
            Machine Inspection Checkups
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Operator pre-flight daily, weekly, and monthly preventive maintenance logs.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsNewCheckupModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Conduct New Inspection
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Filter by Equipment</label>
          <select
            value={machineFilter}
            onChange={(e) => setMachineFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
          >
            <option value="all">All Machinery</option>
            {machines.map((m) => (
              <option key={m._id} value={m._id}>
                {m.machineCode} - {m.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Checkup Frequency</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
          >
            <option value="all">All Frequencies</option>
            <option value="daily">Daily Checklist</option>
            <option value="weekly">Weekly Checklist</option>
            <option value="monthly">Monthly Checklist</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">Overall Outcome</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none"
          >
            <option value="all">All Outcomes</option>
            <option value="passed">Passed (Operational)</option>
            <option value="failed">Failed (Requires Maintenance)</option>
          </select>
        </div>
      </div>

      {/* Checkups History Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500 mt-2">Loading inspection logs...</p>
        </div>
      ) : checkups.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No inspection records found"
          description="Conduct daily pre-run checks to prevent unplanned plant breakdowns."
          actionText="Conduct Inspection"
          onAction={() => {
            resetForm();
            setIsNewCheckupModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Inspection #</th>
                <th className="py-3 px-4">Equipment</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Inspected By</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Maintenance Ticket</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {checkups.map((chk) => (
                <tr key={chk._id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-semibold text-indigo-600">
                    {chk.checkupNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{chk.machine?.name}</div>
                    <div className="text-xs text-slate-400">{chk.machine?.machineCode}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="capitalize px-2 py-0.5 rounded text-xs bg-slate-100 font-medium text-slate-700">
                      {chk.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500">
                    {new Date(chk.inspectionDate).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700 font-medium">
                    {chk.inspectedBy ? `${chk.inspectedBy.firstName} ${chk.inspectedBy.lastName}` : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    {chk.overallStatus === 'passed' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {chk.triggeredMaintenanceTicket ? (
                      <span className="font-semibold text-rose-600 flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        {chk.triggeredMaintenanceTicket.maintenanceNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => openDetails(chk)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Inspection Modal */}
      <Modal
        isOpen={isNewCheckupModalOpen}
        onClose={() => setIsNewCheckupModalOpen(false)}
        title="Conduct Machine Inspection Checkup"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmitCheckup} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Machine *
              </label>
              <select
                required
                value={formMachine}
                onChange={(e) => setFormMachine(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">Choose Equipment...</option>
                {machines.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.machineCode} - {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Checkup Type *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="daily">Daily Pre-run Checklist</option>
                <option value="weekly">Weekly Routine Checklist</option>
                <option value="monthly">Monthly Preventive Checklist</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inspecting Operator *
              </label>
              <select
                required
                value={formInspector}
                onChange={(e) => setFormInspector(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">Select Operator...</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Checklist Items Interactive Area */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Inspection Tasks & Checkpoints ({checklistItems.length})
              </span>
              <span className="text-xs text-slate-500">Pass / Needs Attention / Fail</span>
            </div>

            {checklistItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                Select a machine above to load inspection tasks.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {checklistItems.map((item, index) => (
                  <div key={index} className="p-3 hover:bg-slate-50 transition space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-800">
                        {index + 1}. {item.task}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(index, 'pass')}
                          className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                            item.status === 'pass'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(index, 'needs_attention')}
                          className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                            item.status === 'needs_attention'
                              ? 'bg-amber-500 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Warning
                        </button>
                        <button
                          type="button"
                          onClick={() => handleItemStatusChange(index, 'fail')}
                          className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
                            item.status === 'fail'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Fail
                        </button>
                      </div>
                    </div>
                    {item.status !== 'pass' && (
                      <input
                        type="text"
                        placeholder="Explain defect or reason for warning/failure..."
                        value={item.notes}
                        onChange={(e) => handleItemNotesChange(index, e.target.value)}
                        className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs text-slate-800 bg-white"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auto-ticket Alert Banner if there are fails */}
          {hasFailures && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">One or more critical inspection checkpoints failed.</p>
                <label className="flex items-center gap-2 mt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createTicketOnFail}
                    onChange={(e) => setCreateTicketOnFail(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    Automatically create Breakdown/Maintenance ticket and lock machine status to "Maintenance"
                  </span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              General Inspector Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Additional observations, ambient temperature, motor sound..."
              value={formRemarks}
              onChange={(e) => setFormRemarks(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewCheckupModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formMachine}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Log Inspection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Checkup Details Modal */}
      {selectedCheckup && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Inspection Log: ${selectedCheckup.checkupNumber}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">
                  {selectedCheckup.machine?.machineCode}
                </span>
                <h4 className="font-bold text-slate-900">{selectedCheckup.machine?.name}</h4>
                <p className="text-xs text-slate-500">
                  Inspected on {new Date(selectedCheckup.inspectionDate).toLocaleDateString()} by{' '}
                  {selectedCheckup.inspectedBy
                    ? `${selectedCheckup.inspectedBy.firstName} ${selectedCheckup.inspectedBy.lastName}`
                    : 'N/A'}
                </p>
              </div>
              <div>
                {selectedCheckup.overallStatus === 'passed' ? (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                    Passed
                  </span>
                ) : (
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-rose-100 text-rose-800">
                    Failed
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-700 uppercase">Checkpoint Item Results</h5>
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                {selectedCheckup.checklistItems?.map((item, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-800">{item.task}</span>
                      {item.notes && <p className="text-slate-500 italic mt-0.5">{item.notes}</p>}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        item.status === 'pass'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'fail'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {selectedCheckup.remarks && (
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase">Remarks</span>
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded border border-slate-200">
                  {selectedCheckup.remarks}
                </p>
              </div>
            )}

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

