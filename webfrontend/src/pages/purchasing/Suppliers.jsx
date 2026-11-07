import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import purchasingService from '../../services/purchasingService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  Star,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Printer
} from 'lucide-react';

const SUPPLIER_TYPES = [
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'distributor', label: 'Distributor' },
  { value: 'wholesaler', label: 'Wholesaler' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'service provider', label: 'Service Provider' }
];

export default function Suppliers() {
  const { t } = useTranslation();
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [termsFilter, setTermsFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('overview'); // 'overview' | 'ledger' | 'docs'

  // Ledger state for selected supplier
  const [ledgerData, setLedgerData] = useState(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Form State
  const initialForm = {
    supplierName: '',
    supplierCode: '',
    companyName: '',
    contactPerson: '',
    email: '',
    phoneNumber: '',
    alternativePhone: '',
    address: '',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    tin: '',
    businessLicenseNumber: '',
    supplierType: 'distributor',
    paymentTerms: 'cash',
    creditLimit: 0,
    creditPeriodDays: 30,
    rating: 5,
    notes: '',
    status: 'active',
    bankDetails: [{ bankName: 'Commercial Bank of Ethiopia (CBE)', accountHolder: '', accountNumber: '' }]
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [supRes, itemRes] = await Promise.allSettled([
        purchasingService.getSuppliers({ limit: 120 }),
        purchasingService.getItems({ limit: 100 })
      ]);

      if (supRes.status === 'fulfilled' && supRes.value?.data) {
        setSuppliers(Array.isArray(supRes.value.data) ? supRes.value.data : []);
      }
      if (itemRes.status === 'fulfilled' && itemRes.value?.data) {
        setInventoryItems(Array.isArray(itemRes.value.data) ? itemRes.value.data : []);
      }
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check URL query param
  useEffect(() => {
    const paramId = searchParams.get('id');
    if (paramId && suppliers.length > 0) {
      const found = suppliers.find((s) => s._id === paramId);
      if (found) {
        handleOpenDetail(found);
      }
    }
  }, [searchParams, suppliers]);

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `ETB ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      supplierName: sup.supplierName || '',
      supplierCode: sup.supplierCode || '',
      companyName: sup.companyName || '',
      contactPerson: sup.contactPerson || '',
      email: sup.email || '',
      phoneNumber: sup.phoneNumber || '',
      alternativePhone: sup.alternativePhone || '',
      address: sup.address || '',
      city: sup.city || 'Addis Ababa',
      country: sup.country || 'Ethiopia',
      tin: sup.tin || '',
      businessLicenseNumber: sup.businessLicenseNumber || '',
      supplierType: sup.supplierType || 'distributor',
      paymentTerms: sup.paymentTerms || 'cash',
      creditLimit: sup.creditLimit || 0,
      creditPeriodDays: sup.creditPeriodDays || 30,
      rating: sup.rating || 5,
      notes: sup.notes || '',
      status: sup.status || 'active',
      bankDetails: sup.bankDetails?.length
        ? sup.bankDetails
        : [{ bankName: 'Commercial Bank of Ethiopia (CBE)', accountHolder: '', accountNumber: '' }]
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Details Modal and fetch Credit Ledger
  const handleOpenDetail = async (sup) => {
    setSelectedSupplier(sup);
    setActiveDetailTab('overview');
    setIsDetailModalOpen(true);

    // Fetch statement / ledger
    setLedgerLoading(true);
    try {
      const res = await purchasingService.getSupplierLedger(sup._id);
      if (res.success && res.data) {
        setLedgerData(res.data);
      }
    } catch (e) {
      console.warn('Could not load ledger:', e);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Handle Form Submit (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.supplierName.trim()) {
      setFormError('Supplier Name is required');
      return;
    }
    if (!formData.supplierCode.trim()) {
      setFormError('Supplier Code is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        supplierCode: formData.supplierCode.toUpperCase().trim(),
        creditLimit: Number(formData.creditLimit || 0),
        creditPeriodDays: Number(formData.creditPeriodDays || 30)
      };

      let res;
      if (editingSupplier) {
        res = await purchasingService.updateSupplier(editingSupplier._id, payload);
      } else {
        res = await purchasingService.createSupplier(payload);
      }

      if (res.success) {
        setIsModalOpen(false);
        await fetchData();
      } else {
        setFormError(res.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
      setFormError(err.message || 'Error saving supplier');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete / Deactivate
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate supplier "${name}"?`)) return;
    try {
      const res = await purchasingService.deleteSupplier(id);
      if (res.success) {
        await fetchData();
      } else {
        alert(res.message || 'Failed to deactivate supplier');
      }
    } catch (err) {
      alert(err.message || 'Error deleting supplier');
    }
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (typeFilter && s.supplierType !== typeFilter) return false;
    if (termsFilter && s.paymentTerms !== termsFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;

    if (search) {
      const term = search.toLowerCase();
      const matchName = s.supplierName?.toLowerCase().includes(term);
      const matchCode = s.supplierCode?.toLowerCase().includes(term);
      const matchPerson = s.contactPerson?.toLowerCase().includes(term);
      const matchCompany = s.companyName?.toLowerCase().includes(term);
      const matchPhone = s.phoneNumber?.toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchPerson && !matchCompany && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-primary-500" />
            {t('Suppliers & Vendors')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('vendor profiles, tin, contact directories, payment terms, and statements of account')}
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
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            {t('register supplier')}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search by name, email, position, id, or phone...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all supplier types')}</option>
            {SUPPLIER_TYPES.map((tItem) => (
              <option key={tItem.value} value={tItem.value}>{t(tItem.label)}</option>
            ))}
          </select>

          <select
            value={termsFilter}
            onChange={(e) => setTermsFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all payment types')}</option>
            <option value="cash">{t('cash on delivery')}</option>
            <option value="credit">{t('credit (ap)')}</option>
            <option value="partial">{t('partially paid')}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('all statuses')}</option>
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
            <option value="blacklisted">{t('suspended')}</option>
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
            <p className="text-sm">{t('loading purchasing & procurement metrics...')}</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t('no records found')}
            description={search || typeFilter ? t('Try adjusting your search criteria.') : t('no records found')}
            action={
              <button
                onClick={handleOpenCreate}
                className="mt-3 px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 text-white"
              >
                {t('register supplier')}
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="py-3 px-4 font-bold">{t('supplier name')}</th>
                  <th className="py-3 px-4 font-bold">{t('code')}</th>
                  <th className="py-3 px-4 font-bold">{t('contact person')}</th>
                  <th className="py-3 px-4 font-bold">{t('type')}</th>
                  <th className="py-3 px-4 font-bold">{t('payment terms')}</th>
                  <th className="py-3 px-4 font-bold">{t('credit limit')}</th>
                  <th className="py-3 px-4 font-bold">{t('rating')}</th>
                  <th className="py-3 px-4 font-bold">{t('status')}</th>
                  <th className="py-3 px-4 font-bold text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredSuppliers.map((s) => {
                  const balance = s.currentCreditBalance || 0;
                  const limit = s.creditLimit || 0;
                  const isExceeded = limit > 0 && balance > limit;

                  return (
                    <tr key={s._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <button
                          onClick={() => handleOpenDetail(s)}
                          className="hover:underline text-primary-600 text-left font-bold"
                        >
                          {s.supplierName}
                        </button>
                        {s.companyName && (
                          <div className="text-[10px] text-slate-400 font-normal">{s.companyName}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {s.supplierCode}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <div className="font-medium">{s.contactPerson || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" /> {s.phoneNumber || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 capitalize text-slate-600 dark:text-slate-300">
                        {s.supplierType}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-md ${
                          s.paymentTerms === 'credit'
                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          <CreditCard className="w-3 h-3" />
                          {s.paymentTerms}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold">
                        <div className={balance > 0 ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}>
                          {formatCurrency(balance)}
                        </div>
                        {limit > 0 && (
                          <div className={`text-[10px] font-normal ${isExceeded ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                            Limit: {formatCurrency(limit)} {isExceeded && '(Exceeded!)'}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          <span>{s.rating || 5}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge status={s.status} text={s.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(s)}
                            title="View Profile & Statement"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(s)}
                            title="Edit Supplier"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(s._id, s.supplierName)}
                            title="Deactivate Supplier"
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? `Edit Supplier - ${editingSupplier.supplierName}` : 'Register New Supplier'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier / Business Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Al-Noor Paper Imports Ltd."
                value={formData.supplierName}
                onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Unique Code *
              </label>
              <input
                type="text"
                placeholder="e.g. SUP-ALNOOR"
                value={formData.supplierCode}
                onChange={(e) => setFormData({ ...formData, supplierCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                placeholder="e.g. Abebe Kebede"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                placeholder="e.g. +251 91 123 4567"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. info@alnoorpaper.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Supplier Type
              </label>
              <select
                value={formData.supplierType}
                onChange={(e) => setFormData({ ...formData, supplierType: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                {SUPPLIER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Payment Terms
              </label>
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="cash">Cash on delivery</option>
                <option value="credit">Credit (Net 30/60)</option>
                <option value="partial">Partial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                TIN (Tax Identification Number)
              </label>
              <input
                type="text"
                placeholder="e.g. 0012345678"
                value={formData.tin}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Credit Terms Details */}
          {formData.paymentTerms === 'credit' && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-200 mb-1">
                  Credit Limit (ETB)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-900 dark:text-purple-200 mb-1">
                  Credit Period (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.creditPeriodDays}
                  onChange={(e) => setFormData({ ...formData, creditPeriodDays: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Street / Office Address
              </label>
              <input
                type="text"
                placeholder="e.g. Bole Subcity, Near Airport Cargo"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                City & Country
              </label>
              <input
                type="text"
                placeholder="e.g. Addis Ababa, Ethiopia"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary-600 hover:bg-primary-500 text-white shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DETAIL & STATEMENT OF ACCOUNT / LEDGER MODAL */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedSupplier ? `${selectedSupplier.supplierName} (${selectedSupplier.supplierCode})` : 'Supplier Details'}
        maxWidth="max-w-4xl"
      >
        {selectedSupplier && (
          <div className="space-y-4">
            {/* Tab navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <button
                onClick={() => setActiveDetailTab('overview')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeDetailTab === 'overview'
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Profile & Info
              </button>
              <button
                onClick={() => setActiveDetailTab('ledger')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeDetailTab === 'ledger'
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/60 dark:text-primary-300'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Statement of Account / Credit Ledger
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeDetailTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block">Contact:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedSupplier.contactPerson || 'N/A'}
                    </span>
                    <div className="text-[10px] text-slate-400">{selectedSupplier.phoneNumber}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 block">TIN:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {selectedSupplier.tin || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Terms:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {selectedSupplier.paymentTerms}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Rating:</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span>{selectedSupplier.rating || 5} / 5</span>
                    </div>
                  </div>
                </div>

                {/* Credit Summary Card */}
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-purple-700 dark:text-purple-300 block font-semibold">
                      Current Accounts Payable:
                    </span>
                    <span className="text-base font-black text-rose-600">
                      {formatCurrency(selectedSupplier.currentCreditBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-700 dark:text-purple-300 block font-semibold">
                      Credit Limit:
                    </span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {formatCurrency(selectedSupplier.creditLimit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-purple-700 dark:text-purple-300 block font-semibold">
                      Payment Terms:
                    </span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                      Net {selectedSupplier.creditPeriodDays || 30} Days
                    </span>
                  </div>
                </div>

                {/* Bank Details */}
                {selectedSupplier.bankDetails?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Bank Remittance Accounts
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {selectedSupplier.bankDetails.map((b, i) => (
                        <div key={i} className="p-2.5 rounded-lg border bg-white dark:bg-slate-800">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{b.bankName}</div>
                          <div className="text-[11px] text-slate-500">Account: {b.accountNumber}</div>
                          {b.accountHolder && (
                            <div className="text-[10px] text-slate-400">Holder: {b.accountHolder}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: CREDIT STATEMENT / LEDGER */}
            {activeDetailTab === 'ledger' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Chronological audit ledger of Orders (debit), Payments (credit), and Returns with live running balance.
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-100"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Statement
                  </button>
                </div>

                {ledgerLoading ? (
                  <div className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500 mb-2" />
                    <p className="text-xs">Calculating ledger balance...</p>
                  </div>
                ) : !ledgerData?.ledger || ledgerData.ledger.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No transactions recorded for this supplier yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Reference</th>
                          <th className="py-2 px-3 text-right">Debit (We Owe)</th>
                          <th className="py-2 px-3 text-right">Credit (Paid/Returned)</th>
                          <th className="py-2 px-3 text-right">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {ledgerData.ledger.map((entry, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              {entry.type}
                            </td>
                            <td className="py-2 px-3 font-mono">{entry.referenceNumber}</td>
                            <td className="py-2 px-3 text-right font-medium text-slate-800 dark:text-slate-200">
                              {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-emerald-600">
                              {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                              {formatCurrency(entry.runningBalance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
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
    </div>
  );
}

