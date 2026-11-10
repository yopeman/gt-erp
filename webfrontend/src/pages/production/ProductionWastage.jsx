import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import productionService from '../../services/productionService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Trash2,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Package,
  Layers,
  User,
  Factory,
  Eye,
  Check
} from 'lucide-react';

const REASONS = [
  { value: 'setup_spoilage', label: 'Setup Spoilage / Color Registration' },
  { value: 'machine_malfunction', label: 'Machine Jam / Mechanical Malfunction' },
  { value: 'operator_error', label: 'Operator Setting / Feeder Error' },
  { value: 'defective_raw_material', label: 'Defective Raw Paper / Ink Quality' },
  { value: 'color_mismatch', label: 'Color / Density Mismatch' },
  { value: 'plate_defect', label: 'CTP Plate Scratch / Defect' },
  { value: 'cutting_misalignment', label: 'Guillotine Cutting Misalignment' },
  { value: 'other', label: 'Other Cause' }
];

const STATUS_BADGES = {
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

export default function ProductionWastage() {
  const { t } = useTranslation();

  const [wastages, setWastages] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWastage, setSelectedWastage] = useState(null);

  // Log Form State
  const [formJob, setFormJob] = useState('');
  const [formStageName, setFormStageName] = useState('Press Run / Offset');
  const [formMachine, setFormMachine] = useState('');
  const [formOperator, setFormOperator] = useState('');
  const [formCategory, setFormCategory] = useState('setup_spoilage');
  const [items, setItems] = useState([
    {
      materialItem: '',
      description: 'Art Paper 150 GSM Spoilage',
      quantity: 50,
      unitOfMeasurement: 'sheet',
      unitCost: 8.5,
      totalCost: 425,
      reason: 'setup_spoilage',
      notes: ''
    }
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [wstRes, jobsRes, mchRes, empRes, itemsRes] = await Promise.all([
        productionService.getWastages({
          search,
          status: statusFilter,
          wasteCategory: categoryFilter
        }),
        productionService.getProductionJobs({ limit: 100 }),
        productionService.getMachines({ limit: 100 }),
        productionService.getEmployees({ limit: 200, status: 'active' }),
        productionService.getInventoryItems({ limit: 100 })
      ]);

      setWastages(wstRes.data.data.wastages || []);
      setJobs(jobsRes.data.data.jobs || []);
      setMachines(mchRes.data.data.machines || []);
      setEmployees(empRes.data.data?.employees || empRes.data.data || []);
      setInventoryItems(itemsRes.data.data?.items || itemsRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch wastages:', err);
      setError('Failed to load wastage records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter, categoryFilter]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        materialItem: '',
        description: '',
        quantity: 10,
        unitOfMeasurement: 'sheet',
        unitCost: 0,
        totalCost: 0,
        reason: 'setup_spoilage',
        notes: ''
      }
    ]);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    if (field === 'materialItem') {
      const selectedMat = inventoryItems.find((itm) => itm._id === value);
      if (selectedMat) {
        updated[index].description = selectedMat.itemName;
        updated[index].unitCost = selectedMat.costPrice || 0;
        updated[index].unitOfMeasurement = selectedMat.unit || 'unit';
      }
    }

    const qty = Number(updated[index].quantity || 0);
    const unit = Number(updated[index].unitCost || 0);
    updated[index].totalCost = Number((qty * unit).toFixed(2));

    setItems(updated);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formJob) {
      alert('Please select a production job order');
      return;
    }
    if (items.length === 0) {
      alert('At least one wasted item is required');
      return;
    }

    try {
      setSubmitting(true);
      await productionService.createWastage({
        productionJob: formJob,
        stageName: formStageName,
        machine: formMachine || undefined,
        operator: formOperator || undefined,
        wasteCategory: formCategory,
        items
      });
      setIsLogModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record wastage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id, status) => {
    try {
      await productionService.approveWastage(id, { status });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update approval');
    }
  };

  const resetForm = () => {
    setFormJob('');
    setFormStageName('Press Run / Offset');
    setFormMachine('');
    setFormOperator('');
    setFormCategory('setup_spoilage');
    setItems([]);
  };

  const totalLoss = wastages.reduce((sum, w) => sum + (w.totalWastageCost || 0), 0);
  const formTotalCost = items.reduce((sum, itm) => sum + (itm.totalCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-rose-600" />
            Production Spoilage & Wastage Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quantify paper, plate, and ink losses, classify root causes, and submit scrap for manager sign-off.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            handleAddItem();
            setIsLogModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Log Production Scrap
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Total Financial Spoilage Loss</p>
            <p className="text-xl font-bold text-rose-600">ETB {totalLoss.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Pending Review</p>
            <p className="text-xl font-bold text-amber-600">
              {wastages.filter((w) => w.status === 'pending_review').length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Approved Scrap Disposals</p>
            <p className="text-xl font-bold text-emerald-600">
              {wastages.filter((w) => w.status === 'approved').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Wastage # (WST-2026-XXXX)..."
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
            <option value="all">All Approval Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none"
          >
            <option value="all">All Categories</option>
            <option value="setup_spoilage">Setup Spoilage</option>
            <option value="raw_material">Raw Material Defect</option>
            <option value="defective_product">Defective Product</option>
          </select>
        </div>
      </div>

      {/* Wastage Logs Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-slate-500 mt-2">Loading scrap logs...</p>
        </div>
      ) : wastages.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="No scrap or wastage logged"
          description="Log setup spoilages, misprints, and paper waste to maintain accurate job cost accounting."
          actionText="Log First Scrap Entry"
          onAction={() => {
            resetForm();
            handleAddItem();
            setIsLogModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Wastage #</th>
                <th className="py-3 px-4">Job Order</th>
                <th className="py-3 px-4">Stage & Machine</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Loss Value</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Approval</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {wastages.map((wst) => (
                <tr key={wst._id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-bold text-rose-600">
                    {wst.wastageNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-slate-900">
                      {wst.productionJob?.jobOrderNumber || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{wst.stageName}</div>
                    <div className="text-xs text-slate-400">{wst.machine?.name || 'Bench'}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="capitalize text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      {wst.wasteCategory?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-rose-600">
                    ETB {Number(wst.totalWastageCost || 0).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700">
                    {wst.operator ? `${wst.operator.firstName} ${wst.operator.lastName}` : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${
                        STATUS_BADGES[wst.status] || STATUS_BADGES.pending_review
                      }`}
                    >
                      {wst.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {wst.status === 'pending_review' && (
                        <button
                          onClick={() => handleApprove(wst._id, 'approved')}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          title="Approve Scrap"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedWastage(wst);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded"
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

      {/* Log Scrap Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Production Scrap / Spoilage"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Production Job Order *
              </label>
              <select
                required
                value={formJob}
                onChange={(e) => setFormJob(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="">Select Job Order...</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.jobOrderNumber} - {j.order?.title || 'Order'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stage Name *
              </label>
              <input
                type="text"
                required
                value={formStageName}
                onChange={(e) => setFormStageName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"
              >
                <option value="setup_spoilage">Setup Spoilage / Test Prints</option>
                <option value="raw_material">Raw Material Spoilage</option>
                <option value="defective_product">Defective Finished Goods</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Equipment (Optional)
              </label>
              <select
                value={formMachine}
                onChange={(e) => setFormMachine(e.target.value)}
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
                Responsible Operator
              </label>
              <select
                value={formOperator}
                onChange={(e) => setFormOperator(e.target.value)}
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

          {/* Spoilage Items Line Table */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Spoiled Materials & Breakdown ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Material
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Inventory Item</label>
                      <select
                        value={item.materialItem}
                        onChange={(e) => handleItemChange(index, 'materialItem', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="">Select Paper / Consumable...</option>
                        {inventoryItems.map((itm) => (
                          <option key={itm._id} value={itm._id}>
                            {itm.itemCode} - {itm.itemName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Root Cause</label>
                      <select
                        value={item.reason}
                        onChange={(e) => handleItemChange(index, 'reason', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                      >
                        {REASONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Unit (sheet/kg)</label>
                      <input
                        type="text"
                        value={item.unitOfMeasurement}
                        onChange={(e) => handleItemChange(index, 'unitOfMeasurement', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-center"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Unit Cost (ETB)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => handleItemChange(index, 'unitCost', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white text-center"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Line Loss</label>
                      <span className="font-bold text-rose-600">ETB {item.totalCost?.toFixed(2)}</span>
                    </div>
                    <div className="col-span-1 text-right pt-4">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs font-bold text-slate-800">
              <span>Total Financial Waste Loss:</span>
              <span className="text-rose-600 text-sm">ETB {formTotalCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formJob}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Logging Scrap...' : 'Confirm Scrap Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {selectedWastage && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Wastage Record #${selectedWastage.wastageNumber}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase">
                  {selectedWastage.productionJob?.jobOrderNumber}
                </span>
                <h4 className="font-bold text-slate-900">{selectedWastage.stageName}</h4>
                <p className="text-xs text-slate-500 capitalize">
                  {selectedWastage.wasteCategory?.replace('_', ' ')}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border capitalize ${
                  STATUS_BADGES[selectedWastage.status] || ''
                }`}
              >
                {selectedWastage.status?.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <h5 className="font-bold text-slate-700 uppercase">Spoiled Materials</h5>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {selectedWastage.items?.map((itm, i) => (
                  <div key={i} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{itm.description}</span>
                      <p className="text-[11px] text-slate-500 capitalize">
                        Qty: {itm.quantity} {itm.unitOfMeasurement} • Cause: {itm.reason?.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="font-bold text-rose-600">ETB {Number(itm.totalCost || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-800">
              <span>Total Wastage Financial Loss:</span>
              <span className="text-rose-600 text-sm">
                ETB {Number(selectedWastage.totalWastageCost || 0).toFixed(2)}
              </span>
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

