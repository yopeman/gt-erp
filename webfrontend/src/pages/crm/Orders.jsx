import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import { extractArray, extractData } from '../../services/api';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Receipt,
  Plus,
  Search,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Building2,
  User,
  Palette,
  FileCheck,
  Truck,
  RotateCcw
} from 'lucide-react';

const ORDER_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'design_in_progress', label: 'In Design' },
  { value: 'design_approved', label: 'Design Approved' },
  { value: 'in_production', label: 'In Production' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'qc_completed', label: 'QC Passed' },
  { value: 'ready_for_delivery', label: 'Ready for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function Orders() {
  const { t } = useTranslation();

  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [newStatus, setNewStatus] = useState('');

  // New Order Form State
  const [formData, setFormData] = useState({
    customer: '',
    salesRepresentative: '',
    priority: 'medium',
    deliveryDeadline: '',
    assignedDesigner: '',
    discountAmount: 0,
    notes: '',
    items: [
      {
        service: '',
        productTitle: '',
        quantity: 1000,
        unitOfMeasurement: 'copy',
        unitPrice: 15,
        subtotal: 15000,
        specifications: {
          dimensions: { width: 210, height: 297, unit: 'mm' }, // A4
          pages: 16,
          paperType: '150 GSM Art Paper',
          colorFormat: '4/4 CMYK',
          finishingOptions: ['gloss_lamination'],
          bindingType: 'saddle_stitch'
        }
      }
    ]
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;

      const [ordersRes, statsRes] = await Promise.allSettled([
        crmService.getOrders(params),
        crmService.getOrderStatistics()
      ]);

      if (ordersRes.status === 'fulfilled') {
        setOrders(extractArray(ordersRes.value, 'orders'));
      } else {
        console.error('Failed to fetch sales orders:', ordersRes.reason);
        setError(ordersRes.reason?.message || t('Failed to fetch sales orders'));
      }

      if (statsRes.status === 'fulfilled') {
        setStats(extractData(statsRes.value));
      }
    } catch (err) {
      setError(err?.message || t('Failed to fetch sales orders'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLookups = async () => {
    try {
      const [custsRes, empsRes, srvsRes] = await Promise.allSettled([
        crmService.getCustomers({ limit: 100 }),
        crmService.getEmployees({ limit: 100 }),
        crmService.getServices({ limit: 100 })
      ]);
      if (custsRes.status === 'fulfilled') setCustomers(extractArray(custsRes.value, 'customers'));
      if (empsRes.status === 'fulfilled') setEmployees(extractArray(empsRes.value, 'employees'));
      if (srvsRes.status === 'fulfilled') setServices(extractArray(srvsRes.value, 'services'));
    } catch {
      // Non-blocking lookup
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchLookups();
  }, []);

  const handleOpenCreateModal = () => {
    // Default deadline to 7 days from now
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const deadlineStr = d.toISOString().slice(0, 10);

    const firstService = services[0];

    setFormData({
      customer: customers[0]?._id || '',
      salesRepresentative: employees[0]?._id || '',
      priority: 'medium',
      deliveryDeadline: deadlineStr,
      assignedDesigner: '',
      discountAmount: 0,
      notes: '',
      items: [
        {
          service: firstService?._id || '',
          productTitle: firstService ? `${firstService.name} Print Run` : 'Printing Job',
          quantity: firstService?.pricingModel?.minimumOrderQuantity || 1000,
          unitOfMeasurement: firstService?.pricingModel?.unitOfMeasurement || 'copy',
          unitPrice: firstService?.pricingModel?.basePrice || 25,
          subtotal: (firstService?.pricingModel?.minimumOrderQuantity || 1000) * (firstService?.pricingModel?.basePrice || 25),
          specifications: {
            dimensions: { width: 210, height: 297, unit: 'mm' },
            pages: 16,
            paperType: '150 GSM Art Paper',
            colorFormat: '4/4 CMYK',
            finishingOptions: ['gloss_lamination'],
            bindingType: 'saddle_stitch'
          }
        }
      ]
    });
    setIsCreateModalOpen(true);
  };

  const handleAddItem = () => {
    const firstService = services[0];
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          service: firstService?._id || '',
          productTitle: 'Additional Item',
          quantity: 500,
          unitOfMeasurement: 'copy',
          unitPrice: 10,
          subtotal: 5000,
          specifications: {
            dimensions: { width: 210, height: 297, unit: 'mm' },
            pages: 4,
            paperType: '120 GSM Woodfree',
            colorFormat: '4/4 CMYK',
            finishingOptions: [],
            bindingType: 'none'
          }
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
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = Number(field === 'quantity' ? value : updated[idx].quantity);
      const price = Number(field === 'unitPrice' ? value : updated[idx].unitPrice);
      updated[idx].subtotal = qty * price;
    }
    setFormData({ ...formData, items: updated });
  };

  const handleItemSpecChange = (idx, specField, value) => {
    const updated = [...formData.items];
    updated[idx].specifications = {
      ...updated[idx].specifications,
      [specField]: value
    };
    setFormData({ ...formData, items: updated });
  };

  // Financial calculations
  const calculateTotals = () => {
    const subtotal = formData.items.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    const discount = Number(formData.discountAmount || 0);
    const taxable = Math.max(0, subtotal - discount);
    const vat = (taxable * 15) / 100;
    const grandTotal = taxable + vat;
    return { subtotal, discount, vat, grandTotal };
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { subtotal, discount, vat, grandTotal } = calculateTotals();

      const payload = {
        customer: formData.customer,
        salesRepresentative: formData.salesRepresentative,
        priority: formData.priority,
        deliveryDeadline: formData.deliveryDeadline,
        assignedDesigner: formData.assignedDesigner || undefined,
        notes: formData.notes,
        items: formData.items,
        financials: {
          subtotal,
          discountAmount: discount,
          vatRate: 15,
          vatAmount: vat,
          grandTotal,
          currency: 'ETB'
        }
      };

      await crmService.createOrder(payload);
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err) {
      alert(err?.message || t('Error creating order'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenStatusModal = (order) => {
    setStatusModalOrder(order);
    setNewStatus(order.status);
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!statusModalOrder) return;
    try {
      setSubmitting(true);
      await crmService.updateOrderStatus(statusModalOrder._id, { status: newStatus });
      setStatusModalOrder(null);
      fetchOrders();
    } catch (err) {
      alert(err?.message || t('Failed to update order status'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewOrder = async (id) => {
    try {
      const res = await crmService.getOrderById(id);
      setViewingOrder(res.data || res);
    } catch (err) {
      alert(err?.message || t('Failed to load order details'));
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(val || 0);
  };

  const getOrderStatusVariant = (status) => {
    switch (status) {
      case 'confirmed': return 'info';
      case 'design_in_progress': return 'purple';
      case 'design_approved': return 'primary';
      case 'in_production': return 'warning';
      case 'finishing': return 'indigo';
      case 'qc_completed': return 'cyan';
      case 'ready_for_delivery': return 'blue';
      case 'delivered': return 'emerald';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary-500" />
            {t('Printing Orders & Production Jobs')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Create sales orders with detailed printing specifications, calculate VAT and costs, and route to pre-press design.')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/crm/design-proofing"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
          >
            <Palette className="w-4 h-4 text-primary-500" />
            {t('Pre-press Proofing')}
          </Link>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            {t('Create Sales Order')}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stats Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Total Sales Orders')}</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalOrders}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Active in Pipe')}</span>
            <div className="text-2xl font-black text-primary-600 dark:text-primary-400 mt-1">{stats.activeOrders}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('In Production')}</span>
            <div className="text-2xl font-black text-amber-500 mt-1">{stats.stageCounts?.inProduction || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('Total Revenue')}</span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(stats.totalRevenue)}</div>
          </div>
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
            onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
            placeholder={t('Search by order #, client, or title...')}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{t(s.label)}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          >
            <option value="all">{t('All Priorities')}</option>
            <option value="urgent">{t('Urgent')}</option>
            <option value="high">{t('High')}</option>
            <option value="medium">{t('Medium')}</option>
            <option value="low">{t('Low')}</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">{t('Loading printing orders...')}</div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={t('No orders found')}
            description={t('Create your first customer sales order to initiate production routing.')}
            actionLabel={t('Create Sales Order')}
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">{t('Order #')}</th>
                  <th className="py-3 px-4">{t('Customer')}</th>
                  <th className="py-3 px-4">{t('Product / Item')}</th>
                  <th className="py-3 px-4">{t('Deadline')}</th>
                  <th className="py-3 px-4">{t('Grand Total')} (ETB)</th>
                  <th className="py-3 px-4">{t('Status')}</th>
                  <th className="py-3 px-4 text-right">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((ord) => {
                  const firstItem = ord.items?.[0] || {};
                  return (
                    <tr key={ord._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {ord.orderNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{ord.customer?.name || ord.customer?.companyName || t('Customer')}</div>
                        <div className="text-[11px] text-slate-400">{t('Rep')}: {ord.salesRepresentative?.firstName} {ord.salesRepresentative?.lastName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {firstItem.productTitle || t('Printing Job')}
                          {ord.items?.length > 1 && ` (+${ord.items.length - 1} ${t('more')})`}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {t('Qty')}: {firstItem.quantity?.toLocaleString()} {firstItem.unitOfMeasurement || 'copies'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(ord.deliveryDeadline).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {formatCurrency(ord.financials?.grandTotal)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={getOrderStatusVariant(ord.status)}>
                          {t(ord.status.replace(/_/g, ' '))}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewOrder(ord._id)}
                            title={t('View Full Order Specifications')}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenStatusModal(ord)}
                            title={t('Advance / Update Status')}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
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

      {/* Create Sales Order Wizard Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('Create New Printing Sales Order')}
      >
        <form onSubmit={handleSaveOrder} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header row: Customer & Rep & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('Customer')} *</label>
              <select
                required
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- {t('Choose Customer')} --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name || c.companyName || t('Customer')} [{c.customerNumber || ''}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('Sales Rep')} *</label>
              <select
                required
                value={formData.salesRepresentative}
                onChange={(e) => setFormData({ ...formData, salesRepresentative: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- {t('Choose Rep')} --</option>
                {employees.map((e) => {
                  const name = e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || 'Sales Rep';
                  return (
                    <option key={e._id} value={e._id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('Delivery Deadline')} *</label>
              <input
                type="date"
                required
                value={formData.deliveryDeadline}
                onChange={(e) => setFormData({ ...formData, deliveryDeadline: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Line Items Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('Order Line Items & Printing Specifications')}
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 px-2 py-1 rounded-md bg-primary-50 dark:bg-primary-950/60"
              >
                + {t('Add Item')}
              </button>
            </div>

            {formData.items.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t('Item')} #{idx + 1}</span>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 text-xs font-semibold hover:underline"
                    >
                      {t('Remove Item')}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('Service')} *</label>
                    <select
                      required
                      value={item.service}
                      onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">-- {t('Select Service')} --</option>
                      {services.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.category.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('Product Title')} *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 2026 Annual Calendar"
                      value={item.productTitle}
                      onChange={(e) => handleItemChange(idx, 'productTitle', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('Quantity')}</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">{t('Unit Price')} (ETB)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Printing Specs Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Paper Type / GSM')}</label>
                    <input
                      type="text"
                      placeholder="e.g. 150 GSM Art Paper"
                      value={item.specifications?.paperType || ''}
                      onChange={(e) => handleItemSpecChange(idx, 'paperType', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Color Format')}</label>
                    <input
                      type="text"
                      placeholder="e.g. 4/4 CMYK"
                      value={item.specifications?.colorFormat || ''}
                      onChange={(e) => handleItemSpecChange(idx, 'colorFormat', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Page Count')}</label>
                    <input
                      type="number"
                      min="1"
                      value={item.specifications?.pages || 1}
                      onChange={(e) => handleItemSpecChange(idx, 'pages', Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">{t('Binding Type')}</label>
                    <input
                      type="text"
                      placeholder="e.g. Saddle Stitch"
                      value={item.specifications?.bindingType || ''}
                      onChange={(e) => handleItemSpecChange(idx, 'bindingType', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                  {t('Item Subtotal')}: {formatCurrency(item.subtotal)}
                </div>
              </div>
            ))}
          </div>

          {/* Designer Assignment & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('Assign Pre-press Graphic Designer')}
              </label>
              <select
                value={formData.assignedDesigner}
                onChange={(e) => setFormData({ ...formData, assignedDesigner: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="">-- {t('No Designer (Skip to Production)')} --</option>
                {employees.map((e) => {
                  const name = e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name || 'Designer';
                  return (
                    <option key={e._id} value={e._id}>
                      {name} ({e.position || 'Designer'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">{t('Discount')} (ETB)</label>
              <input
                type="number"
                min="0"
                value={formData.discountAmount}
                onChange={(e) => setFormData({ ...formData, discountAmount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Automated Financial Summary Box */}
          {(() => {
            const { subtotal, discount, vat, grandTotal } = calculateTotals();
            return (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{t('Subtotal')}:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>{t('Discount')}:</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>{t('15% Ethiopian VAT')}:</span>
                  <span>{formatCurrency(vat)}</span>
                </div>
                <div className="flex justify-between text-sm font-black pt-1 border-t border-slate-800 text-emerald-400">
                  <span>{t('Grand Total')}:</span>
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
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {submitting ? t('Creating...') : t('Create Sales Order')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Advance / Change Status Modal */}
      {statusModalOrder && (
        <Modal
          isOpen={Boolean(statusModalOrder)}
          onClose={() => setStatusModalOrder(null)}
          title={`${t('Update Order Status')}: ${statusModalOrder.orderNumber}`}
        >
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('New Order Lifecycle Status')}
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="confirmed">{t('Confirmed')}</option>
                <option value="design_in_progress">{t('In Design')}</option>
                <option value="design_approved">{t('Design Approved')}</option>
                <option value="in_production">{t('In Production')}</option>
                <option value="finishing">{t('Finishing & Binding')}</option>
                <option value="qc_completed">{t('Quality Inspection Passed')}</option>
                <option value="ready_for_delivery">{t('Ready for Delivery')}</option>
                <option value="delivered">{t('Delivered to Customer')}</option>
                <option value="completed">{t('Completed & Closed')}</option>
                <option value="cancelled">{t('Cancelled')}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStatusModalOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
              >
                {submitting ? t('Updating...') : t('Update Status')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Full Order Details Drawer */}
      {viewingOrder && (
        <Modal
          isOpen={Boolean(viewingOrder)}
          onClose={() => setViewingOrder(null)}
          title={`${t('Order Dossier')}: ${viewingOrder.orderNumber}`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            {/* Header overview */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{viewingOrder.customer?.name || viewingOrder.customer?.companyName || t('Customer')}</h3>
                <span className="text-slate-400">{t('Deadline')}: {new Date(viewingOrder.deliveryDeadline).toLocaleDateString()}</span>
              </div>
              <Badge variant={getOrderStatusVariant(viewingOrder.status)}>
                {t(viewingOrder.status.replace(/_/g, ' '))}
              </Badge>
            </div>

            {/* Line Items & Specifications */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                {t('Product Specifications')}
              </h4>
              {viewingOrder.items?.map((it, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span>{it.productTitle}</span>
                    <span>{formatCurrency(it.subtotal)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 grid grid-cols-2 gap-2">
                    <span>{t('Quantity')}: {it.quantity?.toLocaleString()} {it.unitOfMeasurement}</span>
                    <span>{t('Paper')}: {it.specifications?.paperType || 'Standard'}</span>
                    <span>{t('Colors')}: {it.specifications?.colorFormat || '4/4 CMYK'}</span>
                    <span>{t('Binding')}: {it.specifications?.bindingType || 'None'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>{t('Subtotal')}:</span>
                <span>{formatCurrency(viewingOrder.financials?.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>{t('15% VAT')}:</span>
                <span>{formatCurrency(viewingOrder.financials?.vatAmount)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-emerald-400 pt-1 border-t border-slate-800">
                <span>{t('Grand Total')}:</span>
                <span>{formatCurrency(viewingOrder.financials?.grandTotal)}</span>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

