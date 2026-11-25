import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
import storeService from '../../services/storeService';
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
  RotateCcw,
  Layers,
  Box,
  Calculator,
  Sparkles,
  Package
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
  const [inventoryItems, setInventoryItems] = useState([]);
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

  // Helper to generate default materials for a service
  const createDefaultMaterials = (quantity = 1000) => [];

  // Core calculation engine: computes materials total, cost per unit, unit price (materials + user profit margin % vs catalog base price), and line subtotal
  const recalculateItem = (item, matchedService) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const materials = Array.isArray(item.materials) ? item.materials : [];
    const profitMargin = item.profitMargin !== undefined && item.profitMargin !== null && item.profitMargin !== ''
      ? Math.max(0, Number(item.profitMargin))
      : 30;

    const updatedMaterials = materials.map((m) => {
      const mQty = Number(m.quantity) || 0;
      const mCost = Number(m.unitCost) || 0;
      return {
        ...m,
        quantity: mQty,
        unitCost: mCost,
        totalCost: Math.round(mQty * mCost * 100) / 100
      };
    });

    const totalMaterialCost = updatedMaterials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);
    const costPerUnit = totalMaterialCost > 0 ? totalMaterialCost / qty : 0;
    const basePrice = Number(matchedService?.pricingModel?.basePrice || 0);

    // Rule: Materials cost with user-specified profit margin %, floored at catalog base price
    let calculatedUnitPrice = 0;
    if (totalMaterialCost > 0) {
      const marginFactor = 1 + (profitMargin / 100);
      const priceWithMargin = Math.round(costPerUnit * marginFactor * 100) / 100;
      calculatedUnitPrice = Math.max(basePrice, priceWithMargin);
    } else {
      calculatedUnitPrice = basePrice;
    }

    if (calculatedUnitPrice === 0 && Number(item.unitPrice) > 0 && materials.length === 0) {
      calculatedUnitPrice = Number(item.unitPrice);
    }

    const subtotal = Math.round(qty * calculatedUnitPrice * 100) / 100;

    return {
      ...item,
      quantity: qty,
      profitMargin,
      materials: updatedMaterials,
      unitPrice: calculatedUnitPrice,
      subtotal
    };
  };

  // Initial materials & item pricing
  const defaultInitMaterials = createDefaultMaterials(1000);
  const defaultInitCost = defaultInitMaterials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);
  const defaultInitUnitCost = defaultInitCost / 1000;
  const defaultInitMargin = 30;
  const defaultInitUnitPrice = Math.max(25, Math.round(defaultInitUnitCost * (1 + defaultInitMargin / 100) * 100) / 100);

  // New Order Form State
  const [formData, setFormData] = useState({
    customer: '',
    salesRepresentative: '',
    priority: 'medium',
    deliveryDeadline: '',
    assignedDesigner: '',
    discountAmount: 0,
    vatMode: 'add_15', // 'add_15' | 'exclude' | 'inclusive' | 'custom'
    customVatRate: 15,
    notes: '',
    items: [
      {
        service: '',
        productTitle: '',
        quantity: 1000,
        unitOfMeasurement: 'copy',
        profitMargin: defaultInitMargin,
        unitPrice: defaultInitUnitPrice,
        subtotal: 1000 * defaultInitUnitPrice,
        specifications: {
          dimensions: { width: 210, height: 297, unit: 'mm' }, // A4
          pages: 16,
          paperType: '150 GSM Art Paper, 300 GSM Art Card',
          colorFormat: '4/4 CMYK',
          finishingOptions: ['gloss_lamination'],
          bindingType: 'saddle_stitch'
        },
        materials: defaultInitMaterials
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
      const [custsRes, empsRes, srvsRes, itemsRes] = await Promise.allSettled([
        crmService.getCustomers({ limit: 100 }),
        crmService.getEmployees({ limit: 100 }),
        crmService.getServices({ limit: 100 }),
        storeService.getItems({ limit: 200 })
      ]);
      if (custsRes.status === 'fulfilled') setCustomers(extractArray(custsRes.value, 'customers'));
      if (empsRes.status === 'fulfilled') setEmployees(extractArray(empsRes.value, 'employees'));
      if (srvsRes.status === 'fulfilled') setServices(extractArray(srvsRes.value, 'services'));
      if (itemsRes.status === 'fulfilled') {
        const list = extractArray(itemsRes.value, 'items') || itemsRes.value?.data || [];
        setInventoryItems(Array.isArray(list) ? list : []);
      }
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
    const initialQty = firstService?.pricingModel?.minimumOrderQuantity || 1000;
    const initialMaterials = createDefaultMaterials(initialQty);

    const rawItem = {
      service: firstService?._id || '',
      productTitle: firstService ? `${firstService.name} Print Run` : 'Printing Service Job',
      quantity: initialQty,
      unitOfMeasurement: firstService?.pricingModel?.unitOfMeasurement || 'copy',
      profitMargin: 30,
      unitPrice: 0,
      subtotal: 0,
      specifications: {
        dimensions: { width: 210, height: 297, unit: 'mm' }, // A4
        pages: 16,
        paperType: '150 GSM Art Paper, 300 GSM Art Card',
        colorFormat: '4/4 CMYK',
        finishingOptions: ['gloss_lamination'],
        bindingType: 'saddle_stitch'
      },
      materials: initialMaterials
    };

    const computedItem = recalculateItem(rawItem, firstService);

    setFormData({
      customer: customers[0]?._id || '',
      salesRepresentative: employees[0]?._id || '',
      priority: 'medium',
      deliveryDeadline: deadlineStr,
      assignedDesigner: '',
      discountAmount: 0,
      vatMode: 'add_15',
      customVatRate: 15,
      notes: '',
      items: [computedItem]
    });
    setIsCreateModalOpen(true);
  };

  // Add a Service from Service Catalog
  const handleAddService = () => {
    const firstService = services[0];
    const qty = firstService?.pricingModel?.minimumOrderQuantity || 500;
    const newMaterials = createDefaultMaterials(qty);

    const rawItem = {
      service: firstService?._id || '',
      productTitle: firstService ? `${firstService.name} Run` : 'Additional Service Job',
      quantity: qty,
      unitOfMeasurement: firstService?.pricingModel?.unitOfMeasurement || 'copy',
      profitMargin: 30,
      unitPrice: 0,
      subtotal: 0,
      specifications: {
        dimensions: { width: 210, height: 297, unit: 'mm' },
        pages: 8,
        paperType: '150 GSM Art Paper, 300 GSM Art Card',
        colorFormat: '4/4 CMYK',
        finishingOptions: [],
        bindingType: 'saddle_stitch'
      },
      materials: newMaterials
    };

    const computedItem = recalculateItem(rawItem, firstService);

    setFormData({
      ...formData,
      items: [...formData.items, computedItem]
    });
  };

  // Backwards compatibility alias
  const handleAddItem = handleAddService;

  const handleRemoveService = (idx) => {
    const updated = formData.items.filter((_, i) => i !== idx);
    setFormData({ ...formData, items: updated });
  };

  const handleRemoveItem = handleRemoveService;

  // Add Item / Material (Paper, Cover, Plate, Ink, etc.) within a specific Service
  const handleAddItemToService = (serviceIdx, category = 'paper') => {
    const updated = [...formData.items];
    const srv = updated[serviceIdx];
    const currentMaterials = srv.materials || [];

    let defaultName = '150 GSM Art Paper';
    let defaultUnit = 'sheet';
    let defaultCost = 15;
    let defaultQty = 100;

    if (category === 'cover') {
      defaultName = '300 GSM Art Card Cover';
      defaultUnit = 'sheet';
      defaultCost = 25;
      defaultQty = 50;
    } else if (category === 'ink') {
      defaultName = 'Process CMYK Offset Ink';
      defaultUnit = 'kg';
      defaultCost = 450;
      defaultQty = 2;
    } else if (category === 'plate') {
      defaultName = 'Thermal CTP Aluminum Plate';
      defaultUnit = 'piece';
      defaultCost = 350;
      defaultQty = 4;
    } else if (category === 'finishing') {
      defaultName = 'Thermal Gloss Lamination Film';
      defaultUnit = 'meter';
      defaultCost = 8;
      defaultQty = 150;
    } else if (category === 'board') {
      defaultName = '2mm Greyboard Strawboard';
      defaultUnit = 'sheet';
      defaultCost = 65;
      defaultQty = 25;
    }

    srv.materials = [
      ...currentMaterials,
      {
        item: '',
        itemName: defaultName,
        category,
        quantity: defaultQty,
        unitOfMeasurement: defaultUnit,
        unitCost: defaultCost,
        totalCost: Math.round(defaultQty * defaultCost * 100) / 100
      }
    ];

    const matchedService = services.find((s) => s._id === srv.service);
    updated[serviceIdx] = recalculateItem(srv, matchedService);

    // Update specifications paperType if paper/cover items exist
    const paperCoverNames = updated[serviceIdx].materials
      .filter((m) => m.category === 'paper' || m.category === 'cover')
      .map((m) => m.itemName)
      .filter(Boolean);

    if (paperCoverNames.length > 0) {
      updated[serviceIdx].specifications = {
        ...updated[serviceIdx].specifications,
        paperType: paperCoverNames.join(', ')
      };
    }

    setFormData({ ...formData, items: updated });
  };

  const handleRemoveItemFromService = (serviceIdx, materialIdx) => {
    const updated = [...formData.items];
    const srv = updated[serviceIdx];
    srv.materials = (srv.materials || []).filter((_, mIdx) => mIdx !== materialIdx);
    const matchedService = services.find((s) => s._id === srv.service);
    updated[serviceIdx] = recalculateItem(srv, matchedService);
    setFormData({ ...formData, items: updated });
  };

  const handleMaterialChange = (serviceIdx, materialIdx, field, value) => {
    const updated = [...formData.items];
    const srv = updated[serviceIdx];
    const materials = [...(srv.materials || [])];
    const mat = { ...materials[materialIdx] };

    if (field === 'item') {
      mat.item = value;
      if (value) {
        const found = inventoryItems.find((inv) => inv._id === value);
        if (found) {
          mat.itemName = found.itemName || mat.itemName;
          mat.unitCost = Number(found.unitCost || 0);
          mat.unitOfMeasurement = found.unitOfMeasurement || mat.unitOfMeasurement;
          mat.itemCode = found.itemCode || '';

          const itemNameLower = (found.itemName || '').toLowerCase();
          const catNameLower = (found.category?.name || found.itemType || '').toLowerCase();
          if (catNameLower.includes('cover') || itemNameLower.includes('cover')) {
            mat.category = 'cover';
          } else if (catNameLower.includes('paper') || itemNameLower.includes('paper')) {
            mat.category = 'paper';
          } else if (catNameLower.includes('ink') || itemNameLower.includes('ink')) {
            mat.category = 'ink';
          } else if (catNameLower.includes('plate') || itemNameLower.includes('plate')) {
            mat.category = 'plate';
          } else if (catNameLower.includes('board') || itemNameLower.includes('board')) {
            mat.category = 'board';
          }
        }
      }
    } else if (field === 'quantity' || field === 'unitCost') {
      mat[field] = Number(value);
    } else {
      mat[field] = value;
    }

    materials[materialIdx] = mat;
    srv.materials = materials;

    const matchedService = services.find((s) => s._id === srv.service);
    updated[serviceIdx] = recalculateItem(srv, matchedService);
    setFormData({ ...formData, items: updated });
  };

  // Re-sync service price directly based on materials used
  const handleEstimateServicePrice = (serviceIdx) => {
    const updated = [...formData.items];
    const srv = updated[serviceIdx];
    const matchedService = services.find((s) => s._id === srv.service);
    updated[serviceIdx] = recalculateItem(srv, matchedService);
    setFormData({ ...formData, items: updated });
  };

  const handleItemChange = (idx, field, value) => {
    const updated = [...formData.items];
    const it = { ...updated[idx], [field]: value };

    if (field === 'service') {
      const srv = services.find((s) => s._id === value);
      if (srv) {
        if (!it.productTitle || it.productTitle.includes('Run') || it.productTitle === 'Printing Job') {
          it.productTitle = `${srv.name} Run`;
        }
        if (srv.pricingModel?.unitOfMeasurement) {
          it.unitOfMeasurement = srv.pricingModel.unitOfMeasurement;
        }
        if (!it.quantity) {
          it.quantity = Number(srv.pricingModel?.minimumOrderQuantity || 1000);
        }
      }
      const matchedSrv = srv || services.find((s) => s._id === it.service);
      updated[idx] = recalculateItem(it, matchedSrv);
    } else if (field === 'quantity' || field === 'profitMargin') {
      const matchedSrv = services.find((s) => s._id === it.service);
      updated[idx] = recalculateItem(it, matchedSrv);
    } else {
      updated[idx] = it;
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
    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const discount = Math.max(0, Number(formData.discountAmount || 0));
    const taxable = Math.max(0, roundedSubtotal - discount);

    const mode = formData.vatMode || 'add_15';
    let vatRate = 15;
    let isVatInclusive = false;

    if (mode === 'exclude') {
      vatRate = 0;
    } else if (mode === 'add_15') {
      vatRate = 15;
    } else if (mode === 'inclusive') {
      vatRate = 15;
      isVatInclusive = true;
    } else if (mode === 'custom') {
      vatRate = Number(formData.customVatRate !== undefined ? formData.customVatRate : 15);
    }

    let vat = 0;
    let grandTotal = taxable;

    if (vatRate > 0) {
      if (isVatInclusive) {
        grandTotal = taxable;
        const netBase = Math.round((taxable / (1 + vatRate / 100)) * 100) / 100;
        vat = Math.round((taxable - netBase) * 100) / 100;
      } else {
        vat = Math.round(((taxable * vatRate) / 100) * 100) / 100;
        grandTotal = Math.round((taxable + vat) * 100) / 100;
      }
    }

    return {
      subtotal: roundedSubtotal,
      discount,
      taxable,
      vatRate,
      vat,
      grandTotal,
      isVatInclusive
    };
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const { subtotal, discount, vatRate, vat, grandTotal, isVatInclusive } = calculateTotals();

      const processedItems = formData.items.map((it) => {
        const qty = Number(it.quantity || 1);
        const unitPrice = Number(it.unitPrice || 0);
        const lineSubtotal = qty * unitPrice;

        const materials = Array.isArray(it.materials)
          ? it.materials.map((m) => {
              const mQty = Number(m.quantity || 0);
              const mCost = Number(m.unitCost || 0);
              return {
                item: m.item || undefined,
                itemName: (m.itemName || 'Material').trim(),
                itemCode: m.itemCode || '',
                category: m.category || 'paper',
                quantity: mQty,
                unitOfMeasurement: m.unitOfMeasurement || 'sheet',
                unitCost: mCost,
                totalCost: Number(m.totalCost !== undefined && m.totalCost !== null ? m.totalCost : mQty * mCost)
              };
            })
          : [];

        const totalMatCost = materials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);

        return {
          service: it.service,
          productTitle: it.productTitle?.trim() || 'Printing Job',
          quantity: qty,
          unitOfMeasurement: it.unitOfMeasurement || 'copy',
          profitMargin: Number(it.profitMargin !== undefined ? it.profitMargin : 30),
          specifications: it.specifications || {},
          materials,
          unitPrice,
          subtotal: lineSubtotal,
          estimatedCost: {
            materialCost: totalMatCost,
            machineCost: 0,
            laborCost: 0,
            finishingCost: 0,
            overheadCost: 0,
            totalEstimatedCost: totalMatCost
          }
        };
      });

      const payload = {
        customer: formData.customer,
        salesRepresentative: formData.salesRepresentative,
        priority: formData.priority,
        deliveryDeadline: formData.deliveryDeadline,
        assignedDesigner: formData.assignedDesigner || undefined,
        notes: formData.notes,
        items: processedItems,
        financials: {
          subtotal,
          discountAmount: discount,
          vatRate,
          vatAmount: vat,
          grandTotal,
          isVatInclusive,
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
        maxWidth="max-w-5xl"
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

          {/* Services & Line Items Builder */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-primary-500" />
                  {t('Printing Services & Order Line Items')}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Select services and add items (paper, cover, ink, etc.) to estimate accurate pricing.')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddService}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('Add Service')}
              </button>
            </div>

            {formData.items.map((item, idx) => {
              const matchedService = services.find((s) => s._id === item.service);
              const materials = item.materials || [];
              const totalMaterialCost = materials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);
              const costPerUnit = Number(item.quantity) > 0 ? totalMaterialCost / Number(item.quantity) : 0;

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3.5 shadow-xs"
                >
                  {/* Service Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('Service')}: <span className="text-primary-600 dark:text-primary-400">{matchedService?.name || t('Select a Service')}</span>
                      </span>
                      {matchedService?.category && (
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {matchedService.category.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveService(idx)}
                        className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-600 text-xs font-semibold hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('Remove Service')}
                      </button>
                    )}
                  </div>

                  {/* Primary Service Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {t('Printing Service Catalog')} *
                      </label>
                      <select
                        required
                        value={item.service}
                        onChange={(e) => handleItemChange(idx, 'service', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      >
                        <option value="">-- {t('Select Printing Service')} --</option>
                        {services.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name} ({s.category?.replace(/_/g, ' ')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {t('Product Title / Job Name')} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 2026 Annual Calendar"
                        value={item.productTitle}
                        onChange={(e) => handleItemChange(idx, 'productTitle', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {t('Quantity')} ({item.unitOfMeasurement || 'copy'}) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {t('Unit Price')} ({t('Calculated')})
                      </label>
                      <div className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold font-mono flex items-center justify-between">
                        <span>{formatCurrency(item.unitPrice)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold uppercase">
                          {materials.length > 0 ? `${t('Auto')} (+${item.profitMargin ?? 30}%)` : t('Base')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Printing Specifications Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">{t('Paper Type / GSM')}</label>
                      <input
                        type="text"
                        placeholder="e.g. 150 GSM Art Paper"
                        value={item.specifications?.paperType || ''}
                        onChange={(e) => handleItemSpecChange(idx, 'paperType', e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">{t('Color Format')}</label>
                      <input
                        type="text"
                        placeholder="e.g. 4/4 CMYK"
                        value={item.specifications?.colorFormat || ''}
                        onChange={(e) => handleItemSpecChange(idx, 'colorFormat', e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">{t('Page Count')}</label>
                      <input
                        type="number"
                        min="1"
                        value={item.specifications?.pages || 1}
                        onChange={(e) => handleItemSpecChange(idx, 'pages', Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">{t('Binding Type')}</label>
                      <input
                        type="text"
                        placeholder="e.g. Saddle Stitch"
                        value={item.specifications?.bindingType || ''}
                        onChange={(e) => handleItemSpecChange(idx, 'bindingType', e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* SUB-SECTION: Used Items & Materials (Paper, Cover, Ink, etc.) */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/70 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {t('Used Items & Materials')}
                          </span>
                          <span className="ml-2 text-[10px] text-slate-400">
                            ({t('Paper, Cover, Plates, Ink, Board, etc.')})
                          </span>
                        </div>
                      </div>

                      {/* Add Item Action */}
                      <div>
                        <button
                          type="button"
                          onClick={() => handleAddItemToService(idx, 'paper')}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 hover:bg-primary-100 dark:hover:bg-primary-900/40 px-2.5 py-1 rounded-lg border border-primary-200 dark:border-primary-800 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {t('Add Item')}
                        </button>
                      </div>
                    </div>

                    {/* Material Items List */}
                    {materials.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-400">
                        {t('No materials attached yet. Click "+ Add Item" above.')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                          <span className="col-span-3">{t('Item / Material')}</span>
                          <span className="col-span-2">{t('Category / Role')}</span>
                          <span className="col-span-2">{t('Quantity')}</span>
                          <span className="col-span-1">{t('Unit')}</span>
                          <span className="col-span-2">{t('Unit Cost (ETB)')}</span>
                          <span className="col-span-1 text-right">{t('Total')}</span>
                          <span className="col-span-1 text-right"></span>
                        </div>

                        {materials.map((mat, mIdx) => (
                          <div
                            key={mIdx}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs"
                          >
                            {/* Inventory Item Selection or Manual Title */}
                            <div className="sm:col-span-3">
                              <select
                                value={mat.item || ''}
                                onChange={(e) => handleMaterialChange(idx, mIdx, 'item', e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 mb-1"
                              >
                                <option value="">-- {t('Inventory Item / Custom')} --</option>
                                {inventoryItems.map((inv) => (
                                  <option key={inv._id} value={inv._id}>
                                    {inv.itemName} [{inv.itemCode || ''}] ({inv.unitCost} ETB)
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder={t('Material / Item name')}
                                value={mat.itemName || ''}
                                onChange={(e) => handleMaterialChange(idx, mIdx, 'itemName', e.target.value)}
                                className="w-full px-2 py-0.5 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                              />
                            </div>

                            {/* Category / Role */}
                            <div className="sm:col-span-2">
                              <select
                                value={mat.category || 'paper'}
                                onChange={(e) => handleMaterialChange(idx, mIdx, 'category', e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                              >
                                <option value="paper">{t('Paper (Inner)')}</option>
                                <option value="cover">{t('Cover / Card')}</option>
                                <option value="plate">{t('CTP Plate')}</option>
                                <option value="ink">{t('Printing Ink')}</option>
                                <option value="finishing">{t('Lamination / Foil')}</option>
                                <option value="board">{t('Greyboard / Binding')}</option>
                                <option value="other">{t('Other Material')}</option>
                              </select>
                            </div>

                            {/* Quantity */}
                            <div className="sm:col-span-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={mat.quantity}
                                onChange={(e) => handleMaterialChange(idx, mIdx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </div>

                            {/* Unit of Measurement */}
                            <div className="sm:col-span-1">
                              <input
                                type="text"
                                placeholder="sheet"
                                value={mat.unitOfMeasurement || 'sheet'}
                                onChange={(e) => handleMaterialChange(idx, mIdx, 'unitOfMeasurement', e.target.value)}
                                className="w-full px-1.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                              />
                            </div>

                            {/* Unit Cost */}
                            <div className="sm:col-span-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={mat.unitCost}
                                onChange={(e) => handleMaterialChange(idx, mIdx, 'unitCost', e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                              />
                            </div>

                            {/* Total Cost */}
                            <div className="sm:col-span-1 text-right font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {formatCurrency(mat.totalCost)}
                            </div>

                            {/* Remove Material */}
                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemFromService(idx, mIdx)}
                                className="p-1 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title={t('Remove this material')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Price Estimation Bar from Items & Profit Margin */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 flex-wrap">
                        <span className="text-[11px] font-semibold">
                          {t('Materials Total')}: <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(totalMaterialCost)}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span className="text-[11px]">
                          {t('Per Unit Material Cost')}: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatCurrency(costPerUnit)}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {t('Profit Margin')}:
                          </label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              step="1"
                              value={item.profitMargin ?? 30}
                              onChange={(e) => handleItemChange(idx, 'profitMargin', e.target.value)}
                              className="w-14 px-1.5 py-0.5 text-xs text-right font-bold rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                            <span className="ml-1 text-[11px] font-bold text-slate-500">%</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          {materials.length > 0
                            ? `${formatCurrency(item.unitPrice)}/${item.unitOfMeasurement || 'copy'} (+${item.profitMargin ?? 30}%)`
                            : `${formatCurrency(item.unitPrice)}/${item.unitOfMeasurement || 'copy'}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {matchedService?.pricingModel?.basePrice > 0 && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {t('Catalog Base Price')}: {formatCurrency(matchedService.pricingModel.basePrice)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleEstimateServicePrice(idx)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition"
                          title={t('Calculates unit price from materials used with profit margin or service base rate')}
                        >
                          <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {t('Recalculate')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Service Subtotal */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500 font-medium">
                      {item.quantity?.toLocaleString()} {item.unitOfMeasurement || 'copies'} × {formatCurrency(item.unitPrice)}
                    </span>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {t('Service Subtotal')}: {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Designer Assignment, Discount & VAT Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('VAT Option')}
              </label>
              <div className="flex gap-1.5">
                <select
                  value={formData.vatMode || 'add_15'}
                  onChange={(e) => setFormData({ ...formData, vatMode: e.target.value })}
                  className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="add_15">{t('Include 15% VAT (+15%)')}</option>
                  <option value="exclude">{t('Exclude VAT (0% / Exempt)')}</option>
                  <option value="inclusive">{t('VAT Included in Price (15%)')}</option>
                  <option value="custom">{t('Custom VAT %')}</option>
                </select>
                {formData.vatMode === 'custom' && (
                  <div className="flex items-center w-20 relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.customVatRate ?? 15}
                      onChange={(e) => setFormData({ ...formData, customVatRate: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-2 py-2 text-xs font-bold text-right rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pr-5"
                    />
                    <span className="absolute right-2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Automated Financial Summary Box */}
          {(() => {
            const { subtotal, discount, vatRate, vat, grandTotal, isVatInclusive } = calculateTotals();
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
                  <span>
                    {vatRate === 0
                      ? t('VAT (Excluded / 0% Exempt)')
                      : isVatInclusive
                      ? `${vatRate}% ${t('VAT (Included in Price)')}`
                      : `${vatRate}% ${t('Ethiopian VAT (Added)')}`}:
                  </span>
                  <span>
                    {vatRate === 0
                      ? t('0.00 ETB (Exempt)')
                      : isVatInclusive
                      ? `${formatCurrency(vat)}`
                      : `+${formatCurrency(vat)}`}
                  </span>
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
          maxWidth="max-w-4xl"
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

            {/* Services, Specifications & Used Materials */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary-500" />
                {t('Services & Materials Specifications')}
              </h4>
              {viewingOrder.items?.map((it, idx) => {
                const materials = it.materials || [];
                const matCostTotal = it.estimatedCost?.materialCost || materials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <div>
                        <span>{it.productTitle}</span>
                        {it.service?.name && (
                          <span className="ml-2 text-xs font-normal text-primary-600 dark:text-primary-400">
                            ({it.service.name})
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-black">{formatCurrency(it.subtotal)}</span>
                    </div>

                    <div className="text-[11px] text-slate-500 grid grid-cols-2 sm:grid-cols-5 gap-2 pb-1">
                      <span>{t('Quantity')}: <strong className="text-slate-700 dark:text-slate-300">{it.quantity?.toLocaleString()} {it.unitOfMeasurement}</strong></span>
                      <span>{t('Unit Price')}: <strong className="text-slate-700 dark:text-slate-300">{formatCurrency(it.unitPrice)}</strong></span>
                      <span>{t('Margin')}: <strong className="text-slate-700 dark:text-slate-300">{it.profitMargin ?? 30}%</strong></span>
                      <span>{t('Colors')}: <strong className="text-slate-700 dark:text-slate-300">{it.specifications?.colorFormat || '4/4 CMYK'}</strong></span>
                      <span>{t('Binding')}: <strong className="text-slate-700 dark:text-slate-300">{it.specifications?.bindingType || 'None'}</strong></span>
                    </div>

                    {/* Used Items / Materials Breakdown */}
                    {materials.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Box className="w-3 h-3 text-amber-500" />
                            {t('Used Items & Materials')} ({materials.length})
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                            {t('Total Material Cost')}: {formatCurrency(matCostTotal)}
                          </span>
                        </div>
                        <div className="space-y-1 bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800">
                          {materials.map((mat, mIdx) => (
                            <div key={mIdx} className="flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-300">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{mat.itemName || 'Material'}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                                  {mat.category || 'paper'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">
                                  {mat.quantity} {mat.unitOfMeasurement || 'sheet'} × {formatCurrency(mat.unitCost)}
                                </span>
                                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                                  {formatCurrency(mat.totalCost)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Financial Summary */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>{t('Subtotal')}:</span>
                <span>{formatCurrency(viewingOrder.financials?.subtotal)}</span>
              </div>
              {Number(viewingOrder.financials?.discountAmount) > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>{t('Discount')}:</span>
                  <span>-{formatCurrency(viewingOrder.financials?.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>{t('VAT')}:</span>
                <span>
                  {Number(viewingOrder.financials?.vatRate) === 0
                    ? t('Excluded (0% / Exempt)')
                    : viewingOrder.financials?.isVatInclusive
                    ? `${viewingOrder.financials?.vatRate || 15}% ${t('Included in Price')} (${formatCurrency(viewingOrder.financials?.vatAmount)})`
                    : `${viewingOrder.financials?.vatRate || 15}% (+${formatCurrency(viewingOrder.financials?.vatAmount)})`}
                </span>
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

