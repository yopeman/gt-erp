import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n';
import crmService from '../../services/crmService';
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
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  User,
  DollarSign
} from 'lucide-react';

const CUSTOMER_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'company', label: 'Company / Business' },
  { value: 'corporation', label: 'Corporation / Enterprise' },
  { value: 'government', label: 'Government Agency' },
  { value: 'ngo', label: 'NGO / Non-Profit' },
  { value: 'individual', label: 'Individual' }
];

export default function Customers() {
  const { t } = useTranslation();

  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [creditFilter, setCreditFilter] = useState('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [creditModalCustomer, setCreditModalCustomer] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    category: 'company',
    tinNumber: '',
    vatNumber: '',
    primaryContactName: '',
    primaryContactPhone: '',
    primaryContactEmail: '',
    primaryContactPosition: 'Manager',
    billingCity: 'Addis Ababa',
    billingSubCity: '',
    billingStreet: '',
    allowedCredit: false,
    creditLimit: 0,
    creditTermDays: 30,
    assignedSalesRepresentative: '',
    notes: ''
  });

  const [creditForm, setCreditForm] = useState({
    allowedCredit: false,
    creditLimit: 0,
    creditTermDays: 30
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (creditFilter !== 'all') params.allowedCredit = creditFilter;

      const res = await crmService.getCustomers(params);
      setCustomers(res.data?.customers || res.customers || []);
    } catch (err) {
      setError(err?.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await crmService.getEmployees({ limit: 100 });
      setEmployees(res.data?.employees || res.employees || []);
    } catch {
      // Non-blocking lookup
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchEmployees();
  }, [categoryFilter, creditFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleOpenCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      companyName: '',
      category: 'company',
      tinNumber: '',
      vatNumber: '',
      primaryContactName: '',
      primaryContactPhone: '',
      primaryContactEmail: '',
      primaryContactPosition: 'Manager',
      billingCity: 'Addis Ababa',
      billingSubCity: '',
      billingStreet: '',
      allowedCredit: false,
      creditLimit: 0,
      creditTermDays: 30,
      assignedSalesRepresentative: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingCustomer(c);
    const primaryContact = c.contactPersons?.find((p) => p.isPrimary) || c.contactPersons?.[0] || {};
    setFormData({
      name: c.name || '',
      companyName: c.companyName || '',
      category: c.category || 'company',
      tinNumber: c.tinNumber || '',
      vatNumber: c.vatNumber || '',
      primaryContactName: primaryContact.name || '',
      primaryContactPhone: primaryContact.phone || '',
      primaryContactEmail: primaryContact.email || '',
      primaryContactPosition: primaryContact.position || '',
      billingCity: c.billingAddress?.city || 'Addis Ababa',
      billingSubCity: c.billingAddress?.subCity || '',
      billingStreet: c.billingAddress?.street || '',
      allowedCredit: Boolean(c.creditTerms?.allowedCredit),
      creditLimit: c.creditTerms?.creditLimit || 0,
      creditTermDays: c.creditTerms?.creditTermDays || 0,
      assignedSalesRepresentative: c.assignedSalesRepresentative?._id || c.assignedSalesRepresentative || '',
      notes: c.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        companyName: formData.companyName,
        category: formData.category,
        tinNumber: formData.tinNumber,
        vatNumber: formData.vatNumber,
        contactPersons: [
          {
            name: formData.primaryContactName,
            phone: formData.primaryContactPhone,
            email: formData.primaryContactEmail,
            position: formData.primaryContactPosition,
            isPrimary: true
          }
        ],
        billingAddress: {
          city: formData.billingCity,
          subCity: formData.billingSubCity,
          street: formData.billingStreet
        },
        creditTerms: {
          allowedCredit: formData.allowedCredit,
          creditLimit: Number(formData.creditLimit || 0),
          creditTermDays: Number(formData.creditTermDays || 0)
        },
        assignedSalesRepresentative: formData.assignedSalesRepresentative || null,
        notes: formData.notes
      };

      if (editingCustomer) {
        await crmService.updateCustomer(editingCustomer._id, payload);
      } else {
        await crmService.createCustomer(payload);
      }

      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert(err?.message || 'Error saving customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCreditModal = (customer) => {
    setCreditModalCustomer(customer);
    setCreditForm({
      allowedCredit: Boolean(customer.creditTerms?.allowedCredit),
      creditLimit: customer.creditTerms?.creditLimit || 0,
      creditTermDays: customer.creditTerms?.creditTermDays || 30
    });
  };

  const handleSaveCreditTerms = async (e) => {
    e.preventDefault();
    if (!creditModalCustomer) return;
    try {
      setSubmitting(true);
      await crmService.updateCreditTerms(creditModalCustomer._id, creditForm);
      setCreditModalCustomer(null);
      fetchCustomers();
    } catch (err) {
      alert(err?.message || 'Failed to update credit terms');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCustomer = async (id) => {
    try {
      const res = await crmService.getCustomerById(id);
      setViewingCustomer(res.data || res);
    } catch (err) {
      alert(err?.message || 'Failed to load customer details');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await crmService.deleteCustomer(id);
      fetchCustomers();
    } catch (err) {
      alert(err?.message || 'Failed to delete customer');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-primary-500" />
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage commercial accounts, government entities, credit limits, and client transaction profiles.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-sm transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, TIN, code..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden text-slate-800 dark:text-slate-100"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            {CUSTOMER_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          <select
            value={creditFilter}
            onChange={(e) => setCreditFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden"
          >
            <option value="all">All Credit Statuses</option>
            <option value="true">Credit Allowed</option>
            <option value="false">Cash Only</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading customers...</div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No customers registered"
            description="Add existing clients or convert sales leads to start building your directory."
            actionLabel="Add Customer"
            onAction={handleOpenCreateModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Customer / Company</th>
                  <th className="py-3 px-4">TIN / VAT</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">Credit Terms</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c) => {
                  const primaryContact = c.contactPersons?.find((p) => p.isPrimary) || c.contactPersons?.[0];
                  return (
                    <tr key={c._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {c.customerNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400 capitalize">{c.category}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800 dark:text-slate-200">
                          {c.tinNumber || '-'}
                        </div>
                        {c.vatNumber && (
                          <div className="text-[10px] text-slate-400">VAT: {c.vatNumber}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {primaryContact ? (
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{primaryContact.name}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3" /> {primaryContact.phone}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No contact</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.creditTerms?.allowedCredit ? (
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              Limit: {formatCurrency(c.creditTerms.creditLimit)}
                            </span>
                            <div className="text-[11px] text-slate-400">
                              Terms: {c.creditTerms.creditTermDays} Days | Due: {formatCurrency(c.creditTerms.currentBalance)}
                            </div>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                            Cash Basis
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={c.status === 'active' ? 'success' : 'danger'}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewCustomer(c._id)}
                            title="View Customer Profile"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenCreditModal(c)}
                            title="Manage Credit Terms"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(c)}
                            title="Edit Customer"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteCustomer(c._id)}
                            title="Delete Customer"
                            disabled={c.creditTerms?.currentBalance > 0}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-40"
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

      {/* Create / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? `Edit Customer: ${editingCustomer.customerNumber}` : 'Register New Customer'}
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Customer / Organization Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ethiopian Airlines Group"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="company">Company / Business</option>
                <option value="corporation">Corporation</option>
                <option value="government">Government Agency</option>
                <option value="ngo">NGO / Non-Profit</option>
                <option value="individual">Individual</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tax Identification Number (TIN)
              </label>
              <input
                type="text"
                value={formData.tinNumber}
                onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                placeholder="e.g. 0012345678"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                VAT Registration Number
              </label>
              <input
                type="text"
                value={formData.vatNumber}
                onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                placeholder="e.g. VAT-987654321"
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Primary Contact Section */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary-500" /> Primary Contact Person
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.primaryContactName}
                  onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                  placeholder="e.g. Tigist Haile"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.primaryContactPhone}
                  onChange={(e) => setFormData({ ...formData, primaryContactPhone: e.target.value })}
                  placeholder="e.g. +251 91 123 4567"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.primaryContactEmail}
                  onChange={(e) => setFormData({ ...formData, primaryContactEmail: e.target.value })}
                  placeholder="contact@company.com"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Position</label>
                <input
                  type="text"
                  value={formData.primaryContactPosition}
                  onChange={(e) => setFormData({ ...formData, primaryContactPosition: e.target.value })}
                  placeholder="e.g. Procurement Director"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Credit Terms Configuration */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Credit Facility</div>
                <div className="text-[11px] text-slate-400">Allow invoicing with net payment terms</div>
              </div>
              <input
                type="checkbox"
                checked={formData.allowedCredit}
                onChange={(e) => setFormData({ ...formData, allowedCredit: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded-sm"
              />
            </div>

            {formData.allowedCredit && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Credit Limit (ETB)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Term Window (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.creditTermDays}
                    onChange={(e) => setFormData({ ...formData, creditTermDays: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Account Manager / Assigned Sales Rep
            </label>
            <select
              value={formData.assignedSalesRepresentative}
              onChange={(e) => setFormData({ ...formData, assignedSalesRepresentative: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="">-- Unassigned --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Credit Terms Quick Edit Modal */}
      {creditModalCustomer && (
        <Modal
          isOpen={Boolean(creditModalCustomer)}
          onClose={() => setCreditModalCustomer(null)}
          title={`Credit Terms: ${creditModalCustomer.name}`}
        >
          <form onSubmit={handleSaveCreditTerms} className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Allow Credit Invoicing</span>
                <p className="text-[11px] text-slate-400">Permit credit orders within approved threshold</p>
              </div>
              <input
                type="checkbox"
                checked={creditForm.allowedCredit}
                onChange={(e) => setCreditForm({ ...creditForm, allowedCredit: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded-sm"
              />
            </div>

            {creditForm.allowedCredit && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Credit Limit (ETB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={creditForm.creditLimit}
                    onChange={(e) => setCreditForm({ ...creditForm, creditLimit: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Window (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={creditForm.creditTermDays}
                    onChange={(e) => setCreditForm({ ...creditForm, creditTermDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCreditModalCustomer(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
              >
                {submitting ? 'Updating...' : 'Update Credit Terms'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Customer Detail View Drawer */}
      {viewingCustomer && (
        <Modal
          isOpen={Boolean(viewingCustomer)}
          onClose={() => setViewingCustomer(null)}
          title={`Customer Profile: ${viewingCustomer.name} (${viewingCustomer.customerNumber})`}
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
            {/* Top overview banner */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{viewingCustomer.name}</h3>
                <span className="text-slate-400 capitalize">{viewingCustomer.category} • TIN: {viewingCustomer.tinNumber || 'N/A'}</span>
              </div>
              <Badge variant={viewingCustomer.status === 'active' ? 'success' : 'danger'}>
                {viewingCustomer.status}
              </Badge>
            </div>

            {/* Credit Status Card */}
            <div className="p-3.5 rounded-xl bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Credit Allowed</span>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {viewingCustomer.creditTerms?.allowedCredit ? 'Yes' : 'Cash Only'}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Credit Limit</span>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(viewingCustomer.creditTerms?.creditLimit)}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Current Balance</span>
                <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatCurrency(viewingCustomer.creditTerms?.currentBalance)}
                </div>
              </div>
            </div>

            {/* Contact Persons */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-2">
                Contacts
              </h4>
              <div className="space-y-2">
                {viewingCustomer.contactPersons?.map((cp, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{cp.name}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5">({cp.position || 'Contact'})</span>
                      <div className="text-slate-500 flex items-center gap-2 mt-0.5 text-[11px]">
                        <span>{cp.phone}</span>
                        {cp.email && <span>• {cp.email}</span>}
                      </div>
                    </div>
                    {cp.isPrimary && <Badge variant="primary">Primary</Badge>}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Follow-ups */}
            {viewingCustomer.recentFollowups?.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[11px] mb-2">
                  Recent Interactions & Follow-ups
                </h4>
                <div className="space-y-2">
                  {viewingCustomer.recentFollowups.map((flw) => (
                    <div key={flw._id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{flw.agenda}</span>
                        <Badge variant={flw.status === 'completed' ? 'success' : 'warning'}>{flw.status}</Badge>
                      </div>
                      <div className="text-slate-400 text-[10px] mt-1">
                        {new Date(flw.scheduledTime).toLocaleDateString()} by {flw.assignedTo?.firstName} {flw.assignedTo?.lastName}
                      </div>
                      {flw.result && <p className="text-slate-700 dark:text-slate-300 mt-1">{flw.result}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

