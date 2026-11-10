import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  RotateCcw,
  Plus,
  Search,
  Printer,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Warehouse as WarehouseIcon,
  XCircle
} from 'lucide-react';

const RETURN_CONDITIONS = [
  { value: 'good', label: 'Good / Reusable (Restock to Store)' },
  { value: 'damaged', label: 'Damaged / Defective' },
  { value: 'scrap', label: 'Scrap / Unusable' }
];

const COMMON_REASONS = [
  'Unused leftover from production job',
  'Job completed with excess materials',
  'Wrong material issued',
  'Job cancelled or specifications changed',
  'Machine jam / damaged during setup',
  'Tool or equipment returned to custody'
];

export default function StaffReturns() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();

  const [returns, setReturns] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [eligibleRequests, setEligibleRequests] = useState([]);
  const [selectedStockReq, setSelectedStockReq] = useState(null);

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
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Create Form State
  const [formData, setFormData] = useState({
    originalStockRequest: '',
    department: 'Production',
    warehouse: '',
    jobReference: '',
    reason: COMMON_REASONS[0],
    note: '',
    items: []
  });

  // Receiving state (Storekeeper inspection)
  const [receiveItems, setReceiveItems] = useState([]);
  const [receiveNote, setReceiveNote] = useState('');

  // Rejection state
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [retRes, whRes, itemsRes, reqRes] = await Promise.allSettled([
        storeService.getStaffReturns({ limit: 150 }),
        storeService.getWarehouses({ limit: 50 }),
        storeService.getItems({ limit: 200 }),
        storeService.getStockRequests({ limit: 150 })
      ]);

      if (retRes.status === 'fulfilled' && retRes.value?.data) {
        setReturns(Array.isArray(retRes.value.data) ? retRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        setWarehouses(Array.isArray(whRes.value.data) ? whRes.value.data : []);
      }
      if (itemsRes.status === 'fulfilled' && itemsRes.value?.data) {
        setItemsCatalog(Array.isArray(itemsRes.value.data) ? itemsRes.value.data : []);
      }
      if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
        const allReqs = Array.isArray(reqRes.value.data) ? reqRes.value.data : [];
        // Only allow returns from approved or issued requisitions
        const eligible = allReqs.filter((r) =>
          ['approved', 'partially issued', 'completed'].includes(r.status)
        );
        setEligibleRequests(eligible);
      }
    } catch (err) {
      console.error('Failed to load staff returns:', err);
      setError(err.message || 'Failed to load staff returns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter returns
  const filteredReturns = returns.filter((r) => {
    const matchesSearch =
      !search ||
      r.returnNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.jobReference?.toLowerCase().includes(search.toLowerCase()) ||
      r.originalStockRequest?.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.returnedBy?.fullName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesWarehouse = !warehouseFilter || (r.warehouse?._id || r.warehouse) === warehouseFilter;

    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  // Handle switching the referenced Stock Request
  const handleSelectStockRequest = (reqId) => {
    const foundReq = eligibleRequests.find((r) => r._id === reqId);
    if (!foundReq) return;

    setSelectedStockReq(foundReq);

    const firstItem = foundReq.items?.[0];
    const initialItems = firstItem
      ? [
          {
            item: firstItem.item?._id || firstItem.item,
            quantity: Number(firstItem.issuedQuantity || firstItem.approvedQuantity || 1),
            unitOfMeasurement: firstItem.unitOfMeasurement || firstItem.item?.unitOfMeasurement || 'piece',
            condition: 'good',
            reason: 'Unused material return',
            note: '',
            maxAllowed: Number(firstItem.issuedQuantity || firstItem.approvedQuantity || 1),
            itemName: firstItem.item?.itemName || 'Item'
          }
        ]
      : [];

    setFormData((prev) => ({
      ...prev,
      originalStockRequest: foundReq._id,
      warehouse: foundReq.warehouse?._id || foundReq.warehouse,
      department: foundReq.department || user?.employee?.department || 'Production',
      jobReference: foundReq.purpose || foundReq.requestNumber || '',
      items: initialItems
    }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormError('');

    if (eligibleRequests.length > 0) {
      const firstReq = eligibleRequests[0];
      setSelectedStockReq(firstReq);
      const firstItem = firstReq.items?.[0];

      setFormData({
        originalStockRequest: firstReq._id,
        department: firstReq.department || user?.employee?.department || 'Production',
        warehouse: firstReq.warehouse?._id || firstReq.warehouse,
        jobReference: firstReq.purpose || firstReq.requestNumber || '',
        reason: COMMON_REASONS[0],
        note: '',
        items: firstItem
          ? [
              {
                item: firstItem.item?._id || firstItem.item,
                quantity: Number(firstItem.issuedQuantity || firstItem.approvedQuantity || 1),
                unitOfMeasurement: firstItem.unitOfMeasurement || firstItem.item?.unitOfMeasurement || 'piece',
                condition: 'good',
                reason: 'Unused material return',
                note: '',
                maxAllowed: Number(firstItem.issuedQuantity || firstItem.approvedQuantity || 1),
                itemName: firstItem.item?.itemName || 'Item'
              }
            ]
          : []
      });
    } else {
      setSelectedStockReq(null);
      setFormData({
        originalStockRequest: '',
        department: user?.employee?.department || 'Production',
        warehouse: warehouses[0]?._id || '',
        jobReference: '',
        reason: COMMON_REASONS[0],
        note: '',
        items: []
      });
    }

    setIsCreateModalOpen(true);
  };

  // Add Item Row from the selected requisition
  const handleAddItemRow = () => {
    if (!selectedStockReq || !selectedStockReq.items || selectedStockReq.items.length === 0) return;

    // Pick the first item or an item not yet in list
    const unselected = selectedStockReq.items.find(
      (si) => !formData.items.some((fi) => fi.item === (si.item?._id || si.item))
    ) || selectedStockReq.items[0];

    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: unselected.item?._id || unselected.item,
          quantity: Number(unselected.issuedQuantity || unselected.approvedQuantity || 1),
          unitOfMeasurement: unselected.unitOfMeasurement || unselected.item?.unitOfMeasurement || 'piece',
          condition: 'good',
          reason: 'Unused material return',
          note: '',
          maxAllowed: Number(unselected.issuedQuantity || unselected.approvedQuantity || 1),
          itemName: unselected.item?.itemName || 'Item'
        }
      ]
    }));
  };

  // Remove Item Row
  const handleRemoveItemRow = (idx) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  // Update item field
  const handleItemChange = (idx, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], [field]: value };

      if (field === 'item' && selectedStockReq) {
        const match = selectedStockReq.items?.find((it) => (it.item?._id || it.item) === value);
        if (match) {
          const maxQ = Number(match.issuedQuantity || match.approvedQuantity || 1);
          nextItems[idx].unitOfMeasurement = match.unitOfMeasurement || match.item?.unitOfMeasurement || 'piece';
          nextItems[idx].maxAllowed = maxQ;
          nextItems[idx].quantity = maxQ;
          nextItems[idx].itemName = match.item?.itemName || 'Item';
        }
      }
      return { ...prev, items: nextItems };
    });
  };

  // Submit Return Creation
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      if (!formData.originalStockRequest) {
        throw new Error('Please select a previously approved material request');
      }
      if (!formData.warehouse) {
        throw new Error('Target warehouse is required');
      }
      if (formData.items.length === 0) {
        throw new Error('Please select at least one material to return');
      }
      for (const it of formData.items) {
        if (!it.item || Number(it.quantity) <= 0) {
          throw new Error('Please specify a valid quantity greater than zero');
        }
        if (it.maxAllowed && Number(it.quantity) > Number(it.maxAllowed)) {
          throw new Error(
            `Quantity for ${it.itemName || 'item'} cannot exceed the approved/issued quantity (${it.maxAllowed})`
          );
        }
      }

      const res = await storeService.createStaffReturn(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit staff material return');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receive Modal (Storekeeper)
  const handleOpenReceiveModal = (ret) => {
    setSelectedReturn(ret);
    setReceiveNote('');
    setReceiveItems(
      (ret.items || []).map((i) => ({
        itemId: i._id,
        itemRef: i.item,
        itemName: i.item?.itemName || 'Item',
        itemCode: i.item?.itemCode || '',
        unitOfMeasurement: i.unitOfMeasurement || i.item?.unitOfMeasurement || 'pcs',
        quantityReturned: i.quantity || 0,
        acceptedQuantity: i.quantity || 0,
        rejectedQuantity: 0,
        condition: i.condition || 'good'
      }))
    );
    setFormError('');
    setIsReceiveModalOpen(true);
  };

  // Submit Receive & Restock
  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setSubmitting(true);
    setFormError('');

    try {
      const payload = {
        receivedItems: receiveItems.map((ri) => ({
          itemId: ri.itemId,
          acceptedQuantity: Number(ri.acceptedQuantity),
          rejectedQuantity: Number(ri.rejectedQuantity || 0),
          condition: ri.condition
        })),
        note: receiveNote
      };

      const res = await storeService.receiveStaffReturn(selectedReturn._id, payload);
      if (res.success) {
        setIsReceiveModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to process material restock');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Reject Modal
  const handleOpenRejectModal = (ret) => {
    setSelectedReturn(ret);
    setRejectionReason('');
    setFormError('');
    setIsRejectModalOpen(true);
  };

  // Submit Reject
  const handleSubmitReject = async (e) => {
    e.preventDefault();
    if (!selectedReturn) return;

    setSubmitting(true);
    setFormError('');

    try {
      const res = await storeService.rejectStaffReturn(selectedReturn._id, { rejectionReason });
      if (res.success) {
        setIsRejectModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to reject material return');
    } finally {
      setSubmitting(false);
    }
  };

  // Print voucher
  const handleOpenPrintModal = (ret) => {
    setSelectedReturn(ret);
    setIsPrintModalOpen(true);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  // Status badge config
  const getStatusBadge = (status) => {
    switch (status) {
      case 'received':
        return <Badge status="active" text="Received & Restocked" size="xs" />;
      case 'partially received':
        return <Badge status="warning" text="Partially Received" size="xs" />;
      case 'rejected':
        return <Badge status="suspended" text="Rejected" size="xs" />;
      default:
        return <Badge status="pending" text="Pending Inspection" size="xs" />;
    }
  };

  // Summary Metrics
  const totalCount = returns.length;
  const pendingCount = returns.filter((r) => r.status === 'pending').length;
  const receivedCount = returns.filter((r) => r.status === 'received').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-primary-500" />
            <span>Staff Material Returns (SRV)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Return unused, excess, or defective materials back to warehouse inventory
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh returns"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('actions.refresh')}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Material Return</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalCount}</div>
            <div className="text-xs text-slate-400 font-medium">Total Returns Logged</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <div className="text-xs text-slate-400 font-medium">Awaiting Store Inspection</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{receivedCount}</div>
            <div className="text-xs text-slate-400 font-medium">Restocked to Inventory</div>
          </div>
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
            placeholder="Search by Return #, reason, staff name, job reference..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Inspection</option>
            <option value="received">Received & Restocked</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>
                {w.warehouseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Returns List */}
      <div className="w-full">
        {filteredReturns.length === 0 ? (
          <EmptyState
            title="No Material Returns Found"
            description="Employees and production staff can return excess, unused, or defective materials back to the store."
            icon={RotateCcw}
            actionLabel="Create First Material Return"
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Return #</th>
                    <th className="px-4 py-3">Returned By / Dept</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Returned Items</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredReturns.map((ret) => {
                    const isStorekeeper = hasRole(['admin', 'storekeeper']);
                    const canReceive = ret.status === 'pending' && isStorekeeper;

                    return (
                      <tr key={ret._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {ret.returnNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(ret.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {ret.returnedBy?.fullName || 'Staff Member'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {ret.department}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                          {ret.warehouse?.warehouseName}
                        </td>

                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {ret.items?.map((i, idx) => (
                              <div key={idx} className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {i.quantity} {i.unitOfMeasurement}
                                </span>
                                <span>{i.item?.itemName}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                    i.condition === 'good'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                  }`}
                                >
                                  {i.condition}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          <div>{ret.reason}</div>
                          {ret.jobReference && (
                            <div className="text-[10px] text-primary-500 font-medium">Job: {ret.jobReference}</div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {getStatusBadge(ret.status)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPrintModal(ret)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                              title="Print Store Return Voucher"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {canReceive && (
                              <>
                                <button
                                  onClick={() => handleOpenRejectModal(ret)}
                                  className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleOpenReceiveModal(ret)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Receive & Restock</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Material Return Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Material Return (SRV)"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          {/* Select Previously Approved Material Request */}
          {eligibleRequests.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>No Approved Material Requests Found</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Under store inventory policy, staff can only return materials that were previously requested, approved, and issued from the store. You currently have no approved material requests eligible for returns.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Previously Approved Material Request (REQ #) *
                </label>
                <select
                  value={formData.originalStockRequest}
                  onChange={(e) => handleSelectStockRequest(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium"
                  required
                >
                  {eligibleRequests.map((req) => (
                    <option key={req._id} value={req._id}>
                      {req.requestNumber} — {req.purpose || 'Material Request'} ({req.department}) [{req.status?.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedStockReq && (
                <div className="p-3 rounded-xl bg-primary-50/60 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 flex flex-wrap items-center justify-between gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Originating Warehouse:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedStockReq.warehouse?.warehouseName || 'Warehouse'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Department:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedStockReq.department}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Requisition Status:</span>
                    <span className="font-bold capitalize text-primary-600 dark:text-primary-400">
                      {selectedStockReq.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Request Date:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(selectedStockReq.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Return Reason *
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              >
                {COMMON_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Job / Production Reference
              </label>
              <input
                type="text"
                value={formData.jobReference}
                onChange={(e) => setFormData({ ...formData, jobReference: e.target.value })}
                placeholder="e.g. Job #402 / Offset Order"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Returned Items */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
                  Items to Return
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Restricted to items approved in the selected material request
                </span>
              </div>
              {selectedStockReq?.items?.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="text-primary-500 hover:text-primary-600 font-bold flex items-center gap-1 text-[11px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              )}
            </div>

            {formData.items.map((row, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <label className="text-[10px] text-slate-400 font-medium block">Item from REQ *</label>
                    <select
                      value={row.item}
                      onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                      required
                    >
                      {selectedStockReq?.items?.map((it) => (
                        <option key={it._id || it.item?._id || it.item} value={it.item?._id || it.item}>
                          {it.item?.itemName || 'Item'} ({it.item?.itemCode || ''}) — Max: {it.issuedQuantity || it.approvedQuantity} {it.unitOfMeasurement || it.item?.unitOfMeasurement || 'pcs'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block">Qty to Return *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      max={row.maxAllowed || undefined}
                      value={row.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-center font-bold"
                      required
                    />
                    <div className="text-[9px] text-slate-400 text-center mt-0.5">
                      Max: {row.maxAllowed || 0}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block">UoM</label>
                    <input
                      type="text"
                      value={row.unitOfMeasurement}
                      readOnly
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-500 text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-medium block">Condition</label>
                    <select
                      value={row.condition}
                      onChange={(e) => handleItemChange(idx, 'condition', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-[11px]"
                    >
                      <option value="good">Good (Restock)</option>
                      <option value="damaged">Damaged</option>
                      <option value="scrap">Scrap</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex justify-end pt-3">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Provide any details regarding why material is being returned..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || eligibleRequests.length === 0}
              className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-xs transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Material Return'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Storekeeper Receive & Restock Modal */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title="Inspect, Receive & Restock Materials"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitReceive} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <div>
              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {selectedReturn?.returnNumber}
              </div>
              <div className="text-[10px] text-slate-400">
                Returned by: {selectedReturn?.returnedBy?.fullName} ({selectedReturn?.department})
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-400 font-medium">Target Warehouse:</div>
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {selectedReturn?.warehouse?.warehouseName}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px]">
              Item Restocking Verification
            </div>

            {receiveItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {item.itemName} <span className="text-slate-400 font-mono">({item.itemCode})</span>
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    Staff Returned: {item.quantityReturned} {item.unitOfMeasurement}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-medium block">
                      Accepted Quantity to Restock
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={item.quantityReturned}
                      value={item.acceptedQuantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReceiveItems((prev) => {
                          const next = [...prev];
                          next[idx].acceptedQuantity = val;
                          next[idx].rejectedQuantity = Math.max(0, item.quantityReturned - Number(val));
                          return next;
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-medium block">
                      Restock Condition
                    </label>
                    <select
                      value={item.condition}
                      onChange={(e) => {
                        const val = e.target.value;
                        setReceiveItems((prev) => {
                          const next = [...prev];
                          next[idx].condition = val;
                          return next;
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-semibold"
                    >
                      <option value="good">Good (Increases Live QuantityOnHand)</option>
                      <option value="damaged">Damaged (Moves to Damaged Stock)</option>
                      <option value="scrap">Scrap (Logged to Damaged Stock)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Storekeeper Receiving Note
            </label>
            <textarea
              rows={2}
              value={receiveNote}
              onChange={(e) => setReceiveNote(e.target.value)}
              placeholder="e.g. Verified count and returned to bin A-12..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsReceiveModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Processing...' : 'Confirm & Restock Into Warehouse'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Material Return"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmitReject} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Rejection Reason *
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this material return is rejected..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition"
            >
              {submitting ? 'Rejecting...' : 'Reject Return'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Print Store Return Voucher (SRV) Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Store Return Voucher (SRV)"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6 text-slate-900 dark:text-slate-100">
          <div className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xs space-y-6 print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <img src="/gt-logo.jpg" alt="Logo" className="w-12 h-12 object-contain" />
                <div>
                  <h2 className="text-lg font-black tracking-tight text-primary-600">GT PRINTING PLC</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    STORE RETURN VOUCHER (SRV)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono font-bold text-slate-900">
                  {selectedReturn?.returnNumber}
                </div>
                <div className="text-[11px] text-slate-500">
                  Date: {selectedReturn?.createdAt ? new Date(selectedReturn.createdAt).toLocaleDateString() : '-'}
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Returned By Staff:</span>
                <span className="font-bold">{selectedReturn?.returnedBy?.fullName || '-'}</span>
                <span className="text-slate-500 block">Department: {selectedReturn?.department || '-'}</span>
                {selectedReturn?.originalStockRequest && (
                  <span className="text-primary-600 font-semibold block mt-1">
                    Originating REQ #: {selectedReturn.originalStockRequest?.requestNumber || selectedReturn.originalStockRequest}
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Target Warehouse:</span>
                <span className="font-bold">{selectedReturn?.warehouse?.warehouseName || '-'}</span>
                <span className="text-slate-500 block">Status: {selectedReturn?.status?.toUpperCase()}</span>
                {selectedReturn?.jobReference && (
                  <span className="text-slate-500 block">Job Ref: {selectedReturn.jobReference}</span>
                )}
              </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs text-left border border-slate-200">
              <thead className="bg-slate-50 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Item Code</th>
                  <th className="p-2">Item Description</th>
                  <th className="p-2 text-center">Returned Qty</th>
                  <th className="p-2 text-center">Accepted Qty</th>
                  <th className="p-2 text-center">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedReturn?.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2">{idx + 1}</td>
                    <td className="p-2 font-mono font-semibold">{item.item?.itemCode || '-'}</td>
                    <td className="p-2 font-bold">{item.item?.itemName || '-'}</td>
                    <td className="p-2 text-center font-bold">
                      {item.quantity} {item.unitOfMeasurement}
                    </td>
                    <td className="p-2 text-center font-bold text-emerald-600">
                      {item.acceptedQuantity || item.quantity} {item.unitOfMeasurement}
                    </td>
                    <td className="p-2 text-center uppercase font-bold text-[10px]">
                      {item.condition}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Reason */}
            <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-bold block text-slate-700">Reason for Return:</span>
              <span className="text-slate-600">{selectedReturn?.reason}</span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-xs border-t border-slate-200">
              <div className="space-y-8">
                <div>
                  <span className="block font-bold">Returned By (Staff Signature):</span>
                  <div className="border-b border-slate-300 w-48 mt-6"></div>
                </div>
              </div>
              <div className="space-y-8 text-right flex flex-col items-end">
                <div>
                  <span className="block font-bold">Received & Restocked By (Storekeeper):</span>
                  <div className="border-b border-slate-300 w-48 mt-6"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsPrintModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              Close
            </button>
            <button
              onClick={handleTriggerPrint}
              className="px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

