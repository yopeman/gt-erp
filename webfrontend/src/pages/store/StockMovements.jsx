import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import {
  History,
  Plus,
  Search,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Eye
} from 'lucide-react';

const MOVEMENT_TYPES = [
  { value: 'purchase receipt', label: 'Purchase Receipt (GRV Inward)', inward: true },
  { value: 'stock issue', label: 'Stock Issue (SIV Outward)', inward: false },
  { value: 'stock transfer in', label: 'Transfer In (Destination)', inward: true },
  { value: 'stock transfer out', label: 'Transfer Out (Dispatch)', inward: false },
  { value: 'adjustment', label: 'Stock Adjustment (Reconciliation)', inward: null },
  { value: 'damaged', label: 'Damaged / Write-off', inward: false },
  { value: 'return', label: 'Supplier Return', inward: false }
];

export default function StockMovements() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const [movements, setMovements] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Manual Movement Form State
  const [manualForm, setManualForm] = useState({
    item: '',
    warehouse: '',
    movementType: 'purchase receipt',
    quantity: 1,
    unitCost: 0,
    reason: '',
    note: ''
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [movRes, whRes, itemsRes] = await Promise.allSettled([
        storeService.getStockMovements({
          limit: 200,
          movementType: typeFilter || undefined,
          warehouse: warehouseFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        }),
        storeService.getWarehouses({ limit: 50 }),
        storeService.getItems({ limit: 200 })
      ]);

      if (movRes.status === 'fulfilled' && movRes.value?.data) {
        setMovements(Array.isArray(movRes.value.data) ? movRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
      if (itemsRes.status === 'fulfilled' && itemsRes.value?.data) {
        const itList = Array.isArray(itemsRes.value.data) ? itemsRes.value.data : [];
        setItemsCatalog(itList);
        if (itList.length > 0 && !manualForm.item) {
          setManualForm((prev) => ({ ...prev, item: itList[0]._id, unitCost: itList[0].unitCost || 0 }));
        }
      }
    } catch (err) {
      console.error('Failed to load stock movements:', err);
      setError(err.message || 'Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, warehouseFilter, startDate, endDate]);

  // Filter movements by search string
  const filteredMovements = movements.filter((mov) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      mov.movementNumber?.toLowerCase().includes(term) ||
      mov.item?.itemName?.toLowerCase().includes(term) ||
      mov.item?.itemCode?.toLowerCase().includes(term) ||
      mov.warehouse?.warehouseName?.toLowerCase().includes(term) ||
      mov.performedBy?.fullName?.toLowerCase().includes(term)
    );
  });

  // Calculate stats
  const totalInwardUnits = movements
    .filter((m) => ['purchase receipt', 'stock transfer in'].includes(m.movementType))
    .reduce((sum, m) => sum + (m.quantity || 0), 0);

  const totalOutwardUnits = movements
    .filter((m) => ['stock issue', 'stock transfer out', 'damaged', 'return'].includes(m.movementType))
    .reduce((sum, m) => sum + (m.quantity || 0), 0);

  // Open Details Modal
  const handleOpenDetails = (mov) => {
    setSelectedMovement(mov);
    setIsDetailModalOpen(true);
  };

  // Open Manual Entry Modal
  const handleOpenManualModal = () => {
    setManualForm({
      item: itemsCatalog[0]?._id || '',
      warehouse: warehouses[0]?._id || '',
      movementType: 'purchase receipt',
      quantity: 1,
      unitCost: itemsCatalog[0]?.unitCost || 0,
      reason: '',
      note: ''
    });
    setFormError('');
    setIsManualModalOpen(true);
  };

  // Submit Manual Movement
  const handleSubmitManual = async (e) => {
    e.preventDefault();
    if (!manualForm.item || !manualForm.warehouse || !manualForm.quantity) {
      setFormError('Item, warehouse, and quantity are required.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await storeService.createStockMovement({
        ...manualForm,
        quantity: Number(manualForm.quantity),
        unitCost: Number(manualForm.unitCost || 0)
      });
      if (res.success) {
        setIsManualModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to record stock movement');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            {t('nav.storeMovements')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete transaction ledger for all receipts, issues, transfers, and adjustments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh movements"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('actions.refresh')}</span>
          </button>

          {hasRole(['admin', 'storekeeper']) && (
            <button
              onClick={handleOpenManualModal}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t('store.recordMovement')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-400 block font-semibold">{t('Total Logged')}</span>
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            {movements.length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">{t('Inward Flow')}</span>
          <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
            +{totalInwardUnits.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 block font-semibold">{t('Outward Releases')}</span>
          <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">
            -{totalOutwardUnits.toLocaleString()}
          </span>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
          <span className="text-[11px] text-slate-400 block font-semibold">{t('Active Locations')}</span>
          <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
            {warehouses.length} {t('nav.warehouses')}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search movement #, item, warehouse, staff...')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('All Movement Types')}</option>
            {MOVEMENT_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {t(m.label)}
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

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            title={t('common.startDate')}
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            title={t('common.endDate')}
          />
        </div>
      </div>

      {/* Movements Ledger Table & Deck */}
      <div className="w-full">
        {filteredMovements.length === 0 ? (
          <EmptyState
            title="No Movement Logs Found"
            description="All stock entries, issues, transfers, and adjustments are automatically audited here."
            icon={History}
          />
        ) : (
          <>
            {/* Mobile View: Card Deck */}
            <div className="block md:hidden space-y-3">
              {filteredMovements.map((mov) => {
                const isInward = ['purchase receipt', 'stock transfer in', 'adjustment'].includes(mov.movementType);

                return (
                  <div
                    key={mov._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-primary-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isInward
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                          }`}
                        >
                          {isInward ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {mov.item?.itemName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {mov.item?.itemCode}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`text-xs font-black ${
                          isInward ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {isInward ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.item?.unitOfMeasurement || ''}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2 text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400">Type:</span>{' '}
                        <span className="font-semibold uppercase text-primary-500">{mov.movementType}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Warehouse:</span>{' '}
                        <span>{mov.warehouse?.warehouseName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Date:</span>{' '}
                        <span>{formatDate(mov.movementDate || mov.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Staff:</span>{' '}
                        <span>{mov.performedBy?.fullName || 'System'}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end border-t border-slate-100 dark:border-slate-700/60 pt-2">
                      <button
                        onClick={() => handleOpenDetails(mov)}
                        className="px-2.5 py-1 text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Audit Trail</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Structured Ledger Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">{t('Movement #')}</th>
                    <th className="px-4 py-3">{t('table.timestamp')}</th>
                    <th className="px-4 py-3">{t('table.warehouse')}</th>
                    <th className="px-4 py-3">{t('SKU & Item')}</th>
                    <th className="px-4 py-3">{t('Transaction Type')}</th>
                    <th className="px-4 py-3 text-center">{t('table.quantity')}</th>
                    <th className="px-4 py-3 text-right">{t('table.unitPrice')}</th>
                    <th className="px-4 py-3 text-right">{t('Total Valuation')}</th>
                    <th className="px-4 py-3">{t('Logged By')}</th>
                    <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredMovements.map((mov) => {
                    const isInward = ['purchase receipt', 'stock transfer in', 'adjustment'].includes(mov.movementType);
                    const totalCost = (mov.quantity || 0) * (mov.unitCost || 0);

                    return (
                      <tr
                        key={mov._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {mov.movementNumber}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(mov.movementDate || mov.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-semibold">
                          {mov.warehouse?.warehouseName}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {mov.item?.itemName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {mov.item?.itemCode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isInward
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                            }`}
                          >
                            {t(mov.movementType)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`font-black ${
                              isInward ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {isInward ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.item?.unitOfMeasurement || ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-400">
                          {formatCurrency(mov.unitCost)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(totalCost)}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {mov.performedBy?.fullName || 'System'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleOpenDetails(mov)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title={t('actions.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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

      {/* Movement Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedMovement ? `Movement Audit: ${selectedMovement.movementNumber}` : 'Movement Audit'}
        maxWidth="max-w-lg"
      >
        {selectedMovement && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60">
              <div>
                <span className="text-slate-400 block text-[10px]">Item</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedMovement.item?.itemName} ({selectedMovement.item?.itemCode})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Warehouse</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedMovement.warehouse?.warehouseName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Movement Type</span>
                <span className="font-bold uppercase text-primary-500">
                  {selectedMovement.movementType}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Quantity</span>
                <span className="font-black text-slate-900 dark:text-slate-100">
                  {selectedMovement.quantity} {selectedMovement.item?.unitOfMeasurement}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Reference Type</span>
                <span className="font-semibold capitalize">
                  {selectedMovement.referenceType || 'Manual'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Recorded Date</span>
                <span>{formatDate(selectedMovement.movementDate || selectedMovement.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Performed By</span>
                <span>{selectedMovement.performedBy?.fullName || selectedMovement.performedBy?.email || 'System'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Approved By</span>
                <span>{selectedMovement.approvedBy?.fullName || '-'}</span>
              </div>
            </div>

            {(selectedMovement.reason || selectedMovement.note) && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                {selectedMovement.reason && (
                  <div>
                    <span className="text-slate-400 font-semibold">Reason:</span> {selectedMovement.reason}
                  </div>
                )}
                {selectedMovement.note && (
                  <div>
                    <span className="text-slate-400 font-semibold">Note:</span> {selectedMovement.note}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manual Movement Form Modal */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        title={t('store.recordMovement')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitManual} className="space-y-4 text-xs">
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
                value={manualForm.warehouse}
                onChange={(e) => setManualForm({ ...manualForm, warehouse: e.target.value })}
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
                Movement Type *
              </label>
              <select
                required
                value={manualForm.movementType}
                onChange={(e) => setManualForm({ ...manualForm, movementType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {MOVEMENT_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Item *
              </label>
              <select
                required
                value={manualForm.item}
                onChange={(e) => {
                  const it = itemsCatalog.find((i) => i._id === e.target.value);
                  setManualForm({
                    ...manualForm,
                    item: e.target.value,
                    unitCost: it ? it.unitCost || 0 : 0
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {itemsCatalog.map((it) => (
                  <option key={it._id} value={it._id}>
                    {it.itemName} ({it.itemCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={manualForm.quantity}
                onChange={(e) => setManualForm({ ...manualForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unit Cost (ETB)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={manualForm.unitCost}
                onChange={(e) => setManualForm({ ...manualForm, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Reason / Memo
            </label>
            <input
              type="text"
              value={manualForm.reason}
              onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
              placeholder="e.g. Manual intake of sample materials from supplier"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Recording...' : 'Commit Movement & Update Stock'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
