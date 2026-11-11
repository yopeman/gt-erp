import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import { extractArray, extractData } from '../../services/api';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  FileCheck,
  Plus,
  Search,
  Calendar,
  Clock,
  Printer,
  DollarSign,
  AlertCircle,
  Eye,
  Trash2,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  Send,
  FileText
} from 'lucide-react';

const PROFORMA_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent_to_customer', label: 'Sent to Customer' },
  { value: 'accepted', label: 'Accepted / Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' }
];

export default function Proformas() {
  const { t } = useTranslation();

  const [proformas, setProformas] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingProforma, setViewingProforma] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    customer: '',
    order: '',
    validDays: 15,
    discountAmount: 0,
    termsAndConditions: '1. Price is valid for 15 days from issue date.\n2. 50% advance payment required upon order confirmation.\n3. Standard delivery within 7 working days following design approval.',
    items: [
      {
        itemDescription: 'Offset Printing Run',
        quantity: 1000,
        unitPrice: 25,
        discount: 0,
        taxRate: 15,
        subtotal: 28750
      }
    ]
  });

  const fetchProformas = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await crmService.getProformas(params);
      setProformas(extractArray(res, 'proformas'));
    } catch (err) {
      setError(err?.message || 'Failed to fetch proformas');
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [custsRes, ordersRes] = await Promise.allSettled([
        crmService.getCustomers({ limit: 100 }),
        crmService.getOrders({ limit: 100 })
      ]);
      if (custsRes.status === 'fulfilled') setCustomers(extractArray(custsRes.value, 'customers'));
      if (ordersRes.status === 'fulfilled') setOrders(extractArray(ordersRes.value, 'orders'));
    } catch {
      // Non-blocking lookup
    }
  };

  useEffect(() => {
    fetchProformas();
  }, [statusFilter]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const handleOpenCreateModal = () => {
    setFormData({
      customer: customers[0]?._id || '',
      order: '',
      validDays: 15,
      discountAmount: 0,
      termsAndConditions: '1. Price is valid for 15 days from issue date.\n2. 50% advance payment required upon order confirmation.\n3. Standard delivery within 7 working days following design approval.',
      items: [
        {
          itemDescription: 'High Quality Printing Service',
          quantity: 1000,
          unitPrice: 20,
          discount: 0,
          taxRate: 15,
          subtotal: 23000
        }
      ]
    });
    setIsCreateModalOpen(true);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemDescription: 'Additional Print Finishing',
          quantity: 1000,
          unitPrice: 5,
          discount: 0,
          taxRate: 15,
          subtotal: 5750
        }
      ]
    });
  };

  const handleRemoveItem = (idx) => {
    const updated = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: updated });
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...formData.items];
    updated[idx][field] = value;
    if (field === 'quantity' || field === 'unitPrice' || field === 'discount' || field === 'taxRate') {
      const qty = Number(field === 'quantity' ? value : updated[idx].quantity);
      const price = Number(field === 'unitPrice' ? value : updated[idx].unitPrice);
      const disc = Number(field === 'discount' ? value : updated[idx].discount || 0);
      const taxRate = Number(field === 'taxRate' ? value : updated[idx].taxRate || 15);
      const taxable = Math.max(0, qty * price - disc);
      const taxAmount = (taxable * taxRate) / 100;
      updated[idx].subtotal = taxable + taxAmount;
    }
    setFormData({ ...formData, items: updated });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    formData.items.forEach((it) => {
      const taxable = Math.max(0, (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0) - (Number(it.discount) || 0));
      subtotal += taxable;
    });
    const discount = Number(formData.discountAmount || 0);
    const taxableBase = Math.max(0, subtotal - discount);
    const vat = (taxableBase * 15) / 100;
    const grandTotal = taxableBase + vat;
    return { subtotal, discount, vat, grandTotal };
  };

  const handleSaveProforma = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + Number(formData.validDays || 15));

      const payload = {
        customer: formData.customer,
        order: formData.order || undefined,
        validUntil,
        items: formData.items,
        discountAmount: Number(formData.discountAmount || 0),
        termsAndConditions: formData.termsAndConditions
      };

      await crmService.createProforma(payload);
      setIsCreateModalOpen(false);
      fetchProformas();
    } catch (err) {
      alert(err?.message || 'Failed to create proforma');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await crmService.updateProformaStatus(id, { status });
      if (viewingProforma && viewingProforma._id === id) {
        setViewingProforma({ ...viewingProforma, status });
      }
      fetchProformas();
    } catch (err) {
      alert(err?.message || 'Failed to update status');
    }
  };

  const handleDeleteProforma = async (id) => {
    if (!window.confirm('Are you sure you want to delete this proforma?')) return;
    try {
      await crmService.deleteProforma(id);
      fetchProformas();
    } catch (err) {
      alert(err?.message || 'Failed to delete proforma');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(val || 0);
  };

  const getStatusBadgeVariant = (st) => {
    switch (st) {
      case 'accepted': return 'success';
      case 'sent_to_customer': return 'primary';
      case 'rejected': return 'danger';
      case 'expired': return 'neutral';
      default: return 'warning';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileCheck className="w-7 h-7 text-primary-500" />
            Quotations & Proformas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Formal commercial quotations with 15-30 day validity windows, itemized specs, and 15% VAT calculation.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Proforma
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchProformas()}
            placeholder="Search by proforma # or client..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {PROFORMA_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Proformas Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading proforma quotations...</div>
        ) : proformas.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="No proforma invoices found"
            description="Create quotations for potential clients or orders."
            actionLabel="Create Proforma"
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Proforma #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Grand Total (ETB)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {proformas.map((prf) => (
                  <tr key={prf._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      {prf.proformaNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{prf.customer?.name || prf.customer?.companyName || 'Customer'}</div>
                      {prf.customer?.tinNumber && (
                        <div className="text-[10px] text-slate-400">TIN: {prf.customer.tinNumber}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {new Date(prf.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(prf.validUntil).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(prf.grandTotal)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusBadgeVariant(prf.status)}>
                        {prf.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewingProforma(prf)}
                          title="View / Print Quotation"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {prf.status === 'draft' && (
                          <button
                            onClick={() => handleUpdateStatus(prf._id, 'sent_to_customer')}
                            title="Mark as Sent to Customer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}

                        {prf.status === 'sent_to_customer' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(prf._id, 'accepted')}
                              title="Mark Accepted by Customer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(prf._id, 'rejected')}
                              title="Mark Rejected"
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDeleteProforma(prf._id)}
                          title="Delete Proforma"
                          disabled={prf.status === 'accepted'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Proforma Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Draft New Proforma Quotation"
      >
        <form onSubmit={handleSaveProforma} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer *</label>
              <select
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>{c.name || c.companyName || 'Customer'} [{c.customerNumber || ''}]</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Validity (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.validDays}
                onChange={(e) => setFormData({ ...formData, validDays: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Optional Order Link</label>
              <select
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- None (Standalone Quotation) --</option>
                {orders.map((o) => (
                  <option key={o._id} value={o._id}>{o.orderNumber}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Quotation Line Items
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-md bg-primary-50 dark:bg-primary-950/60"
              >
                + Add Item
              </button>
            </div>

            {formData.items.map((it, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Item #{idx + 1}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 text-xs font-semibold hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Item Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10,000 Brochures (150 GSM Art Paper, 4/4 Colors)"
                      value={it.itemDescription}
                      onChange={(e) => handleItemChange(idx, 'itemDescription', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Unit Price (ETB)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={it.unitPrice}
                      onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                  Item Total (incl. 15% VAT): {formatCurrency(it.subtotal)}
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Terms & Conditions
            </label>
            <textarea
              rows="3"
              value={formData.termsAndConditions}
              onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Totals Summary */}
          {(() => {
            const { subtotal, discount, vat, grandTotal } = calculateTotals();
            return (
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>15% VAT:</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Issue Proforma'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View / Print Formal Proforma Dossier Modal */}
      {viewingProforma && (
        <Modal
          isOpen={Boolean(viewingProforma)}
          onClose={() => setViewingProforma(null)}
          title={`Proforma Quotation: ${viewingProforma.proformaNumber}`}
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 text-xs printable-area">
            {/* Header banner */}
            <div className="flex items-center justify-between border-b pb-4 border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">GT PRINTING PRESS PLC</h2>
                <p className="text-slate-500 text-xs">Proforma Invoice / Formal Price Quotation</p>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-sm text-primary-600">{viewingProforma.proformaNumber}</div>
                <div className="text-slate-400 text-[11px]">Issued: {new Date(viewingProforma.issueDate).toLocaleDateString()}</div>
                <div className="text-rose-500 font-semibold text-[11px]">Valid Until: {new Date(viewingProforma.validUntil).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quotation Prepared For:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{viewingProforma.customer?.name || viewingProforma.customer?.companyName || 'Customer'}</div>
                {viewingProforma.customer?.tinNumber && (
                  <div className="text-slate-500">TIN: {viewingProforma.customer.tinNumber}</div>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status:</span>
                <div className="mt-1">
                  <Badge variant={getStatusBadgeVariant(viewingProforma.status)}>
                    {viewingProforma.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div className="border rounded-xl border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Qty</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Total (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingProforma.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{it.itemDescription}</td>
                      <td className="py-2.5 px-3 text-right">{it.quantity?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(it.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-bold">{formatCurrency(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financials Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(viewingProforma.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>15% Ethiopian VAT:</span>
                <span>{formatCurrency(viewingProforma.vatAmount)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                <span>Grand Total:</span>
                <span>{formatCurrency(viewingProforma.grandTotal)}</span>
              </div>
            </div>

            {/* Terms */}
            {viewingProforma.termsAndConditions && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 whitespace-pre-line">
                <span className="font-bold block text-slate-700 dark:text-slate-300 mb-0.5">Commercial Terms:</span>
                {viewingProforma.termsAndConditions}
              </div>
            )}

            {/* Print action button */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <Printer className="w-4 h-4" /> Print Quotation
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

