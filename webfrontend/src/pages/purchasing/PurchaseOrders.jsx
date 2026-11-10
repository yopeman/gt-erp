import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import purchasingService from '../../services/purchasingService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  Send,
  Eye,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Building2,
  Warehouse,
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  CreditCard
} from 'lucide-react';

const COMMON_UOMS = [
  'piece',
  'roll',
  'ream',
  'kg',
  'liter',
  'meter',
  'box',
  'pack',
  'sheet',
  'carton',
  'set'
];

export default function PurchaseOrders() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [vatFilter, setVatFilter] = useState(''); // '' | 'with_vat' | 'without_vat'
  const [includeVat, setIncludeVat] = useState(true); // Master VAT toggle for PO creation

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Form State for New PO
  const [formData, setFormData] = useState({
    supplier: '',
    warehouse: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    paymentType: 'cash',
    creditPeriodDays: 30,
    paymentDueDate: '',
    paymentTerms: 'Cash on delivery',
    deliveryAddress: 'GT Printing Press Main Plant, Addis Ababa',
    discountAmount: 0,
    taxAmount: 0,
    shippingCost: 0,
    otherExpenses: 0,
    currency: 'ETB',
    notes: '',
    items: [
      {
        item: '',
        description: '',
        quantity: 1,
        unitOfMeasurement: 'piece',
        unitPrice: 0,
        discount: 0,
        taxPercentage: 15
      }
    ]
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [poRes, supRes, whRes, itemRes] = await Promise.allSettled([
        purchasingService.getPurchaseOrders({ limit: 120 }),
        purchasingService.getSuppliers({ limit: 100 }),
        purchasingService.getWarehouses({ limit: 50 }),
        purchasingService.getItems({ limit: 150 })
      ]);

      if (poRes.status === 'fulfilled' && poRes.value?.data) {
        setOrders(Array.isArray(poRes.value.data) ? poRes.value.data : []);
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
      console.error('Failed to load purchase orders:', err);
      setError(err.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check URL parameter for auto opening detail
  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId && orders.length > 0) {
      const found = orders.find((o) => o._id === paramId);
      if (found) {
        setSelectedOrder(found);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams, orders]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // When supplier selected in form, autofill payment terms and default credit days
  const handleSelectSupplier = (supId) => {
    const sup = suppliers.find((s) => s._id === supId);
    if (!sup) {
      setFormData((prev) => ({ ...prev, supplier: '' }));
      return;
    }

    const isCredit = sup.paymentTerms === 'credit';
    const creditDays = sup.creditPeriodDays || 30;

    const orderD = formData.orderDate ? new Date(formData.orderDate) : new Date();
    const dueDate = new Date(orderD.getTime() + creditDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    setFormData((prev) => ({
      ...prev,
      supplier: supId,
      paymentType: isCredit ? 'credit' : 'cash',
      creditPeriodDays: creditDays,
      paymentDueDate: isCredit ? dueDate : '',
      paymentTerms: isCredit ? `Net ${creditDays} days` : 'Cash on delivery'
    }));
  };

  // Master VAT Mode Toggle (With VAT vs Without VAT)
  const handleToggleVat = (enabled) => {
    setIncludeVat(enabled);
    setFormData((prev) => {
      const updatedItems = prev.items.map((i) => ({
        ...i,
        taxPercentage: enabled ? 15 : 0
      }));
      return {
        ...prev,
        taxAmount: enabled ? prev.taxAmount : 0,
        items: updatedItems
      };
    });
  };

  // Add Item Line
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: '',
          description: '',
          quantity: 1,
          unitOfMeasurement: 'piece',
          unitPrice: 0,
          discount: 0,
          taxPercentage: includeVat ? 15 : 0
        }
      ]
    }));
  };

  // Remove Item Line
  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Change Item Line
  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'item') {
        const itemObj = inventoryItems.find((i) => i._id === value);
        if (itemObj) {
          updated[index].description = itemObj.itemName;
          updated[index].unitOfMeasurement = itemObj.unitOfMeasurement || 'piece';
          if (itemObj.unitCost) {
            updated[index].unitPrice = itemObj.unitCost;
          }
        }
      }

      return { ...prev, items: updated };
    });
  };

  // Compute subtotal and grand total
  const computeTotals = () => {
    let subtotal = 0;
    let itemsTax = 0;

    formData.items.forEach((itm) => {
      const qty = Number(itm.quantity || 0);
      const price = Number(itm.unitPrice || 0);
      const discount = Number(itm.discount || 0);
      const taxPct = Number(itm.taxPercentage || 0);

      const netLine = Math.max(0, qty * price - discount);
      subtotal += netLine;
      itemsTax += (netLine * taxPct) / 100;
    });

    const taxAmount = Number(formData.taxAmount) || itemsTax;
    const shipping = Number(formData.shippingCost || 0);
    const other = Number(formData.otherExpenses || 0);
    const discountAmount = Number(formData.discountAmount || 0);

    const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount + shipping + other);

    return { subtotal, taxAmount, grandTotal };
  };

  // Handle PO Creation Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.supplier) {
      setFormError('Please select a supplier');
      return;
    }
    if (!formData.warehouse) {
      setFormError('Please select a destination warehouse');
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      setFormError('At least one item is required');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const itm = formData.items[i];
      if (!itm.item) {
        setFormError(`Item #${i + 1} must select a product from the inventory catalog`);
        return;
      }
      if (Number(itm.quantity) <= 0) {
        setFormError(`Item #${i + 1} quantity must be greater than zero`);
        return;
      }
      if (Number(itm.unitPrice) <= 0) {
        setFormError(`Item #${i + 1} unit price must be greater than zero`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.createPurchaseOrder(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        // Reset form
        setFormData({
          supplier: '',
          warehouse: '',
          orderDate: new Date().toISOString().split('T')[0],
          expectedDeliveryDate: '',
          paymentType: 'cash',
          creditPeriodDays: 30,
          paymentDueDate: '',
          paymentTerms: 'Cash on delivery',
          deliveryAddress: 'GT Printing Press Main Plant, Addis Ababa',
          discountAmount: 0,
          taxAmount: 0,
          shippingCost: 0,
          otherExpenses: 0,
          currency: 'ETB',
          notes: '',
          items: [
            {
              item: '',
              description: '',
              quantity: 1,
              unitOfMeasurement: 'piece',
              unitPrice: 0,
              discount: 0,
              taxPercentage: 15
            }
          ]
        });
        await fetchData();
      } else {
        setFormError(res.message || 'Failed to create purchase order');
      }
    } catch (err) {
      console.error('Error creating purchase order:', err);
      setFormError(err.message || 'Failed to submit purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approve PO
  const handleApprovePO = async (poId) => {
    if (!window.confirm('Approve this purchase order? If on credit, this will synchronize supplier credit payable balance.')) {
      return;
    }
    try {
      const res = await purchasingService.approvePurchaseOrder(poId, { comment: 'Official approval' });
      if (res.success) {
        await fetchData();
        if (selectedOrder && selectedOrder._id === poId) {
          setSelectedOrder(res.data);
        }
      } else {
        alert(res.message || 'Failed to approve purchase order');
      }
    } catch (err) {
      alert(err.message || 'Error approving purchase order');
    }
  };

  // Handle Mark Sent to Supplier
  const handleSendPO = async (poId) => {
    if (!window.confirm('Mark this purchase order as officially sent to supplier?')) {
      return;
    }
    try {
      const res = await purchasingService.sendPurchaseOrderToSupplier(poId);
      if (res.success) {
        await fetchData();
        if (selectedOrder && selectedOrder._id === poId) {
          setSelectedOrder(res.data);
        }
      } else {
        alert(res.message || 'Failed to mark PO as sent');
      }
    } catch (err) {
      alert(err.message || 'Error updating order status');
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (paymentTypeFilter && o.paymentType !== paymentTypeFilter) return false;
    if (paymentStatusFilter && o.paymentStatus !== paymentStatusFilter) return false;
    if (supplierFilter && o.supplier?._id !== supplierFilter && o.supplier !== supplierFilter) return false;
    if (vatFilter === 'with_vat' && (!o.taxAmount || Number(o.taxAmount) <= 0)) return false;
    if (vatFilter === 'without_vat' && Number(o.taxAmount || 0) > 0) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchNum = o.purchaseOrderNumber?.toLowerCase().includes(term);
      const matchSupp = o.supplier?.supplierName?.toLowerCase().includes(term);
      const matchTerms = o.paymentTerms?.toLowerCase().includes(term);
      const matchNotes = o.notes?.toLowerCase().includes(term);
      if (!matchNum && !matchSupp && !matchTerms && !matchNotes) return false;
    }
    return true;
  });

  const totals = computeTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary-500" />
            {t('Purchase Orders (PO)')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('issue official purchasing agreements, track supplier delivery, credit terms, and status')}
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
            {t('create purchase order')}
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
            <option value="draft">{t('draft')}</option>
            <option value="pending">{t('pending')}</option>
            <option value="approved">{t('approved')}</option>
            <option value="sent">{t('sent')}</option>
            <option value="partially received">{t('partially received')}</option>
            <option value="received">{t('received')}</option>
            <option value="completed">{t('completed')}</option>
            <option value="cancelled">{t('cancelled', 'Cancelled')}</option>
          </select>

          <select
            value={vatFilter}
            onChange={(e) => setVatFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Purchases (VAT & Non-VAT)</option>
            <option value="with_vat">With VAT (15%)</option>
            <option value="without_vat">Without VAT (Non-VAT / Exempt)</option>
          </select>

          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all payment types')}</option>
            <option value="cash">{t('cash on delivery')}</option>
            <option value="credit">{t('credit (ap)')}</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all payment statuses')}</option>
            <option value="unpaid">{t('unpaid')}</option>
            <option value="partially paid">{t('partially paid')}</option>
            <option value="paid">{t('paid')}</option>
            <option value="overdue">{t('overdue')}</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all suppliers')}</option>
            {suppliers.map((s) => (
              <option key={s._id} value={s._id}>
                {s.supplierName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
            <p className="text-sm">{t('loading purchasing & procurement metrics...')}</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={t('no purchase orders created yet.')}
            description={search || statusFilter ? t('Try adjusting your search filters.') : t('no purchase orders created yet.')}
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 text-white"
              >
                {t('create purchase order')}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">{t('po number')}</th>
                  <th className="py-3 px-4 font-bold">{t('supplier')}</th>
                  <th className="py-3 px-4 font-bold">{t('warehouse')}</th>
                  <th className="py-3 px-4 font-bold">{t('order date')}</th>
                  <th className="py-3 px-4 font-bold">{t('grand total')}</th>
                  <th className="py-3 px-4 font-bold">{t('payment type')}</th>
                  <th className="py-3 px-4 font-bold">{t('payment status')}</th>
                  <th className="py-3 px-4 font-bold">{t('order status')}</th>
                  <th className="py-3 px-4 font-bold text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredOrders.map((o) => {
                  const isCredit = o.paymentType === 'credit';
                  const isOverdue = isCredit && o.paymentDueDate && new Date(o.paymentDueDate) < new Date() && (o.balanceDue || 0) > 0;

                  return (
                    <tr key={o._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <button
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsDetailModalOpen(true);
                          }}
                          className="hover:underline text-primary-600 dark:text-primary-400 font-mono"
                        >
                          {o.purchaseOrderNumber}
                        </button>
                        {o.purchaseRequest && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Ref: {typeof o.purchaseRequest === 'object' ? o.purchaseRequest.requestNumber : 'PR Requisition'}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        <Link to={`/purchasing/suppliers?id=${o.supplier?._id || o.supplier}`} className="hover:underline">
                          {o.supplier?.supplierName || 'Supplier'}
                        </Link>
                        <div className="text-[10px] text-slate-400">
                          {o.supplier?.supplierCode || ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {o.warehouse?.warehouseName || 'Warehouse'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(o.orderDate || o.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(o.grandTotal)}
                        {o.taxAmount > 0 ? (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            With VAT (15%)
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-medium">
                            Without VAT
                          </div>
                        )}
                        {o.paidAmount > 0 && (
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            Paid: {formatCurrency(o.paidAmount)}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-md ${
                          isCredit ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          <CreditCard className="w-3 h-3" />
                          {isCredit ? 'Credit (AP)' : 'Cash'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <Badge status={o.paymentStatus} text={o.paymentStatus} size="xs" />
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" /> Overdue
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={o.status} text={o.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setIsDetailModalOpen(true);
                            }}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setIsPrintModalOpen(true);
                            }}
                            title="Print Purchase Order Voucher"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Approve Action */}
                          {(o.status === 'draft' || o.status === 'pending') && hasRole(['admin', 'manager']) && (
                            <button
                              onClick={() => handleApprovePO(o._id)}
                              title="Approve Purchase Order"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}

                          {/* Send to Supplier Action */}
                          {o.status === 'approved' && hasRole(['admin', 'manager', 'purchaser']) && (
                            <button
                              onClick={() => handleSendPO(o._id)}
                              title="Mark Sent to Supplier"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-1"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Send
                            </button>
                          )}

                          {/* Receive Goods GRV Shortcut */}
                          {(o.status === 'sent' || o.status === 'approved' || o.status === 'partially received') && (
                            <Link
                              to={`/purchasing/goods-receipts?poId=${o._id}`}
                              title="Receive Goods (GRV)"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                              Receive
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE PURCHASE ORDER MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Official Purchase Order (PO)"
        maxWidth="max-w-5xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Vendor / Supplier *
              </label>
              <select
                value={formData.supplier}
                onChange={(e) => handleSelectSupplier(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.supplierName} ({s.supplierCode}) - {s.paymentTerms}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Receiving Warehouse *
              </label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              >
                <option value="">-- Select Warehouse --</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.warehouseName} ({wh.warehouseCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={formData.orderDate}
                onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Type
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="cash">Cash on Delivery</option>
                <option value="credit">Credit / Account Payable</option>
              </select>
            </div>

            {formData.paymentType === 'credit' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                    Credit Period (Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.creditPeriodDays}
                    onChange={(e) => setFormData({ ...formData, creditPeriodDays: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.paymentDueDate}
                    onChange={(e) => setFormData({ ...formData, paymentDueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Delivery Address
            </label>
            <input
              type="text"
              value={formData.deliveryAddress}
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Master VAT Mode Toggle Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Tax Calculation (VAT):
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    includeVat
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {includeVat ? 'With VAT (15% Tax Applied)' : 'Without VAT (Non-VAT / Tax Exempt)'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Toggle to automatically apply or remove 15% VAT across all items
              </p>
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800">
              <button
                type="button"
                onClick={() => handleToggleVat(true)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  includeVat
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                With VAT (15%)
              </button>
              <button
                type="button"
                onClick={() => handleToggleVat(false)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                  !includeVat
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Without VAT (0%)
              </button>
            </div>
          </div>

          {/* Line Items Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Order Line Items *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-primary-600 hover:text-primary-500 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {formData.items.map((itm, idx) => {
                const qty = Number(itm.quantity || 0);
                const price = Number(itm.unitPrice || 0);
                const disc = Number(itm.discount || 0);
                const tax = Number(itm.taxPercentage || 0);
                const discounted = Math.max(0, qty * price - disc);
                const lineTotal = discounted + (discounted * tax) / 100;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Item #{idx + 1}</span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Select Inventory Item *
                        </label>
                        <select
                          value={itm.item}
                          onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          required
                        >
                          <option value="">-- Choose Product --</option>
                          {inventoryItems.map((inv) => (
                            <option key={inv._id} value={inv._id}>
                              {inv.itemName} ({inv.itemCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Description / Specs
                        </label>
                        <input
                          type="text"
                          value={itm.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={itm.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          UOM
                        </label>
                        <select
                          value={itm.unitOfMeasurement}
                          onChange={(e) => handleItemChange(idx, 'unitOfMeasurement', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          {COMMON_UOMS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Unit Price (ETB) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={itm.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Discount (ETB)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={itm.discount}
                          onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          VAT %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={itm.taxPercentage}
                          onChange={(e) => handleItemChange(idx, 'taxPercentage', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Line Total
                        </label>
                        <div className="px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expenses & Totals Summary */}
            <div className="mt-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">Subtotal:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-semibold">VAT (Tax):</span>
                    <span className={`font-bold ${totals.taxAmount > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {totals.taxAmount > 0 ? `${formatCurrency(totals.taxAmount)} (15%)` : 'ETB 0.00 (Non-VAT)'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] font-semibold">Estimated Grand Total:</span>
                  <span className="text-sm font-black text-primary-600 dark:text-primary-400">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Order Discount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Shipping / Freight Cost
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.shippingCost}
                    onChange={(e) => setFormData({ ...formData, shippingCost: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                    Other Expenses
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.otherExpenses}
                    onChange={(e) => setFormData({ ...formData, otherExpenses: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Grand Total (ETB)</span>
                  <span className="text-base font-black text-primary-600">
                    {formatCurrency(totals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Generating PO...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Purchase Order - ${selectedOrder?.purchaseOrderNumber || ''}`}
        maxWidth="max-w-4xl"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block">Supplier:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedOrder.supplier?.supplierName || 'N/A'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {selectedOrder.supplier?.phoneNumber || ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Warehouse:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedOrder.warehouse?.warehouseName || 'Main Store'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Terms:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedOrder.paymentTerms || 'Cash'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <Badge status={selectedOrder.status} text={selectedOrder.status} size="xs" />
              </div>
            </div>

            {/* Financial Status Banner */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Grand Total:</span>
                <span className="text-base font-black text-slate-900 dark:text-slate-100">
                  {formatCurrency(selectedOrder.grandTotal)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Amount Paid:</span>
                <span className="text-base font-bold text-emerald-600">
                  {formatCurrency(selectedOrder.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Balance Due:</span>
                <span className="text-base font-bold text-rose-600">
                  {formatCurrency(selectedOrder.balanceDue)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Payment Status:</span>
                <Badge status={selectedOrder.paymentStatus} text={selectedOrder.paymentStatus} size="xs" />
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Order Items & Receiving Status
              </h4>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Ordered</th>
                      <th className="py-2 px-3">Received</th>
                      <th className="py-2 px-3">Unit Price</th>
                      <th className="py-2 px-3">VAT</th>
                      <th className="py-2 px-3 text-right">Total Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {selectedOrder.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.item?.itemName || item.description}
                          {item.description && (
                            <div className="text-[10px] text-slate-400 font-normal">{item.description}</div>
                          )}
                        </td>
                        <td className="py-2 px-3">{item.quantity} {item.unitOfMeasurement}</td>
                        <td className="py-2 px-3 font-bold text-emerald-600">
                          {item.receivedQuantity || 0} {item.unitOfMeasurement}
                        </td>
                        <td className="py-2 px-3">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-2 px-3">{item.taxPercentage}%</td>
                        <td className="py-2 px-3 text-right font-bold">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* PRINTABLE VOUCHER MODAL */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Purchase Order Voucher (Print Preview)"
        maxWidth="max-w-3xl"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div id="po-printable-area" className="p-6 bg-white text-slate-900 rounded-xl border border-slate-300">
              {/* GT Printing Header */}
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <img src="/gt-logo.jpg" alt="GT Logo" className="h-12 w-12 object-contain" />
                  <div>
                    <h2 className="text-xl font-black text-slate-900">GT PRINTING PRESS PLC</h2>
                    <p className="text-xs text-slate-500">Official Purchase Order Document</p>
                    <p className="text-[10px] text-slate-400">Addis Ababa, Ethiopia | Tel: +251 11 000 0000</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase">Purchase Order</div>
                  <div className="text-base font-black text-primary-600 font-mono">
                    {selectedOrder.purchaseOrderNumber}
                  </div>
                  <div className="text-xs text-slate-500">
                    Date: {new Date(selectedOrder.orderDate || selectedOrder.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Vendor & Delivery Box */}
              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <h4 className="font-bold uppercase text-[10px] text-slate-400 mb-1">Vendor / Supplier</h4>
                  <div className="font-bold text-sm">{selectedOrder.supplier?.supplierName}</div>
                  <div>Code: {selectedOrder.supplier?.supplierCode}</div>
                  <div>TIN: {selectedOrder.supplier?.tin || 'N/A'}</div>
                  <div>Phone: {selectedOrder.supplier?.phoneNumber || 'N/A'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border">
                  <h4 className="font-bold uppercase text-[10px] text-slate-400 mb-1">Delivery Destination</h4>
                  <div className="font-bold text-sm">{selectedOrder.warehouse?.warehouseName || 'Main Store'}</div>
                  <div>Address: {selectedOrder.deliveryAddress || 'GT Plant'}</div>
                  <div>Terms: {selectedOrder.paymentTerms}</div>
                  {selectedOrder.paymentDueDate && (
                    <div>Due Date: {new Date(selectedOrder.paymentDueDate).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border border-slate-200 mb-4">
                <thead className="bg-slate-100 font-bold">
                  <tr>
                    <th className="py-2 px-3 border-b">#</th>
                    <th className="py-2 px-3 border-b">Item & Specification</th>
                    <th className="py-2 px-3 border-b">Qty</th>
                    <th className="py-2 px-3 border-b">UOM</th>
                    <th className="py-2 px-3 border-b">Unit Price</th>
                    <th className="py-2 px-3 border-b text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((itm, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3">{i + 1}</td>
                      <td className="py-2 px-3 font-medium">
                        {itm.item?.itemName || itm.description}
                      </td>
                      <td className="py-2 px-3">{itm.quantity}</td>
                      <td className="py-2 px-3">{itm.unitOfMeasurement}</td>
                      <td className="py-2 px-3">{formatCurrency(itm.unitPrice)}</td>
                      <td className="py-2 px-3 text-right font-bold">{formatCurrency(itm.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total Calculation Summary */}
              <div className="flex justify-end text-xs mb-8">
                <div className="w-64 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-bold">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VAT / Tax:</span>
                    <span className={`font-bold ${selectedOrder.taxAmount > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {selectedOrder.taxAmount > 0 ? `${formatCurrency(selectedOrder.taxAmount)} (15% VAT)` : 'ETB 0.00 (Non-VAT)'}
                    </span>
                  </div>
                  {selectedOrder.shippingCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shipping / Freight:</span>
                      <span className="font-bold">{formatCurrency(selectedOrder.shippingCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t pt-1 text-slate-900">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(selectedOrder.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t text-xs text-center text-slate-500">
                <div>
                  <div className="border-b border-slate-300 pb-12 mb-1"></div>
                  <span>Prepared By / Procurement Officer</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-12 mb-1"></div>
                  <span>Authorized Signature / Managing Director</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Document
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

