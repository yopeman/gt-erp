import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Repeat,
  Plus,
  Search,
  CheckCircle2,
  Printer,
  RefreshCw,
  ArrowRight,
  Truck,
  PackageCheck,
  Trash2
} from 'lucide-react';

export default function StockTransfers() {
  const { t } = useTranslation();
  const { hasRole } = useAuth();

  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [destFilter, setDestFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Create Form State
  const [formData, setFormData] = useState({
    sourceWarehouse: '',
    destinationWarehouse: '',
    note: '',
    items: [{ item: '', requestedQuantity: 1, note: '' }]
  });

  // Action states
  const [receiveItems, setReceiveItems] = useState([]);
  const [actionNote, setActionNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [trfRes, whRes, itemsRes] = await Promise.allSettled([
        storeService.getStockTransfers({ limit: 150 }),
        storeService.getWarehouses({ limit: 50 }),
        storeService.getItems({ limit: 200 })
      ]);

      if (trfRes.status === 'fulfilled' && trfRes.value?.data) {
        setTransfers(Array.isArray(trfRes.value.data) ? trfRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        const whList = Array.isArray(whRes.value.data) ? whRes.value.data : [];
        setWarehouses(whList);
        if (whList.length >= 2 && !formData.sourceWarehouse) {
          setFormData((prev) => ({
            ...prev,
            sourceWarehouse: whList[0]._id,
            destinationWarehouse: whList[1]._id
          }));
        }
      }
      if (itemsRes.status === 'fulfilled' && itemsRes.value?.data) {
        setItemsCatalog(Array.isArray(itemsRes.value.data) ? itemsRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load stock transfers:', err);
      setError(err.message || 'Failed to load stock transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter transfers
  const filteredTransfers = transfers.filter((trf) => {
    const matchesSearch =
      !search ||
      trf.transferNumber?.toLowerCase().includes(search.toLowerCase()) ||
      trf.sourceWarehouse?.warehouseName?.toLowerCase().includes(search.toLowerCase()) ||
      trf.destinationWarehouse?.warehouseName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || trf.status === statusFilter;
    const matchesSource = !sourceFilter || (trf.sourceWarehouse?._id || trf.sourceWarehouse) === sourceFilter;
    const matchesDest = !destFilter || (trf.destinationWarehouse?._id || trf.destinationWarehouse) === destFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesDest;
  });

  // Open Create Transfer
  const handleOpenCreateModal = () => {
    setFormData({
      sourceWarehouse: warehouses[0]?._id || '',
      destinationWarehouse: warehouses[1]?._id || '',
      note: '',
      items: [{ item: itemsCatalog[0]?._id || '', requestedQuantity: 1, note: '' }]
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Add Item Row
  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { item: itemsCatalog[0]?._id || '', requestedQuantity: 1, note: '' }]
    }));
  };

  // Remove Item Row
  const handleRemoveItemRow = (idx) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  // Submit Create Transfer
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!formData.sourceWarehouse || !formData.destinationWarehouse) {
      setFormError('Source and destination warehouses are required.');
      return;
    }
    if (formData.sourceWarehouse === formData.destinationWarehouse) {
      setFormError('Source and destination warehouses cannot be the same location.');
      return;
    }
    if (formData.items.length === 0) {
      setFormError('At least one item must be transferred.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await storeService.createStockTransfer(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create stock transfer');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Transfer
  const handleApprove = async (trf) => {
    if (!window.confirm(`Authorize transfer ${trf.transferNumber}?`)) return;
    setSubmitting(true);
    try {
      await storeService.approveStockTransfer(trf._id, { comment: 'Transfer authorized' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to approve transfer');
    } finally {
      setSubmitting(false);
    }
  };

  // Dispatch Transfer (Goods leave source warehouse into transit)
  const handleDispatch = async (trf) => {
    if (!window.confirm(`Dispatch transfer ${trf.transferNumber}? Items will be deducted from ${trf.sourceWarehouse?.warehouseName} and marked In Transit.`)) return;
    setSubmitting(true);
    try {
      await storeService.dispatchStockTransfer(trf._id, {});
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to dispatch transfer');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receive Modal (Goods arrive at destination)
  const handleOpenReceiveModal = (trf) => {
    setSelectedTransfer(trf);
    setActionNote('');
    setReceiveItems(
      (trf.items || []).map((i) => ({
        itemId: i._id,
        itemRef: i.item,
        itemName: i.item?.itemName || 'Item',
        itemCode: i.item?.itemCode || '',
        transferredQuantity: i.transferredQuantity || i.approvedQuantity || i.requestedQuantity,
        receivedQuantity: i.transferredQuantity || i.approvedQuantity || i.requestedQuantity
      }))
    );
    setFormError('');
    setIsReceiveModalOpen(true);
  };

  // Submit Receive Transfer
  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        receivedItems: receiveItems.map((ri) => ({
          itemId: ri.itemId,
          receivedQuantity: Number(ri.receivedQuantity)
        })),
        note: actionNote
      };

      const res = await storeService.receiveStockTransfer(selectedTransfer._id, payload);
      if (res.success) {
        setIsReceiveModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to confirm receipt of transfer');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Printable Waybill
  const handleOpenPrintModal = (trf) => {
    setSelectedTransfer(trf);
    setIsPrintModalOpen(true);
  };

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
            {t('store.storeTransfers')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Inter-warehouse stock movements, in-transit dispatch, and destination intake
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh transfers"
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
              <span>{t('store.createTransfer')}</span>
            </button>
          )}
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
            placeholder={t('Search transfer #, source or destination warehouse...')}
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
            <option value="approved">{t('Approved (Ready to Dispatch)')}</option>
            <option value="in transit">{t('In Transit')}</option>
            <option value="completed">{t('Completed')}</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('All Sources')}</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {t('From')}: {w.warehouseName}
              </option>
            ))}
          </select>

          <select
            value={destFilter}
            onChange={(e) => setDestFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('All Destinations')}</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {t('To')}: {w.warehouseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transfers List */}
      <div className="w-full">
        {filteredTransfers.length === 0 ? (
          <EmptyState
            title="No Stock Transfers Found"
            description="Initiate an inter-warehouse material relocation to balance inventory across locations."
            icon={Repeat}
            actionLabel={hasRole(['admin', 'storekeeper']) ? 'Create First Transfer' : undefined}
            onAction={handleOpenCreateModal}
          />
        ) : (
          <>
            {/* Mobile View: Card Deck */}
            <div className="block md:hidden space-y-3">
              {filteredTransfers.map((trf) => {
                const canApprove = trf.status === 'pending' && hasRole(['admin', 'manager', 'storekeeper']);
                const canDispatch = trf.status === 'approved' && hasRole(['admin', 'storekeeper']);
                const canReceive = trf.status === 'in transit' && hasRole(['admin', 'storekeeper']);

                return (
                  <div
                    key={trf._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-primary-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {trf.transferNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {formatDate(trf.transferDate || trf.createdAt)}
                        </div>
                      </div>
                      <Badge status={trf.status || 'pending'} size="xs" />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/60">
                      <div>
                        <span className="text-[10px] text-slate-400 block">From</span>
                        <span className="font-bold">{trf.sourceWarehouse?.warehouseName}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-primary-500" />
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">To</span>
                        <span className="font-bold">{trf.destinationWarehouse?.warehouseName}</span>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-slate-500">
                      <span>Items: {trf.items?.length || 0} line items</span>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                      <button
                        onClick={() => handleOpenPrintModal(trf)}
                        className="px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Waybill</span>
                      </button>

                      {canApprove && (
                        <button
                          onClick={() => handleApprove(trf)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center gap-1 font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {canDispatch && (
                        <button
                          onClick={() => handleDispatch(trf)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex items-center gap-1 font-bold"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
                        </button>
                      )}

                      {canReceive && (
                        <button
                          onClick={() => handleOpenReceiveModal(trf)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 font-bold"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Confirm Intake</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Responsive Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">{t('Transfer #')}</th>
                    <th className="px-4 py-3">{t('Source Warehouse')}</th>
                    <th className="px-4 py-3">{t('Destination Warehouse')}</th>
                    <th className="px-4 py-3 text-center">{t('Items Count')}</th>
                    <th className="px-4 py-3">{t('table.date')}</th>
                    <th className="px-4 py-3 text-center">{t('table.status')}</th>
                    <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredTransfers.map((trf) => {
                    const canApprove = trf.status === 'pending' && hasRole(['admin', 'manager', 'storekeeper']);
                    const canDispatch = trf.status === 'approved' && hasRole(['admin', 'storekeeper']);
                    const canReceive = trf.status === 'in transit' && hasRole(['admin', 'storekeeper']);

                    return (
                      <tr
                        key={trf._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {trf.transferNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {trf.sourceWarehouse?.warehouseName}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {trf.destinationWarehouse?.warehouseName}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {trf.items?.length || 0}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-medium">
                          {formatDate(trf.transferDate || trf.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge status={trf.status || 'pending'} text={t(trf.status)} size="xs" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPrintModal(trf)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title={t('Waybill')}
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {canApprove && (
                              <button
                                onClick={() => handleApprove(trf)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition text-[11px] font-bold"
                              >
                                {t('actions.approve')}
                              </button>
                            )}

                            {canDispatch && (
                              <button
                                onClick={() => handleDispatch(trf)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition text-[11px] font-bold flex items-center gap-1"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>{t('Dispatch')}</span>
                              </button>
                            )}

                            {canReceive && (
                              <button
                                onClick={() => handleOpenReceiveModal(trf)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition text-[11px] font-bold flex items-center gap-1"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>{t('Confirm Intake')}</span>
                              </button>
                            )}
                          </div>
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

      {/* Create Transfer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('store.createTransfer')}
        maxWidth="max-w-2xl"
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
                Source Warehouse (From) *
              </label>
              <select
                required
                value={formData.sourceWarehouse}
                onChange={(e) => setFormData({ ...formData, sourceWarehouse: e.target.value })}
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
                Destination Warehouse (To) *
              </label>
              <select
                required
                value={formData.destinationWarehouse}
                onChange={(e) => setFormData({ ...formData, destinationWarehouse: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.warehouseName} ({w.warehouseCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Items to Transfer
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 text-[11px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2">Select Item</th>
                    <th className="px-3 py-2 text-center">Transfer Quantity</th>
                    <th className="px-2 py-2 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {formData.items.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select
                          required
                          value={row.item}
                          onChange={(e) => {
                            const updated = [...formData.items];
                            updated[idx].item = e.target.value;
                            setFormData({ ...formData, items: updated });
                          }}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          {itemsCatalog.map((it) => (
                            <option key={it._id} value={it._id}>
                              {it.itemName} ({it.itemCode})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.requestedQuantity}
                          onChange={(e) => {
                            const updated = [...formData.items];
                            updated[idx].requestedQuantity = Number(e.target.value);
                            setFormData({ ...formData, items: updated });
                          }}
                          className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transfer Note / Vehicle Details
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="e.g. Relocating paper stock for tomorrow's large Heidelberg press print run"
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
              {submitting ? 'Creating...' : 'Initialize Transfer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Intake Modal (Destination Storekeeper) */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title={selectedTransfer ? `Confirm Receipt: ${selectedTransfer.transferNumber}` : 'Confirm Receipt'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitReceive} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            Confirming will mark transfer as completed and increase stock in destination warehouse{' '}
            <strong>{selectedTransfer?.destinationWarehouse?.warehouseName}</strong>.
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-center">Transferred</th>
                  <th className="px-3 py-2 text-center">Received *</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {receiveItems.map((ri, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{ri.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ri.itemCode}</div>
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-600 dark:text-slate-300">
                      {ri.transferredQuantity}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max={ri.transferredQuantity}
                        value={ri.receivedQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...receiveItems];
                          updated[idx].receivedQuantity = val;
                          setReceiveItems(updated);
                        }}
                        className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Arrival Notes
            </label>
            <textarea
              rows={2}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Package condition, seal number, driver remarks"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsReceiveModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Confirming...' : 'Confirm Intake into Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Transfer Waybill Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Inter-Warehouse Transfer Waybill"
        maxWidth="max-w-3xl"
      >
        {selectedTransfer && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-slate-100">
            <div id="printable-waybill" className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-6 print:border-none print:p-0">
              <div className="flex items-center justify-between border-b-2 border-primary-500 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/gt-logo.jpg"
                    alt="GT Logo"
                    className="h-12 w-12 rounded-xl object-contain border border-slate-200"
                  />
                  <div>
                    <h2 className="text-base font-black text-primary-500 tracking-tight">
                      GT PRINTING PRESS
                    </h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Enterprise ERP • Inter-Warehouse Logistics
                    </p>
                    <p className="text-[10px] text-slate-400">Addis Ababa, Ethiopia</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black uppercase bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-lg border border-primary-500/20 inline-block">
                    TRANSFER WAYBILL / DISPATCH NOTE
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedTransfer.transferNumber}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Source Store (From)</span>
                  <span className="font-bold">{selectedTransfer.sourceWarehouse?.warehouseName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Destination Store (To)</span>
                  <span className="font-bold">{selectedTransfer.destinationWarehouse?.warehouseName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date</span>
                  <span className="font-bold">{formatDate(selectedTransfer.transferDate || selectedTransfer.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span className="font-bold uppercase text-emerald-600">{selectedTransfer.status}</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2">Item Code</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-center">Requested</th>
                      <th className="px-3 py-2 text-center">Transferred</th>
                      <th className="px-3 py-2 text-center">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {(selectedTransfer.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-mono font-bold">{it.item?.itemCode || '-'}</td>
                        <td className="px-3 py-2 font-semibold">{it.item?.itemName || 'Item'}</td>
                        <td className="px-3 py-2 text-center">{it.item?.unitOfMeasurement || 'pcs'}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{it.requestedQuantity}</td>
                        <td className="px-3 py-2 text-center font-bold text-indigo-600">{it.transferredQuantity || it.approvedQuantity || 0}</td>
                        <td className="px-3 py-2 text-center font-bold text-emerald-600">{it.receivedQuantity || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                <div className="space-y-6">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Dispatching Storekeeper
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-4" />
                  <div className="text-[10px] text-slate-400">Sign & Date</div>
                </div>

                <div className="space-y-6">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Driver / Transporter
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-4" />
                  <div className="text-[10px] text-slate-400">Sign & Date</div>
                </div>

                <div className="space-y-6">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Receiving Storekeeper
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-4" />
                  <div className="text-[10px] text-slate-400">Sign & Date</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Transfer Waybill</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
