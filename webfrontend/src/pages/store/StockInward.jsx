import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  ArrowDownToLine,
  Plus,
  Search,
  CheckCircle2,
  Printer,
  RefreshCw
} from 'lucide-react';

export default function StockInward() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();

  const [receipts, setReceipts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Form State for New GRV
  const [formData, setFormData] = useState({
    purchaseOrder: '',
    supplier: '',
    warehouse: '',
    supplierDeliveryNoteNumber: '',
    supplierInvoiceNumber: '',
    receiptDate: new Date().toISOString().split('T')[0],
    note: '',
    items: []
  });

  // Inspection form state
  const [inspectionItems, setInspectionItems] = useState([]);
  const [inspectionNote, setInspectionNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [grvRes, poRes, whRes, supRes] = await Promise.allSettled([
        storeService.getGoodsReceipts({ limit: 150 }),
        storeService.getPurchaseOrders({ limit: 100 }),
        storeService.getWarehouses({ limit: 50 }),
        storeService.getSuppliers({ limit: 100 })
      ]);

      if (grvRes.status === 'fulfilled' && grvRes.value?.data) {
        setReceipts(Array.isArray(grvRes.value.data) ? grvRes.value.data : []);
      }
      if (poRes.status === 'fulfilled' && poRes.value?.data) {
        setPurchaseOrders(Array.isArray(poRes.value.data) ? poRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
      if (supRes.status === 'fulfilled' && supRes.value?.data) {
        setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load goods receipts:', err);
      setError(err.message || 'Failed to load goods receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When PO is selected in New GRV, autofill supplier, warehouse, and items
  const handleSelectPO = (poId) => {
    const po = purchaseOrders.find((p) => p._id === poId);
    if (!po) {
      setFormData((prev) => ({ ...prev, purchaseOrder: '' }));
      return;
    }

    const poItems = (po.items || []).map((pi) => {
      const remainingToReceive = Math.max(0, (pi.quantity || 0) - (pi.receivedQuantity || 0));
      return {
        item: pi.item?._id || pi.item,
        itemName: pi.item?.itemName || pi.description || 'Item',
        itemCode: pi.item?.itemCode || '',
        unitOfMeasurement: pi.unitOfMeasurement || pi.item?.unitOfMeasurement || 'pcs',
        orderedQuantity: pi.quantity || 0,
        previouslyReceivedQuantity: pi.receivedQuantity || 0,
        receivedQuantity: remainingToReceive,
        acceptedQuantity: remainingToReceive,
        rejectedQuantity: 0,
        damagedQuantity: 0,
        unitCost: pi.unitPrice || 0,
        note: ''
      };
    });

    setFormData((prev) => ({
      ...prev,
      purchaseOrder: poId,
      supplier: po.supplier?._id || po.supplier || '',
      warehouse: po.warehouse?._id || po.warehouse || warehouses[0]?._id || '',
      items: poItems
    }));
  };

  // Open Create GRV Modal
  const handleOpenCreateModal = () => {
    setFormData({
      purchaseOrder: '',
      supplier: suppliers[0]?._id || '',
      warehouse: warehouses[0]?._id || '',
      supplierDeliveryNoteNumber: '',
      supplierInvoiceNumber: '',
      receiptDate: new Date().toISOString().split('T')[0],
      note: '',
      items: []
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Inspection Modal
  const handleOpenInspectModal = (grn) => {
    setSelectedReceipt(grn);
    setInspectionNote(grn.note || '');
    setInspectionItems(
      (grn.items || []).map((i) => ({
        itemId: i._id,
        itemRef: i.item,
        itemName: i.item?.itemName || 'Item',
        itemCode: i.item?.itemCode || '',
        receivedQuantity: i.receivedQuantity || 0,
        acceptedQuantity: i.acceptedQuantity !== undefined ? i.acceptedQuantity : i.receivedQuantity,
        rejectedQuantity: i.rejectedQuantity || 0,
        damagedQuantity: i.damagedQuantity || 0,
        unitCost: i.unitCost || 0
      }))
    );
    setFormError('');
    setIsInspectModalOpen(true);
  };

  // Open Printable Voucher Modal
  const handleOpenPrintModal = (grn) => {
    setSelectedReceipt(grn);
    setIsPrintModalOpen(true);
  };

  // Submit New GRV
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!formData.purchaseOrder) {
      setFormError('Please select a Purchase Order to receive against.');
      return;
    }
    if (!formData.warehouse) {
      setFormError('Please select destination warehouse.');
      return;
    }
    if (formData.items.length === 0) {
      setFormError('At least one item must be received.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await storeService.createGoodsReceipt(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create Goods Receipt');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Inspection & Accept GRV (Updates stock balance!)
  const handleSubmitInspection = async (e) => {
    e.preventDefault();
    if (!selectedReceipt) return;

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        inspectionItems: inspectionItems.map((ii) => ({
          itemId: ii.itemId,
          acceptedQuantity: Number(ii.acceptedQuantity),
          rejectedQuantity: Number(ii.rejectedQuantity),
          damagedQuantity: Number(ii.damagedQuantity)
        })),
        note: inspectionNote
      };

      const res = await storeService.acceptGoodsReceipt(selectedReceipt._id, payload);
      if (res.success) {
        setIsInspectModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to inspect & accept Goods Receipt');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter receipts
  const filteredReceipts = receipts.filter((r) => {
    const matchesSearch =
      !search ||
      r.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.purchaseOrder?.purchaseOrderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier?.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplierDeliveryNoteNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesWarehouse = !warehouseFilter || (r.warehouse?._id || r.warehouse) === warehouseFilter;

    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('nav.storeInward')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Goods Receiving Vouchers (GRV), supplier delivery inspection, and stock balance intake
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh receipts"
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
              <span>{t('store.createGRV')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search...')}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('all statuses')}</option>
            <option value="pending inspection">{t('pending inspection')}</option>
            <option value="accepted">{t('accepted')}</option>
            <option value="partially accepted">{t('partially accepted')}</option>
            <option value="rejected">{t('rejected')}</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">{t('all warehouses')}</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.warehouseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Goods Receipts List */}
      <div className="w-full">
        {filteredReceipts.length === 0 ? (
          <EmptyState
            title="No Goods Receipts Found"
            description="Record inward shipments from suppliers against purchase orders."
            icon={ArrowDownToLine}
            actionLabel={hasRole(['admin', 'storekeeper']) ? 'Create First GRV' : undefined}
            onAction={handleOpenCreateModal}
          />
        ) : (
          <>
            {/* Mobile View: Card Deck (Strictly no tables on mobile) */}
            <div className="block md:hidden space-y-3">
              {filteredReceipts.map((grn) => {
                const totalAccepted = (grn.items || []).reduce(
                  (sum, i) => sum + (i.acceptedQuantity || i.receivedQuantity || 0),
                  0
                );
                const isPending = grn.status === 'pending inspection' || grn.status === 'draft';

                return (
                  <div
                    key={grn._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-primary-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {grn.receiptNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          PO: {grn.purchaseOrder?.purchaseOrderNumber || 'Direct'}
                        </div>
                      </div>
                      <Badge status={grn.status || 'pending inspection'} size="xs" />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2 text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400">Supplier:</span>{' '}
                        <span className="font-semibold">{grn.supplier?.supplierName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Warehouse:</span>{' '}
                        <span>{grn.warehouse?.warehouseName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Items Count:</span>{' '}
                        <span>{grn.items?.length || 0} line items</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Date:</span>{' '}
                        <span>{formatDate(grn.receiptDate)}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                      <button
                        onClick={() => handleOpenPrintModal(grn)}
                        className="px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print GRV</span>
                      </button>

                      {isPending && hasRole(['admin', 'storekeeper']) && (
                        <button
                          onClick={() => handleOpenInspectModal(grn)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Inspect & Accept</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Structured Responsive Table */}
            <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">GRV Number</th>
                    <th className="px-4 py-3">PO Reference</th>
                    <th className="px-4 py-3">Supplier</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3 text-center">Items Received</th>
                    <th className="px-4 py-3">Receipt Date</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredReceipts.map((grn) => {
                    const isPending = grn.status === 'pending inspection' || grn.status === 'draft';
                    const totalQty = (grn.items || []).reduce(
                      (sum, i) => sum + (i.receivedQuantity || 0),
                      0
                    );

                    return (
                      <tr
                        key={grn._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {grn.receiptNumber}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                          {grn.purchaseOrder?.purchaseOrderNumber || 'Direct'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {grn.supplier?.supplierName || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {grn.warehouse?.warehouseName || '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {grn.items?.length || 0} lines ({totalQty} units)
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-medium">
                          {formatDate(grn.receiptDate)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge status={grn.status || 'pending inspection'} size="xs" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPrintModal(grn)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Print Goods Receiving Voucher (GRV)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {isPending && hasRole(['admin', 'storekeeper']) && (
                              <button
                                onClick={() => handleOpenInspectModal(grn)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition text-[11px] font-bold flex items-center gap-1"
                                title="Inspect & Accept into Stock"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Inspect</span>
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

      {/* Create GRV Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('store.createGRV')}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Purchase Order (PO) *
              </label>
              <select
                required
                value={formData.purchaseOrder}
                onChange={(e) => handleSelectPO(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select PO Reference</option>
                {purchaseOrders.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.purchaseOrderNumber} - {p.supplier?.supplierName || 'Supplier'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Destination Warehouse *
              </label>
              <select
                required
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
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
                Receipt Date
              </label>
              <input
                type="date"
                value={formData.receiptDate}
                onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Delivery Note #
              </label>
              <input
                type="text"
                value={formData.supplierDeliveryNoteNumber}
                onChange={(e) => setFormData({ ...formData, supplierDeliveryNoteNumber: e.target.value })}
                placeholder="e.g. DN-88492"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Invoice #
              </label>
              <input
                type="text"
                value={formData.supplierInvoiceNumber}
                onChange={(e) => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                placeholder="e.g. INV-2026-102"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Items to receive list */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
              Shipment Line Items
            </h4>

            {formData.items.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-center text-slate-500">
                Please select a Purchase Order to load order line items automatically.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2">Item Description</th>
                      <th className="px-3 py-2 text-center">Ordered</th>
                      <th className="px-3 py-2 text-center">Prev. Received</th>
                      <th className="px-3 py-2 text-center">Received Now *</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {formData.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <div className="font-semibold">{it.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{it.itemCode}</div>
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">
                          {it.orderedQuantity} {it.unitOfMeasurement}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-500">
                          {it.previouslyReceivedQuantity}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            required
                            value={it.receivedQuantity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const updated = [...formData.items];
                              updated[idx].receivedQuantity = val;
                              updated[idx].acceptedQuantity = val;
                              setFormData({ ...formData, items: updated });
                            }}
                            className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300 font-medium">
                          {formatCurrency(it.unitCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Storekeeper Notes
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Package condition, delivery truck remarks, or discrepancies"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
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
              disabled={submitting || formData.items.length === 0}
              className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Recording GRV...' : 'Record Goods Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Inspect & Accept GRV Modal */}
      <Modal
        isOpen={isInspectModalOpen}
        onClose={() => setIsInspectModalOpen(false)}
        title={selectedReceipt ? `Inspect & Accept GRV: ${selectedReceipt.receiptNumber}` : 'Inspect GRV'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitInspection} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
            Confirming acceptance will automatically increase the destination warehouse stock balance, generate stock movement logs, and update the purchase order status.
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-center">Received</th>
                  <th className="px-3 py-2 text-center">Accepted</th>
                  <th className="px-3 py-2 text-center">Damaged</th>
                  <th className="px-3 py-2 text-center">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {inspectionItems.map((ii, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{ii.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ii.itemCode}</div>
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">
                      {ii.receivedQuantity}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max={ii.receivedQuantity}
                        value={ii.acceptedQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...inspectionItems];
                          updated[idx].acceptedQuantity = val;
                          setInspectionItems(updated);
                        }}
                        className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={ii.damagedQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...inspectionItems];
                          updated[idx].damagedQuantity = val;
                          setInspectionItems(updated);
                        }}
                        className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-600"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={ii.rejectedQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...inspectionItems];
                          updated[idx].rejectedQuantity = val;
                          setInspectionItems(updated);
                        }}
                        className="w-16 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Quality & Inspection Remarks
            </label>
            <textarea
              rows={2}
              value={inspectionNote}
              onChange={(e) => setInspectionNote(e.target.value)}
              placeholder="Inspection findings, quality compliance, packaging notes"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsInspectModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Processing...' : 'Accept & Update Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Printable GRV Voucher Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Goods Receiving Voucher (GRV)"
        maxWidth="max-w-3xl"
      >
        {selectedReceipt && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-slate-100">
            {/* Printable Voucher Paper */}
            <div id="printable-grv" className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-6 print:border-none print:p-0">
              {/* GT Printing Press Header */}
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
                      Enterprise ERP • Store & Inventory Division
                    </p>
                    <p className="text-[10px] text-slate-400">Addis Ababa, Ethiopia</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black uppercase bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-lg border border-primary-500/20 inline-block">
                    GOODS RECEIVING VOUCHER (GRV)
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedReceipt.receiptNumber}
                  </div>
                </div>
              </div>

              {/* GRV Metadata Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Date of Receipt</span>
                  <span className="font-bold">{formatDate(selectedReceipt.receiptDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Purchase Order #</span>
                  <span className="font-mono font-bold">{selectedReceipt.purchaseOrder?.purchaseOrderNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Destination Store</span>
                  <span className="font-bold">{selectedReceipt.warehouse?.warehouseName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span className="font-bold uppercase text-emerald-600">{selectedReceipt.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Supplier Name</span>
                  <span className="font-bold">{selectedReceipt.supplier?.supplierName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Delivery Note #</span>
                  <span className="font-mono font-bold">{selectedReceipt.supplierDeliveryNoteNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Supplier Invoice #</span>
                  <span className="font-mono font-bold">{selectedReceipt.supplierInvoiceNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Received By</span>
                  <span className="font-bold">{selectedReceipt.receivedBy?.fullName || user?.fullName || 'Storekeeper'}</span>
                </div>
              </div>

              {/* Items Line Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2">Item Code</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-center">Ordered</th>
                      <th className="px-3 py-2 text-center">Received</th>
                      <th className="px-3 py-2 text-center">Accepted</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Total (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {(selectedReceipt.items || []).map((it, idx) => {
                      const qty = it.acceptedQuantity || it.receivedQuantity || 0;
                      const lineTotal = qty * (it.unitCost || 0);
                      return (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-mono font-bold">{it.item?.itemCode || '-'}</td>
                          <td className="px-3 py-2 font-semibold">{it.item?.itemName || 'Item'}</td>
                          <td className="px-3 py-2 text-center">{it.item?.unitOfMeasurement || 'pcs'}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{it.orderedQuantity || '-'}</td>
                          <td className="px-3 py-2 text-center">{it.receivedQuantity}</td>
                          <td className="px-3 py-2 text-center font-bold text-emerald-600">{qty}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(it.unitCost)}</td>
                          <td className="px-3 py-2 text-right font-bold">{formatCurrency(lineTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Voucher Signatures */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                <div className="space-y-8">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Storekeeper / Received By
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-4" />
                  <div className="text-[10px] text-slate-400">Signature & Date</div>
                </div>

                <div className="space-y-8">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Inspected / Quality Check
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-4" />
                  <div className="text-[10px] text-slate-400">Signature & Date</div>
                </div>

                <div className="space-y-8">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Store Head / Approved By
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-4" />
                  <div className="text-[10px] text-slate-400">Signature & Date</div>
                </div>
              </div>
            </div>

            {/* Modal Action Controls */}
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
                <span>Print Official Voucher</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
