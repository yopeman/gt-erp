import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  SlidersHorizontal,
  Plus,
  Search,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  TrendingUp
} from 'lucide-react';

const ADJUSTMENT_REASONS = [
  { value: 'counting error', label: 'Periodic Physical Count Discrepancy' },
  { value: 'damaged', label: 'Damaged / Water Leaks / Handling' },
  { value: 'expired', label: 'Expired Chemical / Dry Inks' },
  { value: 'lost', label: 'Shrinkage / Missing Units' },
  { value: 'other', label: 'Other Operational Adjustment' }
];

export default function StockAdjustments() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const [adjustments, setAdjustments] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [balances, setBalances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    warehouse: '',
    item: '',
    systemQuantity: 0,
    physicalQuantity: 0,
    reason: 'counting error',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [adjRes, whRes, itemsRes, balRes] = await Promise.allSettled([
        storeService.getStockAdjustments({ limit: 150 }),
        storeService.getWarehouses({ limit: 50 }),
        storeService.getItems({ limit: 200 }),
        storeService.getStockBalances({ limit: 300 })
      ]);

      if (adjRes.status === 'fulfilled' && adjRes.value?.data) {
        setAdjustments(Array.isArray(adjRes.value.data) ? adjRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        const whList = Array.isArray(whRes.value.data) ? whRes.value.data : [];
        setWarehouses(whList);
        if (whList.length > 0 && !formData.warehouse) {
          setFormData((prev) => ({ ...prev, warehouse: whList[0]._id }));
        }
      }
      if (itemsRes.status === 'fulfilled' && itemsRes.value?.data) {
        const itList = Array.isArray(itemsRes.value.data) ? itemsRes.value.data : [];
        setItemsCatalog(itList);
        if (itList.length > 0 && !formData.item) {
          setFormData((prev) => ({ ...prev, item: itList[0]._id }));
        }
      }
      if (balRes.status === 'fulfilled' && balRes.value?.data) {
        setBalances(Array.isArray(balRes.value.data) ? balRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load stock adjustments:', err);
      setError(err.message || 'Failed to load adjustments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update current system qty whenever warehouse or item changes
  const updateSystemQty = (whId, itId) => {
    const match = balances.find(
      (b) =>
        (b.warehouse?._id || b.warehouse) === whId &&
        (b.item?._id || b.item) === itId
    );
    const qty = match ? match.quantityOnHand : 0;
    setFormData((prev) => ({
      ...prev,
      warehouse: whId,
      item: itId,
      systemQuantity: qty,
      physicalQuantity: qty
    }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    const defaultWh = warehouses[0]?._id || '';
    const defaultItem = itemsCatalog[0]?._id || '';
    const match = balances.find(
      (b) =>
        (b.warehouse?._id || b.warehouse) === defaultWh &&
        (b.item?._id || b.item) === defaultItem
    );
    const sysQty = match ? match.quantityOnHand : 0;

    setFormData({
      warehouse: defaultWh,
      item: defaultItem,
      systemQuantity: sysQty,
      physicalQuantity: sysQty,
      reason: 'counting error',
      description: ''
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Submit Create Adjustment
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!formData.warehouse || !formData.item) {
      setFormError('Warehouse and item are required.');
      return;
    }
    if (formData.physicalQuantity === formData.systemQuantity) {
      setFormError('Physical count is identical to system balance; no discrepancy exists.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await storeService.createStockAdjustment({
        ...formData,
        physicalQuantity: Number(formData.physicalQuantity),
        systemQuantity: Number(formData.systemQuantity)
      });
      if (res.success) {
        setIsCreateModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Adjustment (Reconcile variance)
  const handleApprove = async (adj, approved) => {
    const actionLabel = approved ? 'Approve & Reconcile' : 'Reject';
    if (!window.confirm(`${actionLabel} adjustment ${adj.adjustmentNumber}?`)) return;

    setSubmitting(true);
    try {
      await storeService.approveStockAdjustment(adj._id, {
        approved,
        comment: approved ? 'Discrepancy reconciled with physical inventory' : 'Discrepancy rejected by store head'
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to process adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter adjustments
  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesSearch =
      !search ||
      adj.adjustmentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      adj.item?.itemName?.toLowerCase().includes(search.toLowerCase()) ||
      adj.item?.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
      adj.warehouse?.warehouseName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || adj.status === statusFilter;
    const matchesReason = !reasonFilter || adj.reason === reasonFilter;
    const matchesWarehouse = !warehouseFilter || (adj.warehouse?._id || adj.warehouse) === warehouseFilter;

    return matchesSearch && matchesStatus && matchesReason && matchesWarehouse;
  });

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('nav.storeAdjustments')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Physical stock count reconciliation, variance adjustments, and audit authorization
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh adjustments"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('actions.refresh')}</span>
          </button>

          {hasRole(['admin', 'storekeeper']) && (
            <button
              onClick={handleOpenCreateModal}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('store.createAdjustment')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search adjustment #, item name, code, warehouse...')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('All Statuses')}</option>
            <option value="pending">{t('Pending Approval')}</option>
            <option value="approved">{t('Approved & Reconciled')}</option>
            <option value="rejected">{t('Rejected')}</option>
          </select>

          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('All Discrepancy Reasons')}</option>
            {ADJUSTMENT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.label)}
              </option>
            ))}
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('All Warehouses')}</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.warehouseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Adjustments List */}
      <div className="w-full">
        {filteredAdjustments.length === 0 ? (
          <EmptyState
            title="No Adjustments Recorded"
            description="Record physical inventory count differences to reconcile book stock with actual shelf balances."
            icon={SlidersHorizontal}
            actionLabel={hasRole(['admin', 'storekeeper']) ? 'New Adjustment' : undefined}
            onAction={handleOpenCreateModal}
          />
        ) : (
          <>
            {/* Mobile View: Card Deck */}
            <div className="block md:hidden space-y-3">
              {filteredAdjustments.map((adj) => {
                const isSurplus = adj.difference > 0;
                const canApprove = adj.status === 'pending' && hasRole(['admin', 'manager', 'storekeeper']);

                return (
                  <div
                    key={adj._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-primary-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {adj.adjustmentNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {adj.warehouse?.warehouseName} • {formatDate(adj.adjustmentDate || adj.createdAt)}
                        </div>
                      </div>
                      <Badge status={adj.status || 'pending'} size="xs" />
                    </div>

                    <div className="mt-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {adj.item?.itemName} <span className="font-mono text-slate-400">({adj.item?.itemCode})</span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-1 text-center bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">System</span>
                        <span className="font-bold">{adj.systemQuantity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Physical</span>
                        <span className="font-bold">{adj.physicalQuantity}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Variance</span>
                        <span
                          className={`font-black flex items-center justify-center gap-0.5 ${
                            isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isSurplus ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isSurplus ? `+${adj.difference}` : adj.difference}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">Reason:</span>{' '}
                      <span className="capitalize">{adj.reason}</span>
                    </div>

                    {canApprove && (
                      <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                        <button
                          onClick={() => handleApprove(adj, false)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApprove(adj, true)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Reconcile</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">{t('Adjustment #')}</th>
                    <th className="px-4 py-3">{t('table.warehouse')}</th>
                    <th className="px-4 py-3">{t('table.item')}</th>
                    <th className="px-4 py-3 text-center">{t('System Qty')}</th>
                    <th className="px-4 py-3 text-center">{t('Physical Count')}</th>
                    <th className="px-4 py-3 text-center">{t('Variance / Difference')}</th>
                    <th className="px-4 py-3">{t('table.reason')}</th>
                    <th className="px-4 py-3 text-center">{t('table.status')}</th>
                    <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredAdjustments.map((adj) => {
                    const isSurplus = adj.difference > 0;
                    const canApprove = adj.status === 'pending' && hasRole(['admin', 'manager', 'storekeeper']);

                    return (
                      <tr
                        key={adj._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {adj.adjustmentNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                          {adj.warehouse?.warehouseName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {adj.item?.itemName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {adj.item?.itemCode}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-500 font-bold">
                          {adj.systemQuantity}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-slate-100">
                          {adj.physicalQuantity}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 font-black ${
                              isSurplus
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isSurplus ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                            {isSurplus ? `+${adj.difference}` : adj.difference} {adj.item?.unitOfMeasurement || ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 capitalize">
                          {t(adj.reason)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge status={adj.status || 'pending'} text={t(adj.status)} size="xs" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canApprove && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApprove(adj, false)}
                                className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold"
                              >
                                {t('actions.reject')}
                              </button>
                              <button
                                onClick={() => handleApprove(adj, true)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-[11px] font-bold flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('Approve & Reconcile')}</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Create Adjustment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('store.createAdjustment')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Warehouse *
              </label>
              <select
                required
                value={formData.warehouse}
                onChange={(e) => updateSystemQty(e.target.value, formData.item)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.warehouseName} ({w.warehouseCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Inventory Item *
              </label>
              <select
                required
                value={formData.item}
                onChange={(e) => updateSystemQty(formData.warehouse, e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {itemsCatalog.map((it) => (
                  <option key={it._id} value={it._id}>
                    {it.itemName} ({it.itemCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Counts Comparison Box */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 grid grid-cols-3 gap-3 text-center">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">
                System Qty
              </span>
              <span className="text-base font-bold text-slate-700 dark:text-slate-300">
                {formData.systemQuantity}
              </span>
            </div>

            <div>
              <label className="text-[11px] text-slate-700 dark:text-slate-300 block font-bold mb-1">
                Physical Count *
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.physicalQuantity}
                onChange={(e) => setFormData({ ...formData, physicalQuantity: Number(e.target.value) })}
                className="w-24 px-2 py-1 text-center font-black text-sm rounded-lg border border-primary-500 bg-white dark:bg-slate-800"
              />
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block font-semibold">
                Variance
              </span>
              <span
                className={`text-base font-black ${
                  formData.physicalQuantity - formData.systemQuantity > 0
                    ? 'text-emerald-600'
                    : formData.physicalQuantity - formData.systemQuantity < 0
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              >
                {formData.physicalQuantity - formData.systemQuantity > 0 ? '+' : ''}
                {formData.physicalQuantity - formData.systemQuantity}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Discrepancy Reason *
            </label>
            <select
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Detailed Justification / Root Cause
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. 5 reams damaged due to roof leak during rainy season; inspected by Storekeeper"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
