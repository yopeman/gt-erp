import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import purchasingService from '../../services/purchasingService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  ArrowDownToLine,
  Plus,
  Search,
  CheckCircle2,
  Printer,
  RefreshCw,
  Eye,
  AlertCircle,
  AlertTriangle,
  Building2,
  Warehouse,
  FileText,
  Boxes
} from 'lucide-react';

export default function GoodsReceipts() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();

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
        purchasingService.getGoodsReceipts({ limit: 120 }),
        purchasingService.getPurchaseOrders({ limit: 100 }),
        purchasingService.getWarehouses({ limit: 50 }),
        purchasingService.getSuppliers({ limit: 100 })
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

    const items = (po.items || []).map((i) => {
      const remaining = Math.max(0, (i.quantity || 0) - (i.receivedQuantity || 0));
      return {
        item: i.item?._id || i.item,
        itemName: i.item?.itemName || i.description || 'Item',
        unitOfMeasurement: i.unitOfMeasurement || 'piece',
        orderedQuantity: i.quantity || 0,
        previouslyReceivedQuantity: i.receivedQuantity || 0,
        receivedQuantity: remaining,
        acceptedQuantity: remaining,
        rejectedQuantity: 0,
        damagedQuantity: 0,
        unitCost: i.unitPrice || 0,
        note: ''
      };
    });

    setFormData((prev) => ({
      ...prev,
      purchaseOrder: poId,
      supplier: po.supplier?._id || po.supplier,
      warehouse: po.warehouse?._id || po.warehouse,
      items
    }));
  };

  // Open Create Modal (optionally with poId prefilled)
  useEffect(() => {
    const poParam = searchParams.get('poId');
    if (poParam && purchaseOrders.length > 0) {
      handleSelectPO(poParam);
      setIsCreateModalOpen(true);
    }
  }, [searchParams, purchaseOrders]);

  // Handle GRV Create Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.purchaseOrder) {
      setFormError('Please select a purchase order');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      setFormError('At least one item is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.createGoodsReceipt(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        await fetchData();
      } else {
        setFormError(res.message || 'Failed to create goods receipt');
      }
    } catch (err) {
      console.error('Error creating goods receipt:', err);
      setFormError(err.message || 'Failed to create goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Inspection Modal
  const handleOpenInspection = (receipt) => {
    setSelectedReceipt(receipt);
    setInspectionNote('');
    setInspectionItems(
      (receipt.items || []).map((i) => ({
        itemId: i.item?._id || i.item,
        itemName: i.item?.itemName || 'Item',
        orderedQuantity: i.orderedQuantity || 0,
        receivedQuantity: i.receivedQuantity || 0,
        acceptedQuantity: i.acceptedQuantity !== undefined ? i.acceptedQuantity : i.receivedQuantity,
        damagedQuantity: i.damagedQuantity || 0,
        rejectedQuantity: i.rejectedQuantity || 0,
        unitCost: i.unitCost || 0
      }))
    );
    setIsInspectModalOpen(true);
  };

  // Handle Inspection Field Change
  const handleInspectFieldChange = (index, field, value) => {
    setInspectionItems((prev) => {
      const updated = [...prev];
      const val = Number(value || 0);
      updated[index] = { ...updated[index], [field]: val };

      if (field === 'damagedQuantity' || field === 'rejectedQuantity') {
        const recv = updated[index].receivedQuantity;
        const dmg = field === 'damagedQuantity' ? val : updated[index].damagedQuantity;
        const rej = field === 'rejectedQuantity' ? val : updated[index].rejectedQuantity;
        updated[index].acceptedQuantity = Math.max(0, recv - dmg - rej);
      }

      return updated;
    });
  };

  // Handle Accept Goods Receipt Submit
  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReceipt) return;

    setSubmitting(true);
    try {
      const res = await purchasingService.acceptGoodsReceipt(selectedReceipt._id, {
        inspectionItems,
        note: inspectionNote
      });

      if (res.success) {
        setIsInspectModalOpen(false);
        setSelectedReceipt(null);
        await fetchData();
        alert('Goods receipt accepted! Store warehouse stock increased and PO updated.');
      } else {
        alert(res.message || 'Failed to accept goods receipt');
      }
    } catch (err) {
      console.error('Error accepting goods receipt:', err);
      alert(err.message || 'Error processing goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter receipts
  const filteredReceipts = receipts.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (warehouseFilter && r.warehouse?._id !== warehouseFilter) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchNum = r.receiptNumber?.toLowerCase().includes(term);
      const matchPo = r.purchaseOrder?.purchaseOrderNumber?.toLowerCase().includes(term);
      const matchSupp = r.supplier?.supplierName?.toLowerCase().includes(term);
      const matchDeliv = r.supplierDeliveryNoteNumber?.toLowerCase().includes(term);
      if (!matchNum && !matchPo && !matchSupp && !matchDeliv) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ArrowDownToLine className="w-7 h-7 text-primary-500" />
            {t('Goods Receipts (GRV)')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('physical receiving, quality inspection, and automatic inventory stock increment')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className="w-4 h-4" />
            {t('actions.refresh')}
          </button>
          <button
            onClick={() => {
              setFormError('');
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            {t('receive goods (grv)')}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all statuses')}</option>
            <option value="pending inspection">{t('pending inspection')}</option>
            <option value="completed">{t('completed')}</option>
            <option value="accepted">{t('accepted')}</option>
            <option value="rejected">{t('rejected')}</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all warehouses')}</option>
            {warehouses.map((wh) => (
              <option key={wh._id} value={wh._id}>
                {wh.warehouseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
            <p className="text-sm">{t('loading purchasing & procurement metrics...')}</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <EmptyState
            icon={ArrowDownToLine}
            title={t('no records found')}
            description={search || statusFilter ? t('Try adjusting your search criteria.') : t('no records found')}
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 text-white"
              >
                {t('receive goods (grv)')}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">{t('grv number')}</th>
                  <th className="py-3 px-4 font-bold">{t('purchase order')}</th>
                  <th className="py-3 px-4 font-bold">{t('supplier')}</th>
                  <th className="py-3 px-4 font-bold">{t('warehouse')}</th>
                  <th className="py-3 px-4 font-bold">{t('receipt date')}</th>
                  <th className="py-3 px-4 font-bold">{t('items count')}</th>
                  <th className="py-3 px-4 font-bold">{t('status')}</th>
                  <th className="py-3 px-4 font-bold text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredReceipts.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <button
                        onClick={() => {
                          setSelectedReceipt(r);
                          setIsPrintModalOpen(true);
                        }}
                        className="hover:underline text-primary-600 font-mono"
                      >
                        {r.receiptNumber}
                      </button>
                      {r.supplierDeliveryNoteNumber && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          Note: {r.supplierDeliveryNoteNumber}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {r.purchaseOrder ? (
                        <Link to={`/purchasing/orders?id=${r.purchaseOrder._id || r.purchaseOrder}`} className="hover:underline font-mono text-primary-600">
                          {r.purchaseOrder.purchaseOrderNumber || 'PO'}
                        </Link>
                      ) : (
                        'Direct Receipt'
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                      {r.supplier?.supplierName || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {r.warehouse?.warehouseName || 'Warehouse'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(r.receiptDate || r.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {r.items?.length || 0} line items
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={r.status} text={r.status} size="xs" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedReceipt(r);
                            setIsPrintModalOpen(true);
                          }}
                          title="Print GRV Voucher"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {/* Inspection & Stocking action */}
                        {r.status === 'pending inspection' && (
                          <button
                            onClick={() => handleOpenInspection(r)}
                            title="Inspect & Accept Stock"
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Inspect & Stock
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE GRV MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Goods Received Voucher (GRV)"
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Purchase Order (PO) *
              </label>
              <select
                value={formData.purchaseOrder}
                onChange={(e) => handleSelectPO(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              >
                <option value="">-- Choose Approved PO --</option>
                {purchaseOrders
                  .filter((p) => p.status !== 'completed' && p.status !== 'cancelled')
                  .map((po) => (
                    <option key={po._id} value={po._id}>
                      {po.purchaseOrderNumber} - {po.supplier?.supplierName} ({po.status})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Receipt Date *
              </label>
              <input
                type="date"
                value={formData.receiptDate}
                onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Delivery Note # / Waybill
              </label>
              <input
                type="text"
                placeholder="e.g. DN-98432"
                value={formData.supplierDeliveryNoteNumber}
                onChange={(e) => setFormData({ ...formData, supplierDeliveryNoteNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Invoice #
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2026-778"
                value={formData.supplierInvoiceNumber}
                onChange={(e) => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Items preview table */}
          {formData.items.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3">Ordered</th>
                    <th className="py-2 px-3">Prev. Received</th>
                    <th className="py-2 px-3">Receiving Qty Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {formData.items.map((itm, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-semibold">{itm.itemName}</td>
                      <td className="py-2 px-3">{itm.orderedQuantity} {itm.unitOfMeasurement}</td>
                      <td className="py-2 px-3">{itm.previouslyReceivedQuantity} {itm.unitOfMeasurement}</td>
                      <td className="py-2 px-3 font-bold text-primary-600">
                        {itm.receivedQuantity} {itm.unitOfMeasurement}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs"
            >
              {submitting ? 'Creating GRV...' : 'Create GRV Entry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* INSPECTION & ACCEPTANCE MODAL */}
      <Modal
        isOpen={isInspectModalOpen}
        onClose={() => setIsInspectModalOpen(false)}
        title={`Inspect & Stock Received Goods - ${selectedReceipt?.receiptNumber || ''}`}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleAcceptSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
            <strong>Store Verification:</strong> Confirming this inspection will automatically increment available warehouse stock in the Store module, record Stock Movement logs, and update the Purchase Order status.
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Delivered Qty</th>
                  <th className="py-2.5 px-3">Accepted Qty (Stock In)</th>
                  <th className="py-2.5 px-3">Damaged Qty</th>
                  <th className="py-2.5 px-3">Rejected Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {inspectionItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      {item.itemName}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                      {item.receivedQuantity}
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.acceptedQuantity}
                        onChange={(e) => handleInspectFieldChange(idx, 'acceptedQuantity', e.target.value)}
                        className="w-24 px-2 py-1 text-xs rounded-lg border border-emerald-300 font-bold text-emerald-700 bg-white dark:bg-slate-900"
                        required
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.damagedQuantity}
                        onChange={(e) => handleInspectFieldChange(idx, 'damagedQuantity', e.target.value)}
                        className="w-20 px-2 py-1 text-xs rounded-lg border border-rose-300 font-bold text-rose-700 bg-white dark:bg-slate-900"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.rejectedQuantity}
                        onChange={(e) => handleInspectFieldChange(idx, 'rejectedQuantity', e.target.value)}
                        className="w-20 px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white dark:bg-slate-900"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Inspection Notes / Quality Remarks
            </label>
            <textarea
              rows="2"
              placeholder="e.g. All paper reams inspected in good condition, packaging intact."
              value={inspectionNote}
              onChange={(e) => setInspectionNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsInspectModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Updating Stock...' : 'Confirm Acceptance & Stock Inward'}
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE GRV VOUCHER MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Goods Received Voucher (GRV) Print Preview"
        maxWidth="max-w-3xl"
      >
        {selectedReceipt && (
          <div className="space-y-4">
            <div id="grv-printable-area" className="p-6 bg-white text-slate-900 rounded-xl border border-slate-300">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <img src="/gt-logo.jpg" alt="GT Logo" className="h-12 w-12 object-contain" />
                  <div>
                    <h2 className="text-xl font-black text-slate-900">GT PRINTING PRESS PLC</h2>
                    <p className="text-xs text-slate-500">Store Inward & Goods Received Voucher (GRV)</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase">GRV Voucher</div>
                  <div className="text-base font-black text-indigo-600 font-mono">
                    {selectedReceipt.receiptNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date: {new Date(selectedReceipt.receiptDate || selectedReceipt.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <h4 className="font-bold uppercase text-[10px] text-slate-400 mb-1">Supplier Details</h4>
                  <div className="font-bold">{selectedReceipt.supplier?.supplierName}</div>
                  <div>Code: {selectedReceipt.supplier?.supplierCode}</div>
                  <div>Delivery Note: {selectedReceipt.supplierDeliveryNoteNumber || 'N/A'}</div>
                  <div>Invoice #: {selectedReceipt.supplierInvoiceNumber || 'N/A'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border">
                  <h4 className="font-bold uppercase text-[10px] text-slate-400 mb-1">Warehouse & Reference</h4>
                  <div className="font-bold">{selectedReceipt.warehouse?.warehouseName || 'Warehouse'}</div>
                  <div>PO Reference: {selectedReceipt.purchaseOrder?.purchaseOrderNumber || 'Direct'}</div>
                  <div>Status: {selectedReceipt.status}</div>
                </div>
              </div>

              <table className="w-full text-xs text-left border border-slate-200 mb-4">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="py-2 px-3 border-b">#</th>
                    <th className="py-2 px-3 border-b">Item</th>
                    <th className="py-2 px-3 border-b">Delivered</th>
                    <th className="py-2 px-3 border-b">Accepted</th>
                    <th className="py-2 px-3 border-b">Damaged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedReceipt.items?.map((itm, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3">{i + 1}</td>
                      <td className="py-2 px-3 font-medium">{itm.item?.itemName || 'Item'}</td>
                      <td className="py-2 px-3">{itm.receivedQuantity}</td>
                      <td className="py-2 px-3 font-bold text-emerald-600">{itm.acceptedQuantity}</td>
                      <td className="py-2 px-3 text-rose-600">{itm.damagedQuantity || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t text-xs text-center text-slate-500">
                <div>
                  <div className="border-b border-slate-300 pb-12 mb-1"></div>
                  <span>Storekeeper / Received By</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-12 mb-1"></div>
                  <span>Quality Inspector / Verified By</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 text-white flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print GRV
              </button>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

