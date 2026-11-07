import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  XCircle,
  Clock,
  ArrowRight,
  Eye,
  Trash2,
  RefreshCw,
  ShoppingCart,
  Building2,
  Warehouse,
  AlertCircle
} from 'lucide-react';

const COMMON_DEPARTMENTS = [
  'Store & Inventory',
  'Production & Press',
  'Finishing & Bindery',
  'Graphic Design',
  'Sales & Marketing',
  'Human Resources',
  'Administration & Finance',
  'Maintenance'
];

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

export default function PurchaseRequests() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [requests, setRequests] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Form State for New PR
  const [formData, setFormData] = useState({
    department: 'Store & Inventory',
    warehouse: '',
    purpose: '',
    priority: 'medium',
    requiredDate: '',
    currency: 'ETB',
    note: '',
    items: [
      {
        item: '',
        itemName: '',
        description: '',
        requestedQuantity: 1,
        unitOfMeasurement: 'piece',
        estimatedUnitPrice: 0,
        preferredSupplier: '',
        note: ''
      }
    ]
  });

  // Approval Form State
  const [approvalData, setApprovalData] = useState({
    status: 'approved',
    comment: '',
    rejectionReason: ''
  });

  // Convert to PO Form State
  const [convertData, setConvertData] = useState({
    supplier: '',
    warehouse: '',
    deliveryAddress: '',
    paymentTerms: 'Cash on delivery'
  });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [prRes, itemRes, whRes, supRes] = await Promise.allSettled([
        purchasingService.getPurchaseRequests({ limit: 100 }),
        purchasingService.getItems({ limit: 150 }),
        purchasingService.getWarehouses({ limit: 50 }),
        purchasingService.getSuppliers({ limit: 100 })
      ]);

      if (prRes.status === 'fulfilled' && prRes.value?.data) {
        setRequests(Array.isArray(prRes.value.data) ? prRes.value.data : []);
      }
      if (itemRes.status === 'fulfilled' && itemRes.value?.data) {
        setInventoryItems(Array.isArray(itemRes.value.data) ? itemRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
      if (supRes.status === 'fulfilled' && supRes.value?.data) {
        setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load purchase requests:', err);
      setError(err.message || 'Failed to load purchase requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if query param specifies an ID to open
  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId && requests.length > 0) {
      const found = requests.find((r) => r._id === paramId);
      if (found) {
        setSelectedRequest(found);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams, requests]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Add Item Line
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: '',
          itemName: '',
          description: '',
          requestedQuantity: 1,
          unitOfMeasurement: 'piece',
          estimatedUnitPrice: 0,
          preferredSupplier: '',
          note: ''
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

  // Item Field Change
  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };

      // If item selected from dropdown, autofill name, UOM, and estimated price if available
      if (field === 'item') {
        const itemObj = inventoryItems.find((i) => i._id === value);
        if (itemObj) {
          updated[index].itemName = itemObj.itemName;
          updated[index].unitOfMeasurement = itemObj.unitOfMeasurement || 'piece';
          if (itemObj.unitCost) {
            updated[index].estimatedUnitPrice = itemObj.unitCost;
          }
          if (itemObj.preferredSupplier) {
            const suppId = typeof itemObj.preferredSupplier === 'object' ? itemObj.preferredSupplier._id : itemObj.preferredSupplier;
            updated[index].preferredSupplier = suppId;
          }
        }
      }

      return { ...prev, items: updated };
    });
  };

  // Calculate Form Total
  const calculateTotal = () => {
    return formData.items.reduce((sum, i) => {
      const qty = Number(i.requestedQuantity || 0);
      const price = Number(i.estimatedUnitPrice || 0);
      return sum + qty * price;
    }, 0);
  };

  // Handle PR Creation Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.department) {
      setFormError('Department is required');
      return;
    }

    if (!formData.items || formData.items.length === 0) {
      setFormError('At least one item is required');
      return;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const itm = formData.items[i];
      if (!itm.item && !itm.itemName) {
        setFormError(`Item #${i + 1} must have a name or selected product`);
        return;
      }
      if (Number(itm.requestedQuantity) <= 0) {
        setFormError(`Item #${i + 1} quantity must be greater than zero`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.createPurchaseRequest({
        ...formData,
        warehouse: formData.warehouse || null
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        // Reset form
        setFormData({
          department: 'Store & Inventory',
          warehouse: '',
          purpose: '',
          priority: 'medium',
          requiredDate: '',
          currency: 'ETB',
          note: '',
          items: [
            {
              item: '',
              itemName: '',
              description: '',
              requestedQuantity: 1,
              unitOfMeasurement: 'piece',
              estimatedUnitPrice: 0,
              preferredSupplier: '',
              note: ''
            }
          ]
        });
        await fetchData();
      } else {
        setFormError(res.message || 'Failed to create purchase request');
      }
    } catch (err) {
      console.error('Error creating purchase request:', err);
      setFormError(err.message || 'Failed to submit purchase request');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Approval Action
  const handleApprovalSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      const res = await purchasingService.approvePurchaseRequest(selectedRequest._id, approvalData);
      if (res.success) {
        setIsApprovalModalOpen(false);
        setSelectedRequest(null);
        await fetchData();
      } else {
        alert(res.message || 'Failed to update approval status');
      }
    } catch (err) {
      alert(err.message || 'Error updating approval');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Convert to PO Action
  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (!convertData.supplier || !convertData.warehouse) {
      alert('Please select both Supplier and Receiving Warehouse');
      return;
    }

    setSubmitting(true);
    try {
      const res = await purchasingService.convertToPurchaseOrder(selectedRequest._id, convertData);
      if (res.success) {
        setIsConvertModalOpen(false);
        setSelectedRequest(null);
        await fetchData();
        alert('Purchase order draft created successfully from this request!');
      } else {
        alert(res.message || 'Failed to convert to purchase order');
      }
    } catch (err) {
      alert(err.message || 'Error converting request');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (priorityFilter && r.priority !== priorityFilter) return false;
    if (departmentFilter && r.department !== departmentFilter) return false;
    if (search) {
      const term = search.toLowerCase();
      const matchNum = r.requestNumber?.toLowerCase().includes(term);
      const matchDept = r.department?.toLowerCase().includes(term);
      const matchPurpose = r.purpose?.toLowerCase().includes(term);
      const matchItem = r.items?.some((i) =>
        i.itemName?.toLowerCase().includes(term) ||
        i.description?.toLowerCase().includes(term) ||
        i.item?.itemName?.toLowerCase().includes(term)
      );
      if (!matchNum && !matchDept && !matchPurpose && !matchItem) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary-500" />
            {t('Purchase Requests (PR)')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('manage requisitions from store & departments, review approvals, and convert to pos')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
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
            {t('New Purchase Request')}
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
            <option value="pending">{t('pending')}</option>
            <option value="approved">{t('approved')}</option>
            <option value="partially approved">{t('partially approved')}</option>
            <option value="converted to purchase order">{t('converted to purchase order')}</option>
            <option value="rejected">{t('rejected')}</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all priorities')}</option>
            <option value="urgent">{t('urgent')}</option>
            <option value="high">{t('high')}</option>
            <option value="medium">{t('medium')}</option>
            <option value="low">{t('low')}</option>
          </select>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all departments')}</option>
            {COMMON_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>{t(dept)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
            <p className="text-sm">{t('loading purchasing & procurement metrics...')}</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t('no purchase requests created yet.')}
            description={search || statusFilter ? t('Try adjusting your search filters.') : t('no purchase requests created yet.')}
            action={
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-3 px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 text-white"
              >
                {t('create purchase request')}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">{t('request number')}</th>
                  <th className="py-3 px-4 font-bold">{t('department')}</th>
                  <th className="py-3 px-4 font-bold">{t('requester')}</th>
                  <th className="py-3 px-4 font-bold">{t('items requisitioned')}</th>
                  <th className="py-3 px-4 font-bold">{t('priority')}</th>
                  <th className="py-3 px-4 font-bold">{t('est. total')}</th>
                  <th className="py-3 px-4 font-bold">{t('status')}</th>
                  <th className="py-3 px-4 font-bold text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredRequests.map((r) => {
                  const itemsCount = r.items?.length || 0;
                  const firstItemName = r.items?.[0]?.itemName || r.items?.[0]?.item?.itemName || 'Item';
                  const summaryText = itemsCount > 1 ? `${firstItemName} +${itemsCount - 1} more` : firstItemName;

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <button
                          onClick={() => {
                            setSelectedRequest(r);
                            setIsDetailModalOpen(true);
                          }}
                          className="hover:underline text-primary-600 dark:text-primary-400 font-mono"
                        >
                          {r.requestNumber}
                        </button>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {r.department}
                        {r.warehouse && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Warehouse className="w-3 h-3" />
                            {r.warehouse.warehouseName || 'Warehouse'}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {r.requestedBy?.fullName || 'Requester'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 font-medium">
                        {summaryText}
                        <div className="text-[11px] text-slate-400">
                          {itemsCount} {itemsCount === 1 ? 'line item' : 'line items'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={r.priority} text={r.priority} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(r.estimatedTotalAmount)}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={r.status} text={r.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedRequest(r);
                              setIsDetailModalOpen(true);
                            }}
                            title="View Details"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Approval button for Managers/Admins */}
                          {r.status === 'pending' && hasRole(['admin', 'manager', 'hr']) && (
                            <button
                              onClick={() => {
                                setSelectedRequest(r);
                                setApprovalData({
                                  status: 'approved',
                                  comment: '',
                                  rejectionReason: ''
                                });
                                setIsApprovalModalOpen(true);
                              }}
                              title="Approve / Reject"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Review
                            </button>
                          )}

                          {/* Convert to PO button when approved */}
                          {r.status === 'approved' && hasRole(['admin', 'manager', 'purchaser']) && (
                            <button
                              onClick={() => {
                                setSelectedRequest(r);
                                setConvertData({
                                  supplier: r.items?.[0]?.preferredSupplier?._id || r.items?.[0]?.preferredSupplier || '',
                                  warehouse: r.warehouse?._id || r.warehouse || (warehouses[0]?._id || ''),
                                  deliveryAddress: '',
                                  paymentTerms: 'Cash on delivery'
                                });
                                setIsConvertModalOpen(true);
                              }}
                              title="Convert to Purchase Order"
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Convert to PO
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
        )}
      </div>

      {/* CREATE PURCHASE REQUEST MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Purchase Request (PR)"
        maxWidth="max-w-4xl"
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
                Requesting Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              >
                {COMMON_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Target Warehouse (Optional)
              </label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">-- No specific warehouse --</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.warehouseName} ({wh.warehouseCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Required By Date
              </label>
              <input
                type="date"
                value={formData.requiredDate}
                onChange={(e) => setFormData({ ...formData, requiredDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Purpose / Project Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Replenishment for Printing Press Job #428"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Requisitioned Items *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-primary-600 hover:text-primary-500 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Item
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {formData.items.map((itm, idx) => {
                const rowTotal = Number(itm.requestedQuantity || 0) * Number(itm.estimatedUnitPrice || 0);

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
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
                          Select Catalog Item (or leave custom)
                        </label>
                        <select
                          value={itm.item}
                          onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">-- Custom / Non-Catalog Item --</option>
                          {inventoryItems.map((inv) => (
                            <option key={inv._id} value={inv._id}>
                              {inv.itemName} ({inv.itemCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Item Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 80gsm Offset Paper A4"
                          value={itm.itemName}
                          onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="0.01"
                          step="any"
                          value={itm.requestedQuantity}
                          onChange={(e) => handleItemChange(idx, 'requestedQuantity', e.target.value)}
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
                          Est. Unit Price (ETB)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={itm.estimatedUnitPrice}
                          onChange={(e) => handleItemChange(idx, 'estimatedUnitPrice', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Est. Line Total
                        </label>
                        <div className="px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          {formatCurrency(rowTotal)}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Preferred Supplier
                        </label>
                        <select
                          value={itm.preferredSupplier}
                          onChange={(e) => handleItemChange(idx, 'preferredSupplier', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          <option value="">-- Any --</option>
                          {suppliers.map((s) => (
                            <option key={s._id} value={s._id}>
                              {s.supplierName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Estimated Total Display */}
            <div className="mt-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 flex items-center justify-between">
              <span className="text-xs font-bold text-primary-900 dark:text-primary-200">
                Total Estimated Requisition Amount:
              </span>
              <span className="text-base font-black text-primary-700 dark:text-primary-300">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Purchase Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Purchase Request Details - ${selectedRequest?.requestNumber || ''}`}
        maxWidth="max-w-3xl"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block">Department:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedRequest.department}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Requester:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedRequest.requestedBy?.fullName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Priority:</span>
                <Badge status={selectedRequest.priority} text={selectedRequest.priority} size="xs" />
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <Badge status={selectedRequest.status} text={selectedRequest.status} size="xs" />
              </div>
            </div>

            {selectedRequest.purpose && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-300 block mb-0.5">
                  Purpose / Justification:
                </span>
                <p className="text-slate-700 dark:text-slate-300">{selectedRequest.purpose}</p>
              </div>
            )}

            {selectedRequest.rejectionReason && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-xs text-rose-700 dark:text-rose-300">
                <span className="font-bold block mb-0.5">Rejection Reason:</span>
                <p>{selectedRequest.rejectionReason}</p>
              </div>
            )}

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Requested Items
              </h4>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">UOM</th>
                      <th className="py-2 px-3">Est. Unit Price</th>
                      <th className="py-2 px-3 text-right">Est. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {selectedRequest.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {item.itemName || item.item?.itemName}
                          {item.description && (
                            <div className="text-[10px] text-slate-400 font-normal">{item.description}</div>
                          )}
                        </td>
                        <td className="py-2 px-3">{item.requestedQuantity}</td>
                        <td className="py-2 px-3">{item.unitOfMeasurement}</td>
                        <td className="py-2 px-3">{formatCurrency(item.estimatedUnitPrice)}</td>
                        <td className="py-2 px-3 text-right font-bold">
                          {formatCurrency(item.estimatedTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-slate-800 font-black text-slate-900 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700">
                      <td colSpan="4" className="py-2.5 px-3 text-right">
                        Grand Estimated Total:
                      </td>
                      <td className="py-2.5 px-3 text-right text-primary-600">
                        {formatCurrency(selectedRequest.estimatedTotalAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* APPROVAL MODAL */}
      <Modal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        title={`Review Purchase Request - ${selectedRequest?.requestNumber || ''}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleApprovalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Decision *
            </label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 cursor-pointer">
                <input
                  type="radio"
                  name="approvalStatus"
                  value="approved"
                  checked={approvalData.status === 'approved'}
                  onChange={(e) => setApprovalData({ ...approvalData, status: e.target.value })}
                />
                Approve Request
              </label>

              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 cursor-pointer">
                <input
                  type="radio"
                  name="approvalStatus"
                  value="rejected"
                  checked={approvalData.status === 'rejected'}
                  onChange={(e) => setApprovalData({ ...approvalData, status: e.target.value })}
                />
                Reject Request
              </label>
            </div>
          </div>

          {approvalData.status === 'rejected' && (
            <div>
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                Reason for Rejection *
              </label>
              <textarea
                rows="2"
                placeholder="Explain why the requisition was declined..."
                value={approvalData.rejectionReason}
                onChange={(e) => setApprovalData({ ...approvalData, rejectionReason: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reviewer Comment (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Approved within budget quota for Q4"
              value={approvalData.comment}
              onChange={(e) => setApprovalData({ ...approvalData, comment: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsApprovalModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs ${
                approvalData.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {submitting ? 'Processing...' : approvalData.status === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONVERT TO PO MODAL */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title={`Convert to Purchase Order - ${selectedRequest?.requestNumber || ''}`}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            This will generate a official Purchase Order (PO) draft containing all {selectedRequest?.items?.length || 0} items from this approved requisition.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Assign Vendor / Supplier *
            </label>
            <select
              value={convertData.supplier}
              onChange={(e) => setConvertData({ ...convertData, supplier: e.target.value })}
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
              Destination Warehouse *
            </label>
            <select
              value={convertData.warehouse}
              onChange={(e) => setConvertData({ ...convertData, warehouse: e.target.value })}
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
              Payment Terms
            </label>
            <input
              type="text"
              placeholder="e.g. Net 30 days or Cash on delivery"
              value={convertData.paymentTerms}
              onChange={(e) => setConvertData({ ...convertData, paymentTerms: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Delivery Address
            </label>
            <input
              type="text"
              placeholder="e.g. GT Printing Press Warehouse A, Addis Ababa"
              value={convertData.deliveryAddress}
              onChange={(e) => setConvertData({ ...convertData, deliveryAddress: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsConvertModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 text-white shadow-xs"
            >
              {submitting ? 'Creating PO...' : 'Create Purchase Order Draft'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

