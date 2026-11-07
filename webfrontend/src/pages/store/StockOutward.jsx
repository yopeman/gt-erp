import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  ArrowUpFromLine,
  Plus,
  Search,
  Printer,
  RefreshCw,
  Trash2,
  ShieldCheck
} from 'lucide-react';

const DEPARTMENTS = [
  'Production',
  'Pre-Press',
  'Post-Press & Binding',
  'Maintenance',
  'Design & Creative',
  'Administration',
  'Logistics',
  'Sales & Marketing',
  'Finance'
];

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent (Production Stop)' },
  { value: 'high', label: 'High Priority' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low / Routine' }
];

export default function StockOutward() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [balances, setBalances] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Create Form State
  const [formData, setFormData] = useState({
    department: 'Production',
    warehouse: '',
    purpose: '',
    priority: 'medium',
    requiredDate: new Date().toISOString().split('T')[0],
    note: '',
    items: [{ item: '', requestedQuantity: 1, unitOfMeasurement: 'piece', note: '' }]
  });

  // Approval items
  const [approvalItems, setApprovalItems] = useState([]);
  const [approvalComment, setApprovalComment] = useState('');

  // Issue items
  const [issueItems, setIssueItems] = useState([]);
  const [issueNote, setIssueNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [reqRes, itemsRes, whRes, balRes] = await Promise.allSettled([
        storeService.getStockRequests({ limit: 150 }),
        storeService.getItems({ limit: 200 }),
        storeService.getWarehouses({ limit: 50 }),
        storeService.getStockBalances({ limit: 300 })
      ]);

      if (reqRes.status === 'fulfilled' && reqRes.value?.data) {
        setRequests(Array.isArray(reqRes.value.data) ? reqRes.value.data : []);
      }
      if (itemsRes.status === 'fulfilled' && itemsRes.value?.data) {
        setItemsCatalog(Array.isArray(itemsRes.value.data) ? itemsRes.value.data : []);
      }
      if (whRes.status === 'fulfilled' && whRes.value?.data) {
        const whList = Array.isArray(whRes.value.data) ? whRes.value.data : [];
        setWarehouses(whList);
        if (whList.length > 0 && !formData.warehouse) {
          setFormData((prev) => ({ ...prev, warehouse: whList[0]._id }));
        }
      }
      if (balRes.status === 'fulfilled' && balRes.value?.data) {
        setBalances(Array.isArray(balRes.value.data) ? balRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load stock requests:', err);
      setError(err.message || 'Failed to load material requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      !search ||
      r.requestNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.purpose?.toLowerCase().includes(search.toLowerCase()) ||
      r.requestedBy?.fullName?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesDept = !deptFilter || r.department === deptFilter;
    const matchesWarehouse = !warehouseFilter || (r.warehouse?._id || r.warehouse) === warehouseFilter;

    return matchesSearch && matchesStatus && matchesDept && matchesWarehouse;
  });

  // Open Create Request
  const handleOpenCreateModal = () => {
    setFormData({
      department: 'Production',
      warehouse: warehouses[0]?._id || '',
      purpose: '',
      priority: 'medium',
      requiredDate: new Date().toISOString().split('T')[0],
      note: '',
      items: [{ item: itemsCatalog[0]?._id || '', requestedQuantity: 1, unitOfMeasurement: itemsCatalog[0]?.unitOfMeasurement || 'piece', note: '' }]
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Add Item Line to Create Form
  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { item: itemsCatalog[0]?._id || '', requestedQuantity: 1, unitOfMeasurement: itemsCatalog[0]?.unitOfMeasurement || 'piece', note: '' }
      ]
    }));
  };

  // Remove Item Line
  const handleRemoveItemRow = (idx) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  // Change Item in Row
  const handleItemChange = (idx, itemId) => {
    const selectedItem = itemsCatalog.find((it) => it._id === itemId);
    const updated = [...formData.items];
    updated[idx].item = itemId;
    if (selectedItem) {
      updated[idx].unitOfMeasurement = selectedItem.unitOfMeasurement || 'piece';
    }
    setFormData({ ...formData, items: updated });
  };

  // Submit New Request
  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!formData.warehouse || !formData.purpose.trim() || formData.items.length === 0) {
      setFormError('Please fill in warehouse, purpose, and at least one item.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const res = await storeService.createStockRequest(formData);
      if (res.success) {
        setIsCreateModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit stock request');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Approval Modal
  const handleOpenApproveModal = (req) => {
    setSelectedRequest(req);
    setApprovalComment('');
    setApprovalItems(
      (req.items || []).map((i) => ({
        itemId: i._id,
        itemRef: i.item,
        itemName: i.item?.itemName || 'Item',
        itemCode: i.item?.itemCode || '',
        unitOfMeasurement: i.unitOfMeasurement || i.item?.unitOfMeasurement || 'pcs',
        requestedQuantity: i.requestedQuantity || 0,
        approvedQuantity: i.requestedQuantity || 0
      }))
    );
    setFormError('');
    setIsApproveModalOpen(true);
  };

  // Submit Approval
  const handleSubmitApprove = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        status: 'approved',
        approvedItems: approvalItems.map((ai) => ({
          itemId: ai.itemId,
          approvedQuantity: Number(ai.approvedQuantity)
        })),
        comment: approvalComment
      };

      const res = await storeService.approveStockRequest(selectedRequest._id, payload);
      if (res.success) {
        setIsApproveModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to approve material request');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Issue Modal (Storekeeper action)
  const handleOpenIssueModal = (req) => {
    setSelectedRequest(req);
    setIssueNote('');
    setIssueItems(
      (req.items || []).map((i) => {
        const remaining = Math.max(0, (i.approvedQuantity || i.requestedQuantity || 0) - (i.issuedQuantity || 0));
        // Find warehouse balance for this item
        const whBalance = balances.find(
          (b) =>
            (b.warehouse?._id || b.warehouse) === (req.warehouse?._id || req.warehouse) &&
            (b.item?._id || b.item) === (i.item?._id || i.item)
        );
        return {
          itemId: i._id,
          itemRef: i.item,
          itemName: i.item?.itemName || 'Item',
          itemCode: i.item?.itemCode || '',
          unitOfMeasurement: i.unitOfMeasurement || i.item?.unitOfMeasurement || 'pcs',
          approvedQuantity: i.approvedQuantity || i.requestedQuantity || 0,
          issuedQuantitySoFar: i.issuedQuantity || 0,
          remainingToIssue: remaining,
          issuedQuantity: remaining,
          availableInStore: whBalance ? whBalance.quantityOnHand : 0
        };
      })
    );
    setFormError('');
    setIsIssueModalOpen(true);
  };

  // Submit Issuance (Deducts stock balance and logs movements!)
  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    if (!selectedRequest) return;

    // Check if any issue quantity exceeds available stock
    for (const it of issueItems) {
      if (Number(it.issuedQuantity) > it.availableInStore) {
        setFormError(
          `Cannot issue ${it.issuedQuantity} ${it.unitOfMeasurement} of "${it.itemName}". Only ${it.availableInStore} available in warehouse.`
        );
        return;
      }
    }

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        issuedItems: issueItems.map((ii) => ({
          itemId: ii.itemId,
          issuedQuantity: Number(ii.issuedQuantity)
        })),
        note: issueNote
      };

      const res = await storeService.issueStockRequest(selectedRequest._id, payload);
      if (res.success) {
        setIsIssueModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to issue materials');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Print Modal (Store Issue Voucher - SIV)
  const handleOpenPrintModal = (req) => {
    setSelectedRequest(req);
    setIsPrintModalOpen(true);
  };

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
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {t('store.storeOutward')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Department material requisitions, approvals, and Store Issue Vouchers (SIV)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition flex items-center gap-1.5"
            title="Refresh requests"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('actions.refresh')}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-primary-500 hover:bg-primary-600 text-white shadow-xs transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{t('store.createRequest')}</span>
          </button>
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
            placeholder="Search by Request #, purpose, job reference, requester..."
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
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved (Awaiting Issue)</option>
            <option value="partially issued">Partially Issued</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:ring-primary-500"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
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

      {/* Material Requests List */}
      <div className="w-full">
        {filteredRequests.length === 0 ? (
          <EmptyState
            title="No Material Requests Found"
            description="Raise a material requisition for paper, inks, plates, or spare parts from the store."
            icon={ArrowUpFromLine}
            actionLabel="Create First Material Request"
            onAction={handleOpenCreateModal}
          />
        ) : (
          <>
            {/* Mobile View: Card Deck (Strictly no tables on mobile) */}
            <div className="block md:hidden space-y-3">
              {filteredRequests.map((req) => {
                const canApprove = req.status === 'pending' && hasRole(['admin', 'manager', 'storekeeper']);
                const canIssue =
                  ['approved', 'partially approved', 'partially issued'].includes(req.status) &&
                  hasRole(['admin', 'storekeeper']);

                return (
                  <div
                    key={req._id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs hover:border-primary-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {req.requestNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {req.department} • {req.warehouse?.warehouseName}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {req.priority && req.priority !== 'medium' && (
                          <Badge status={req.priority} text={req.priority} size="xs" />
                        )}
                        <Badge status={req.status || 'pending'} size="xs" />
                      </div>
                    </div>

                    <div className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Purpose: <span className="font-normal">{req.purpose || '-'}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2 text-slate-600 dark:text-slate-300">
                      <div>
                        <span className="text-slate-400">Requested By:</span>{' '}
                        <span>{req.requestedBy?.fullName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Date:</span>{' '}
                        <span>{formatDate(req.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Items:</span>{' '}
                        <span>{req.items?.length || 0} line items</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60 pt-2">
                      <button
                        onClick={() => handleOpenPrintModal(req)}
                        className="px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs flex items-center gap-1 font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>SIV Slip</span>
                      </button>

                      {canApprove && (
                        <button
                          onClick={() => handleOpenApproveModal(req)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs flex items-center gap-1 font-bold"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                      )}

                      {canIssue && (
                        <button
                          onClick={() => handleOpenIssueModal(req)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1 font-bold"
                        >
                          <ArrowUpFromLine className="w-3.5 h-3.5" />
                          <span>Issue Material</span>
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
                    <th className="px-4 py-3">Request #</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Purpose / Job Reference</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Requested By</th>
                    <th className="px-4 py-3 text-center">Items</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredRequests.map((req) => {
                    const canApprove = req.status === 'pending' && hasRole(['admin', 'manager', 'storekeeper']);
                    const canIssue =
                      ['approved', 'partially approved', 'partially issued'].includes(req.status) &&
                      hasRole(['admin', 'storekeeper']);

                    return (
                      <tr
                        key={req._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {req.requestNumber}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                          {req.department}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                          {req.purpose || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {req.warehouse?.warehouseName || '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {req.requestedBy?.fullName || '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-200">
                          {req.items?.length || 0} lines
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge status={req.priority || 'medium'} text={req.priority} size="xs" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge status={req.status || 'pending'} size="xs" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPrintModal(req)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                              title="Print Store Issue Voucher (SIV)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {canApprove && (
                              <button
                                onClick={() => handleOpenApproveModal(req)}
                                className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition text-[11px] font-bold flex items-center gap-1"
                                title="Approve Material Quantities"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}

                            {canIssue && (
                              <button
                                onClick={() => handleOpenIssueModal(req)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition text-[11px] font-bold flex items-center gap-1"
                                title="Issue Materials from Store"
                              >
                                <ArrowUpFromLine className="w-3.5 h-3.5" />
                                <span>Issue</span>
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

      {/* Create Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('store.createRequest')}
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
                Requesting Department *
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Source Warehouse *
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
                Urgency / Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Purpose / Job Reference *
            </label>
            <input
              type="text"
              required
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              placeholder="e.g. Printing 10,000 Brochures for Client XYZ - Job #4928"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Requested Items Dynamic Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Requested Materials & Quantities
              </h4>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 text-[11px] font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2">Select Item from Catalog</th>
                    <th className="px-3 py-2 text-center">Quantity</th>
                    <th className="px-3 py-2 text-center">UOM</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-2 py-2 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {formData.items.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <select
                          required
                          value={row.item}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                        >
                          {itemsCatalog.map((it) => (
                            <option key={it._id} value={it._id}>
                              {it.itemName} ({it.itemCode})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.requestedQuantity}
                          onChange={(e) => {
                            const updated = [...formData.items];
                            updated[idx].requestedQuantity = Number(e.target.value);
                            setFormData({ ...formData, items: updated });
                          }}
                          className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-slate-500">
                        {row.unitOfMeasurement}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.note}
                          onChange={(e) => {
                            const updated = [...formData.items];
                            updated[idx].note = e.target.value;
                            setFormData({ ...formData, items: updated });
                          }}
                          placeholder="Specific size or roll cut"
                          className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-primary-500 hover:bg-primary-600 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Submit Material Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Approve Material Request Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title={selectedRequest ? `Approve Request: ${selectedRequest.requestNumber}` : 'Approve Request'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitApprove} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-center">Requested</th>
                  <th className="px-3 py-2 text-center">Approved Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {approvalItems.map((ai, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{ai.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ai.itemCode}</div>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 font-bold">
                      {ai.requestedQuantity} {ai.unitOfMeasurement}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={ai.approvedQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...approvalItems];
                          updated[idx].approvedQuantity = val;
                          setApprovalItems(updated);
                        }}
                        className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Approval Comment
            </label>
            <textarea
              rows={2}
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              placeholder="Approval remarks, machine scheduling notes, etc."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsApproveModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Approving...' : 'Authorize Material Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Issue Material Modal (Storekeeper Fulfillment) */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title={selectedRequest ? `Issue Materials: ${selectedRequest.requestNumber}` : 'Issue Materials'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitIssue} className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {formError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            Issuing materials will deduct physical stock on hand from warehouse{' '}
            <strong>{selectedRequest?.warehouse?.warehouseName}</strong> and record an official{' '}
            <strong>Stock Issue</strong> ledger transaction.
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2 text-center">Approved</th>
                  <th className="px-3 py-2 text-center">Prev. Issued</th>
                  <th className="px-3 py-2 text-center">Available in Store</th>
                  <th className="px-3 py-2 text-center">Issue Now *</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {issueItems.map((ii, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{ii.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ii.itemCode}</div>
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 font-bold">
                      {ii.approvedQuantity} {ii.unitOfMeasurement}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500">
                      {ii.issuedQuantitySoFar}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-300">
                      {ii.availableInStore}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        min="0"
                        max={ii.availableInStore}
                        value={ii.issuedQuantity}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...issueItems];
                          updated[idx].issuedQuantity = val;
                          setIssueItems(updated);
                        }}
                        className="w-20 px-2 py-1 text-center font-bold rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Storekeeper Issuance Remarks
            </label>
            <textarea
              rows={2}
              value={issueNote}
              onChange={(e) => setIssueNote(e.target.value)}
              placeholder="Release note, packaging, gate pass reference"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsIssueModalOpen(false)}
              className="px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
            >
              {submitting ? 'Releasing Stock...' : 'Confirm Release & Deduct Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Official Printable Store Issue Voucher (SIV) Modal */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Store Issue Voucher (SIV)"
        maxWidth="max-w-3xl"
      >
        {selectedRequest && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-slate-100">
            {/* Printable Voucher Paper */}
            <div id="printable-siv" className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-6 print:border-none print:p-0">
              {/* GT Header */}
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
                      Enterprise ERP • Store Release Division
                    </p>
                    <p className="text-[10px] text-slate-400">Addis Ababa, Ethiopia</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black uppercase bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-lg border border-primary-500/20 inline-block">
                    STORE ISSUE VOUCHER (SIV)
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedRequest.requestNumber}
                  </div>
                </div>
              </div>

              {/* SIV Metadata Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Date of Request</span>
                  <span className="font-bold">{formatDate(selectedRequest.createdAt)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Department</span>
                  <span className="font-bold">{selectedRequest.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Store Warehouse</span>
                  <span className="font-bold">{selectedRequest.warehouse?.warehouseName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Status</span>
                  <span className="font-bold uppercase text-emerald-600">{selectedRequest.status}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block text-[10px]">Purpose / Job Reference</span>
                  <span className="font-semibold">{selectedRequest.purpose}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Requested By</span>
                  <span className="font-bold">{selectedRequest.requestedBy?.fullName || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Approved By</span>
                  <span className="font-bold">{selectedRequest.approvedBy?.fullName || 'Authorized Manager'}</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 uppercase font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2">Item Code</th>
                      <th className="px-3 py-2">Material Description</th>
                      <th className="px-3 py-2 text-center">Unit</th>
                      <th className="px-3 py-2 text-center">Requested</th>
                      <th className="px-3 py-2 text-center">Approved</th>
                      <th className="px-3 py-2 text-center">Issued Qty</th>
                      <th className="px-3 py-2 text-right">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {(selectedRequest.items || []).map((it, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-mono font-bold">{it.item?.itemCode || '-'}</td>
                        <td className="px-3 py-2 font-semibold">{it.item?.itemName || 'Item'}</td>
                        <td className="px-3 py-2 text-center">{it.unitOfMeasurement || it.item?.unitOfMeasurement || 'pcs'}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{it.requestedQuantity}</td>
                        <td className="px-3 py-2 text-center font-bold text-sky-600">{it.approvedQuantity || it.requestedQuantity}</td>
                        <td className="px-3 py-2 text-center font-black text-emerald-600">{it.issuedQuantity || 0}</td>
                        <td className="px-3 py-2 text-right text-slate-400">{it.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-4 gap-4 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
                <div className="space-y-6">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Requested By
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-2" />
                  <div className="text-[9px] text-slate-400">Sign & Date</div>
                </div>

                <div className="space-y-6">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Dept Head Approval
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-2" />
                  <div className="text-[9px] text-slate-400">Sign & Date</div>
                </div>

                <div className="space-y-6">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Storekeeper / Issued By
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-2" />
                  <div className="text-[9px] text-slate-400">Sign & Date</div>
                </div>

                <div className="space-y-6">
                  <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                    Received By (Dept)
                  </div>
                  <div className="border-b border-dashed border-slate-400 mx-2" />
                  <div className="text-[9px] text-slate-400">Sign & Date</div>
                </div>
              </div>
            </div>

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
