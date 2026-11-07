import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import purchasingService from '../../services/purchasingService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Building2,
  FileText,
  DollarSign,
  Printer
} from 'lucide-react';

export default function PurchasePayments() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [payments, setPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    supplier: '',
    purchaseOrder: '',
    invoiceNumber: '',
    paymentDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'bank transfer',
    transactionReference: '',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    notes: '',
    status: 'paid'
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [payRes, poRes, supRes] = await Promise.allSettled([
        purchasingService.getPurchasePayments({ limit: 120 }),
        purchasingService.getPurchaseOrders({ limit: 100 }),
        purchasingService.getSuppliers({ limit: 100 })
      ]);

      if (payRes.status === 'fulfilled' && payRes.value?.data) {
        setPayments(Array.isArray(payRes.value.data) ? payRes.value.data : []);
      }
      if (poRes.status === 'fulfilled' && poRes.value?.data) {
        setPurchaseOrders(Array.isArray(poRes.value.data) ? poRes.value.data : []);
      }
      if (supRes.status === 'fulfilled' && supRes.value?.data) {
        setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load purchase payments:', err);
      setError(err.message || 'Failed to load payments history');
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

  const handleSelectPO = (poId) => {
    const po = purchaseOrders.find((p) => p._id === poId);
    if (!po) {
      setFormData((prev) => ({ ...prev, purchaseOrder: '' }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      purchaseOrder: poId,
      supplier: po.supplier?._id || po.supplier,
      amount: po.balanceDue || po.grandTotal || 0,
      notes: `Payment for PO ${po.purchaseOrderNumber}`
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.purchaseOrder || !formData.supplier || !formData.amount) {
      alert('Please select PO, Supplier, and enter Amount');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.createPurchasePayment(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        await fetchData();
        alert('Payment recorded successfully!');
      } else {
        alert(res.message || 'Failed to record payment');
      }
    } catch (err) {
      alert(err.message || 'Error recording payment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    if (supplierFilter && p.supplier?._id !== supplierFilter) return false;
    if (methodFilter && p.paymentMethod !== methodFilter) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchNum = p.paymentNumber?.toLowerCase().includes(term);
      const matchPo = p.purchaseOrder?.purchaseOrderNumber?.toLowerCase().includes(term);
      const matchSupp = p.supplier?.supplierName?.toLowerCase().includes(term);
      const matchRef = p.transactionReference?.toLowerCase().includes(term);
      if (!matchNum && !matchPo && !matchSupp && !matchRef) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary-500" />
            {t('payments history')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('payments ledger against purchase orders, wire references, and settlements')}
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
            {t('record payment')}
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
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">{t('all payment methods')}</option>
            <option value="bank transfer">{t('bank transfer')}</option>
            <option value="cheque">{t('cheque')}</option>
            <option value="cash">{t('cash')}</option>
            <option value="other">{t('other')}</option>
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

      {/* Payments Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
            <p className="text-sm">{t('loading purchasing & procurement metrics...')}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title={t('no records found')}
            description={t('no records found')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">{t('payment #')}</th>
                  <th className="py-3 px-4 font-bold">{t('purchase order')}</th>
                  <th className="py-3 px-4 font-bold">{t('supplier')}</th>
                  <th className="py-3 px-4 font-bold">{t('amount')}</th>
                  <th className="py-3 px-4 font-bold">{t('method')}</th>
                  <th className="py-3 px-4 font-bold">{t('reference')}</th>
                  <th className="py-3 px-4 font-bold">{t('payment date')}</th>
                  <th className="py-3 px-4 font-bold">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-primary-600">
                      {p.paymentNumber}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {p.purchaseOrder?.purchaseOrderNumber || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {p.supplier?.supplierName || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                      {formatCurrency(p.amount)}
                    </td>

                    <td className="py-3.5 px-4 capitalize text-slate-600 dark:text-slate-300">
                      {p.paymentMethod}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div className="font-mono text-[11px]">{p.transactionReference || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400">{p.bankName || ''}</div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {new Date(p.paymentDate || p.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <Badge status={p.status} text={p.status} size="xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Record Supplier Payment"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Purchase Order *
            </label>
            <select
              value={formData.purchaseOrder}
              onChange={(e) => handleSelectPO(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              required
            >
              <option value="">-- Choose PO --</option>
              {purchaseOrders.map((po) => (
                <option key={po._id} value={po._id}>
                  {po.purchaseOrderNumber} - {po.supplier?.supplierName} (Balance: {formatCurrency(po.balanceDue)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Supplier *
            </label>
            <select
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              required
            >
              <option value="">-- Choose Supplier --</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.supplierName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Amount (ETB) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border"
              >
                <option value="bank transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Transaction Reference / Slip #
            </label>
            <input
              type="text"
              placeholder="e.g. FT2608472910"
              value={formData.transactionReference}
              onChange={(e) => setFormData({ ...formData, transactionReference: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border"
            />
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
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

