import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import productionService from '../../services/productionService';
import { extractArray, extractData } from '../../services/api';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Factory,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Gauge,
  Sliders,
  DollarSign,
  UserCheck,
  Building2,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Power,
  RotateCcw
} from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All Equipment' },
  { value: 'offset_press', label: 'Offset Press' },
  { value: 'digital_press', label: 'Digital Press' },
  { value: 'large_format_plotter', label: 'Large Format Plotter' },
  { value: 'guillotine_cutter', label: 'Guillotine Cutter' },
  { value: 'lamination_machine', label: 'Lamination Machine' },
  { value: 'die_cutter', label: 'Die Cutter' },
  { value: 'folding_machine', label: 'Folding Machine' },
  { value: 'binding_machine', label: 'Binding Machine' },
  { value: 'packaging_gluer', label: 'Packaging Gluer' },
  { value: 'other', label: 'Other Machinery' }
];

const STATUS_CONFIG = {
  available: { label: 'Available', color: 'green', bg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
  running: { label: 'Running', color: 'blue', bg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
  maintenance: { label: 'In Maintenance', color: 'amber', bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
  breakdown: { label: 'Breakdown', color: 'red', bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' },
  decommissioned: { label: 'Decommissioned', color: 'slate', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
};

export default function Machines() {
  const { t } = useTranslation();

  const [machines, setMachines] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    machineCode: '',
    name: '',
    category: 'offset_press',
    manufacturer: '',
    model: '',
    serialNumber: '',
    yearOfManufacture: '',
    hourlyCostRate: 0,
    warehouse: '',
    assignedOperators: [],
    status: 'available',
    specifications: {
      maxSheetWidthMm: '',
      maxSheetLengthMm: '',
      maxSpeedPerHour: '',
      powerRatingKw: ''
    },
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [machinesRes, statsRes, warehousesRes, employeesRes] = await Promise.allSettled([
        productionService.getMachines({
          search,
          category: categoryFilter,
          status: statusFilter
        }),
        productionService.getMachineStats(),
        productionService.getWarehouses({ limit: 100 }),
        productionService.getEmployees({ limit: 200, status: 'active' })
      ]);

      if (machinesRes.status === 'fulfilled') {
        setMachines(extractArray(machinesRes.value, 'machines'));
      } else {
        console.error('Failed to fetch machines:', machinesRes.reason);
        setError(machinesRes.reason?.message || 'Failed to load equipment list.');
      }

      if (statsRes.status === 'fulfilled') {
        setStats(extractData(statsRes.value));
      }
      if (warehousesRes.status === 'fulfilled') {
        setWarehouses(extractArray(warehousesRes.value, 'warehouses'));
      }
      if (employeesRes.status === 'fulfilled') {
        setEmployees(extractArray(employeesRes.value, 'employees'));
      }
    } catch (err) {
      console.error('Failed to fetch machines:', err);
      setError('Failed to load equipment list. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter, statusFilter]);

  const handleStatusChange = async (machineId, newStatus) => {
    try {
      await productionService.updateMachineStatus(machineId, newStatus);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update machine status');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await productionService.createMachine(formData);
      setIsCreateModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create machine');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      machineCode: '',
      name: '',
      category: 'offset_press',
      manufacturer: '',
      model: '',
      serialNumber: '',
      yearOfManufacture: '',
      hourlyCostRate: 0,
      warehouse: '',
      assignedOperators: [],
      status: 'available',
      specifications: {
        maxSheetWidthMm: '',
        maxSheetLengthMm: '',
        maxSpeedPerHour: '',
        powerRatingKw: ''
      },
      notes: ''
    });
  };

  const openDetails = (machine) => {
    setSelectedMachine(machine);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Factory className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Machine & Equipment Registry
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Plant machinery assets, specifications, operational cost rates, and real-time statuses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Register Equipment
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-700/60 rounded-lg text-slate-700 dark:text-slate-300">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Machinery</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total || 0}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Available</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.available || 0}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/60 rounded-lg text-blue-600 dark:text-blue-400">
              <Power className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Running</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.running || 0}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-lg text-amber-600 dark:text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Maintenance</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.maintenance || 0}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-lg text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Breakdown</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{stats.breakdown || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search code, model, manufacturer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="running">Running</option>
            <option value="maintenance">Maintenance</option>
            <option value="breakdown">Breakdown</option>
            <option value="decommissioned">Decommissioned</option>
          </select>
        </div>
      </div>

      {/* Machine Cards Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading equipment registry...</p>
        </div>
      ) : machines.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="No machines found"
          description="Register your offset presses, digital printers, guillotine cutters, and finishing machinery."
          actionText="Register First Machine"
          onAction={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {machines.map((machine) => {
            const st = STATUS_CONFIG[machine.status] || STATUS_CONFIG.available;
            return (
              <div
                key={machine._id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60 uppercase tracking-wide">
                        {machine.machineCode}
                      </span>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mt-1 line-clamp-1">{machine.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {machine.manufacturer} {machine.model} {machine.yearOfManufacture ? `(${machine.yearOfManufacture})` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full border ${st.bg}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* Machine Specifications */}
                  <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg p-3 text-xs space-y-1.5 mb-4 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Gauge className="w-3.5 h-3.5" /> Max Speed:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {machine.specifications?.maxSpeedPerHour
                          ? `${machine.specifications.maxSpeedPerHour.toLocaleString()} imp/hr`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Sliders className="w-3.5 h-3.5" /> Max Sheet:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {machine.specifications?.maxSheetWidthMm && machine.specifications?.maxSheetLengthMm
                          ? `${machine.specifications.maxSheetWidthMm} × ${machine.specifications.maxSheetLengthMm} mm`
                          : 'Standard'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <DollarSign className="w-3.5 h-3.5" /> Hourly Cost:
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        ETB {Number(machine.hourlyCostRate || 0).toFixed(2)}/hr
                      </span>
                    </div>
                  </div>

                  {/* Location & Operators */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-4">
                    {machine.warehouse && (
                      <p className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Location: {machine.warehouse.warehouseName}</span>
                      </p>
                    )}
                    {machine.assignedOperators && machine.assignedOperators.length > 0 && (
                      <p className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>
                          Operators: {machine.assignedOperators.map((o) => `${o.firstName} ${o.lastName}`).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mr-1">Status:</span>
                    <select
                      value={machine.status}
                      onChange={(e) => handleStatusChange(machine._id, e.target.value)}
                      className="text-xs bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none text-slate-700 dark:text-slate-200 font-medium"
                    >
                      <option value="available">Available</option>
                      <option value="running">Running</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="breakdown">Breakdown</option>
                      <option value="decommissioned">Decommission</option>
                    </select>
                  </div>
                  <button
                    onClick={() => openDetails(machine)}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Machine Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register Plant Equipment"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Equipment Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Heidelberg Speedmaster SM 74"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Equipment Code (Optional)
              </label>
              <input
                type="text"
                placeholder="Auto-generated if empty (MCH-2026-XXXX)"
                value={formData.machineCode}
                onChange={(e) => setFormData({ ...formData, machineCode: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Equipment Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hourly Operational Cost Rate (ETB/hr) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.hourlyCostRate}
                onChange={(e) => setFormData({ ...formData, hourlyCostRate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Manufacturer</label>
              <input
                type="text"
                placeholder="e.g. Heidelberg / Polar / Komori"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Model</label>
              <input
                type="text"
                placeholder="e.g. SM 74-4-H"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Serial Number</label>
              <input
                type="text"
                placeholder="Unique serial"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
              />
            </div>
          </div>

          {/* Plant Location & Operators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Plant Location / Warehouse</label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="">Select Warehouse/Floor</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.warehouseName} ({w.warehouseCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Operators</label>
              <select
                multiple
                value={formData.assignedOperators}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, (option) => option.value);
                  setFormData({ ...formData, assignedOperators: values });
                }}
                className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none h-20"
              >
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
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Hold Ctrl / Cmd to select multiple operators</p>
            </div>
          </div>

          {/* Technical Specs */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              Technical Specifications
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Max Width (mm)</label>
                <input
                  type="number"
                  placeholder="e.g. 740"
                  value={formData.specifications.maxSheetWidthMm}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, maxSheetWidthMm: e.target.value }
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Max Length (mm)</label>
                <input
                  type="number"
                  placeholder="e.g. 1020"
                  value={formData.specifications.maxSheetLengthMm}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, maxSheetLengthMm: e.target.value }
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Max Speed (imp/hr)</label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={formData.specifications.maxSpeedPerHour}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, maxSpeedPerHour: e.target.value }
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Power (kW)</label>
                <input
                  type="number"
                  placeholder="e.g. 45"
                  value={formData.specifications.powerRatingKw}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, powerRatingKw: e.target.value }
                    })
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Notes / Operating Remarks</label>
            <textarea
              rows={2}
              placeholder="Maintenance schedules, manufacturer dealer contacts, special handling..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Save Equipment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Machine Details Modal */}
      {selectedMachine && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Equipment Profile: ${selectedMachine.name}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 text-sm">
            <div className="flex justify-between items-start bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/60">
                  {selectedMachine.machineCode}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">{selectedMachine.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Category: {CATEGORIES.find((c) => c.value === selectedMachine.category)?.label || selectedMachine.category}
                </p>
              </div>
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full border ${
                  STATUS_CONFIG[selectedMachine.status]?.bg || ''
                }`}
              >
                {STATUS_CONFIG[selectedMachine.status]?.label || selectedMachine.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-slate-400 dark:text-slate-500 block">Manufacturer</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMachine.manufacturer || 'N/A'}</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-slate-400 dark:text-slate-500 block">Model</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMachine.model || 'N/A'}</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-slate-400 dark:text-slate-500 block">Serial Number</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedMachine.serialNumber || 'N/A'}</span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <span className="text-slate-400 dark:text-slate-500 block">Hourly Cost Rate</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">ETB {Number(selectedMachine.hourlyCostRate || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Checklist items configured */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                Standard Preventive Checklist Tasks
              </h4>
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">Daily Checklist:</p>
                <ul className="list-disc list-inside text-slate-600 dark:text-slate-400 pl-2">
                  {selectedMachine.checklists?.daily?.map((task, i) => (
                    <li key={i}>{task}</li>
                  )) || <li>Standard lubrication & safety guard inspection</li>}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition"
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

