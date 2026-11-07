import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import purchasingService from '../../services/purchasingService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Eye,
  AlertCircle,
  Building2,
  Warehouse,
  Boxes
} from 'lucide-react';

export default function SupplierReturns() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [returns, setReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    supplier: '',
    warehouse: '',
    returnDate: new Date().toISOString().split('T')[0],
    refundAmount: 0,
    notes: '',
    items: [
      {
        item: '',
        quantity: 1,
        unitCost: 0,
        reason: 'Damaged upon delivery',
        condition: 'damaged/defective'
      }
    ]
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [retRes, supRes, whRes, itemRes] = await Promise.allSettled([
        purchasingService.getSupplierReturns({ limit: 120 }),
        purchasingService.getSuppliers({ limit: 100 }),
        purchasingService.getWarehouses({ limit: 50 }),
        purchasingService.getItems({ limit: 150 })
      ]);

      if (retRes.status === 'fulfilled' && retRes.value?.data) {
        setReturns(Array.isArray(retRes.value.data) ? retRes.value.data : []);
      }
      if (supRes.status === 'fulfilled' && supRes.value?.data) {
        setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
      if (itemRes.status === 'fulfilled' && itemRes.value?.data) {
        setInventoryItems(Array.isArray(itemRes.value.data) ? itemRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load supplier returns:', err);
      setError(err.message || 'Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: '',
          quantity: 1,
          unitCost: 0,
          reason: 'Damaged upon delivery',
          condition: 'damaged/defective'
        }
      ]
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'item') {
        const itemObj = inventoryItems.find((i) => i._id === value);
        if (itemObj && itemObj.unitCost) {
          updated[index].unitCost = itemObj.unitCost;
        }
      }

      return { ...prev, items: updated };
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier || !formData.warehouse || formData.items.length === 0) {
      alert('Please fill supplier, warehouse, and add at least one item');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.createSupplierReturn(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        await fetchData();
        alert('Supplier return created successfully!');
      } else {
        alert(res.message || 'Failed to create supplier return');
      }
    } catch (err) {
      alert(err.message || 'Error creating return');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReturn = async (returnId) => {
    if (!window.confirm('Approve this return? This will deduct the items from warehouse stock and credit the payable balance.')) {
      return;
    }
    try {
      const res = await purchasingService.approveSupplierReturn(returnId, { status: 'returned' });
      if (res.success) {
        await fetchData();
        alert('Return approved! Warehouse stock deducted.');
      } else {
        alert(res.message || 'Failed to approve return');
      }
    } catch (err) {
      alert(err.message || 'Error approving return');
    }
  };

  const filteredReturns = returns.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (supplierFilter && r.supplier?._id !== supplierFilter) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchNum = r.returnNumber?.toLowerCase().includes(term);
      const matchSupp = r.supplier?.supplierName?.toLowerCase().includes(term);
      if (!matchNum && !matchSupp) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-primary-500" />
            {t('supplier returns')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('return defective or damaged stock, deduct warehouse balances, and issue debit notes')}
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
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            {t('create return')}
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
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">{t('all statuses')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="returned">{t('returned')}</option>
            <option value="refunded">{t('refunded')}</option>
            <option value="rejected">{t('rejected')}</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">{t('all suppliers')}</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>{s.supplierName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Returns Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
            <p className="text-sm">{t('loading purchasing & procurement metrics...')}</p>
          </div>
        ) : filteredReturns.length === 0 ? (
          <EmptyState
            icon={RotateCcw}
            title={t('no records found')}
            description={t('no records found')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">{t('return number')}</th>
                  <th className="py-3 px-4 font-bold">{t('supplier')}</th>
                  <th className="py-3 px-4 font-bold">{t('warehouse')}</th>
                  <th className="py-3 px-4 font-bold">{t('return date')}</th>
                  <th className="py-3 px-4 font-bold">{t('items count')}</th>
                  <th className="py-3 px-4 font-bold">{t('refunded')}</th>
                  <th className="py-3 px-4 font-bold">{t('status')}</th>
                  <th className="py-3 px-4 font-bold text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredReturns.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary-600">
                      {r.returnNumber}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {r.supplier?.supplierName || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {r.warehouse?.warehouseName || 'Warehouse'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(r.returnDate || r.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {r.items?.length || 0} line items
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrency(r.refundAmount)}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={r.status} text={r.status} size="xs" />
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {r.status === 'pending' && hasRole(['admin', 'manager', 'storekeeper']) && (
                        <button
                          onClick={() => handleApproveReturn(r._id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-xs ml-auto"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve & Deduct Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE RETURN MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Supplier Return / Debit Note"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier *
              </label>
              <select
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border"
                required
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>{s.supplierName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Warehouse (Deduct From) *
              </label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border"
                required
              >
                <option value="">-- Choose Warehouse --</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>{w.warehouseName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Return Date
              </label>
              <input
                type="date"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Debit / Refund Credit Value (ETB)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.refundAmount}
                onChange={(e) => setFormData({ ...formData, refundAmount: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border font-bold"
              />
            </div>
          </div>

          {/* Items */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Returned Products *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-primary-600 hover:text-primary-500 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Product
              </button>
            </div>

            <div className="space-y-2">
              {formData.items.map((itm, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-0.5">Item *</label>
                    <select
                      value={itm.item}
                      onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border bg-white dark:bg-slate-800"
                      required
                    >
                      <option value="">-- Select Product --</option>
                      {inventoryItems.map((inv) => (
                        <option key={inv._id} value={inv._id}>{inv.itemName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Qty *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={itm.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Reason</label>
                    <input
                      type="text"
                      value={itm.reason}
                      onChange={(e) => handleItemChange(idx, 'reason', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 text-white shadow-xs"
            >
              {submitting ? 'Submitting...' : 'Submit Return'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

