import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Warehouse as WarehouseIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  MapPin,
  Phone,
  User
} from 'lucide-react';

export default function Warehouses() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const [warehouses, setWarehouses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);

  // Form State
  const initialForm = {
    warehouseName: '',
    warehouseCode: '',
    description: '',
    branch: 'Addis Ababa Main',
    location: '',
    manager: '',
    contactPerson: '',
    phoneNumber: '',
    status: 'active'
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [whRes, balRes, empRes] = await Promise.allSettled([
        storeService.getWarehouses({ limit: 100 }),
        storeService.getStockBalances({ limit: 500 }),
        storeService.getEmployees({ limit: 200 })
      ]);

      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
      if (balRes.status === 'fulfilled' && balRes.value?.data) {
        setBalances(Array.isArray(balRes.value.data) ? balRes.value.data : []);
      }
      if (empRes.status === 'fulfilled' && empRes.value?.data) {
        setEmployees(Array.isArray(empRes.value.data) ? empRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load warehouses:', err);
      setError(err.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter warehouses
  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch =
      !search ||
      wh.warehouseName?.toLowerCase().includes(search.toLowerCase()) ||
      wh.warehouseCode?.toLowerCase().includes(search.toLowerCase()) ||
      wh.location?.toLowerCase().includes(search.toLowerCase()) ||
      wh.contactPerson?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || wh.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Open Create
  const handleOpenCreate = () => {
    setEditingWarehouse(null);
    setFormData(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (wh) => {
    setEditingWarehouse(wh);
    setFormData({
      warehouseName: wh.warehouseName || '',
      warehouseCode: wh.warehouseCode || '',
      description: wh.description || '',
      branch: wh.branch || 'Addis Ababa Main',
      location: wh.location || '',
      manager: wh.manager?._id || wh.manager || '',
      contactPerson: wh.contactPerson || '',
      phoneNumber: wh.phoneNumber || '',
      status: wh.status || 'active'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit Save
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.warehouseName.trim() || !formData.warehouseCode.trim()) {
      setFormError('Warehouse name and warehouse code are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        ...formData,
        manager: formData.manager || null
      };

      if (editingWarehouse) {
        const res = await storeService.updateWarehouse(editingWarehouse._id, payload);
        if (res.success) {
          setIsModalOpen(false);
          fetchData();
        }
      } else {
        const res = await storeService.createWarehouse(payload);
        if (res.success) {
          setIsModalOpen(false);
          fetchData();
        }
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / Deactivate
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete/deactivate this warehouse?')) return;
    try {
      await storeService.deleteWarehouse(id);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete warehouse');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('store.storeWarehouses')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Physical storage facilities, branches, location managers, and live capacity tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh warehouses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('actions.refresh')}</span>
          </button>

          {hasRole(['admin', 'storekeeper']) && (
            <button
              onClick={handleOpenCreate}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('store.createWarehouse')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
          <span>{error}</span>
          <button onClick={fetchData} className="font-bold underline ml-2">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search warehouse name, code, address, contact person...')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('All Statuses')}</option>
            <option value="active">{t('Active Only')}</option>
            <option value="inactive">{t('Inactive Only')}</option>
          </select>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="w-full">
        {filteredWarehouses.length === 0 ? (
          <EmptyState
            title="No Warehouses Found"
            description="Register physical warehouses or storage units to manage inventory balances."
            icon={WarehouseIcon}
            actionLabel={hasRole(['admin', 'storekeeper']) ? 'Add First Warehouse' : undefined}
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWarehouses.map((wh) => {
              const whBalances = balances.filter(
                (b) => (b.warehouse?._id || b.warehouse) === wh._id
              );
              const totalItems = whBalances.length;
              const totalUnits = whBalances.reduce((sum, b) => sum + (b.quantityOnHand || 0), 0);
              const totalValuation = whBalances.reduce((sum, b) => {
                const cost = b.item?.unitCost || 0;
                return sum + ((b.quantityOnHand || 0) * cost);
              }, 0);

              return (
                <div
                  key={wh._id}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-primary-500/50 hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-500 flex items-center justify-center font-bold shrink-0">
                          <WarehouseIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {wh.warehouseName}
                          </h3>
                          <div className="text-[11px] font-mono text-slate-400">
                            {wh.warehouseCode} {wh.branch ? `• ${wh.branch}` : ''}
                          </div>
                        </div>
                      </div>

                      <Badge status={wh.status || 'active'} size="xs" />
                    </div>

                    {wh.description && (
                      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {wh.description}
                      </p>
                    )}

                    <div className="mt-4 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {wh.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{wh.location}</span>
                        </div>
                      )}
                      {(wh.manager || wh.contactPerson) && (
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Manager: {wh.manager?.fullName || wh.contactPerson}</span>
                        </div>
                      )}
                      {wh.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{wh.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <span className="text-[10px] text-slate-400 block font-semibold">{t('SKUs Stored')}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <span className="text-[10px] text-slate-400 block font-semibold">{t('Stock Quantity')}</span>
                        <span className="font-black text-primary-600 dark:text-primary-400">{totalUnits.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">{t('Valuation')}: {formatCurrency(totalValuation)}</span>
                      {hasRole(['admin', 'storekeeper']) && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(wh)}
                            className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition"
                            title={t('actions.edit')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(wh._id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title={t('actions.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Warehouse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWarehouse ? 'Edit Warehouse' : t('store.createWarehouse')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Warehouse Name *
              </label>
              <input
                type="text"
                required
                value={formData.warehouseName}
                onChange={(e) => setFormData({ ...formData, warehouseName: e.target.value })}
                placeholder="e.g. Main Raw Material Store"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Warehouse Code *
              </label>
              <input
                type="text"
                required
                value={formData.warehouseCode}
                onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value })}
                placeholder="e.g. WH-MAIN"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Branch Location
              </label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                placeholder="e.g. Addis Ababa Main Press"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Specific Physical Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Building B, Ground Floor"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Warehouse Manager
              </label>
              <select
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="">Select Employee Manager</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.fullName} ({emp.position || emp.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Abebe Bikila"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+251 91 123 4567"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Dedicated climate-controlled warehouse for coated art papers and inks"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Saving...' : t('actions.save')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
