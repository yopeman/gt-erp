import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  Edit, 
  Trash2, 
  FolderTree, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import financeService from '../../services/financeService';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    accountCode: '',
    accountName: '',
    accountType: 'asset',
    subType: 'cash_and_bank',
    currency: 'ETB',
    parentAccount: '',
    isGroupAccount: false,
    normalBalance: 'debit',
    description: '',
    isActive: true
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await financeService.getAccounts();
      setAccounts(res?.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch chart of accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({
      accountCode: '',
      accountName: '',
      accountType: 'asset',
      subType: 'cash_and_bank',
      currency: 'ETB',
      parentAccount: '',
      isGroupAccount: false,
      normalBalance: 'debit',
      description: '',
      isActive: true
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      accountCode: account.accountCode || '',
      accountName: account.accountName || '',
      accountType: account.accountType || 'asset',
      subType: account.subType || 'cash_and_bank',
      currency: account.currency || 'ETB',
      parentAccount: account.parentAccount || '',
      isGroupAccount: !!account.isGroupAccount,
      normalBalance: account.normalBalance || 'debit',
      description: account.description || '',
      isActive: account.isActive !== false
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleTypeChange = (newType) => {
    let defaultSub = 'operating_expense';
    let defaultNormal = 'debit';

    if (newType === 'asset') {
      defaultSub = 'cash_and_bank';
      defaultNormal = 'debit';
    } else if (newType === 'liability') {
      defaultSub = 'accounts_payable';
      defaultNormal = 'credit';
    } else if (newType === 'equity') {
      defaultSub = 'owner_equity';
      defaultNormal = 'credit';
    } else if (newType === 'revenue') {
      defaultSub = 'sales_revenue';
      defaultNormal = 'credit';
    } else if (newType === 'cogs') {
      defaultSub = 'direct_material_cogs';
      defaultNormal = 'debit';
    }

    setFormData(prev => ({
      ...prev,
      accountType: newType,
      subType: defaultSub,
      normalBalance: defaultNormal
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        ...formData,
        parentAccount: formData.parentAccount ? formData.parentAccount : null
      };

      if (editingAccount) {
        await financeService.updateAccount(editingAccount._id, payload);
      } else {
        await financeService.createAccount(payload);
      }

      setIsModalOpen(false);
      fetchAccounts();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Error saving account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return;
    try {
      await financeService.deleteAccount(id);
      fetchAccounts();
    } catch (err) {
      alert(err?.message || 'Failed to delete account');
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchSearch = (acc.accountCode || '').toLowerCase().includes(search.toLowerCase()) ||
                        (acc.accountName || '').toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || acc.accountType === typeFilter;
    return matchSearch && matchType;
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val || 0);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary-500" />
            Chart of Accounts (COA)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hierarchical ledger accounts structured for manufacturing, inventory costing & statutory reporting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAccounts}
            disabled={loading}
            className="btn btn-outline border-slate-300 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Create Account
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code (e.g. 1010) or account name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Account Types</option>
            <option value="asset">Assets (1000s)</option>
            <option value="liability">Liabilities (2000s)</option>
            <option value="equity">Equity (3000s)</option>
            <option value="revenue">Revenue (4000s)</option>
            <option value="cogs">Cost of Goods Sold (5000s)</option>
            <option value="expense">Operating Expenses (6000s)</option>
          </select>
        </div>
      </div>

      {/* Accounts List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4">Subtype</th>
                <th className="py-3 px-4 text-center">Normal Side</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading Chart of Accounts...
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No matching accounts found.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-primary-600 dark:text-primary-400 text-xs">
                      {acc.accountCode}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-1.5">
                        {acc.isGroupAccount && <FolderTree className="h-4 w-4 text-amber-500 shrink-0" />}
                        <span>{acc.accountName}</span>
                      </div>
                      {acc.description && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{acc.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {acc.accountType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 capitalize">
                      {(acc.subType || '').replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-center text-xs font-semibold uppercase">
                      <span className={acc.normalBalance === 'debit' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}>
                        {acc.normalBalance}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white">
                      {formatCurrency(acc.currentBalance)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        acc.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {acc.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(acc)}
                          className="p-1 hover:text-primary-600 dark:hover:text-primary-400 transition"
                          title="Edit Account"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(acc._id)}
                          className="p-1 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Delete Account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? `Edit Account (${editingAccount.accountCode})` : 'Create Master Ledger Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 1010"
                value={formData.accountCode}
                onChange={(e) => setFormData({ ...formData, accountCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Account Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Commercial Bank of Ethiopia"
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Major Type *
              </label>
              <select
                value={formData.accountType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="asset">Asset (1000s)</option>
                <option value="liability">Liability (2000s)</option>
                <option value="equity">Equity (3000s)</option>
                <option value="revenue">Revenue (4000s)</option>
                <option value="cogs">Cost of Goods Sold (5000s)</option>
                <option value="expense">Operating Expense (6000s)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Sub-Classification *
              </label>
              <select
                value={formData.subType}
                onChange={(e) => setFormData({ ...formData, subType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                {formData.accountType === 'asset' && (
                  <>
                    <option value="cash_and_bank">Cash & Bank</option>
                    <option value="accounts_receivable">Accounts Receivable</option>
                    <option value="inventory_asset">Inventory Asset</option>
                    <option value="prepaid_expense">Prepaid Expense</option>
                    <option value="fixed_asset">Fixed Asset</option>
                  </>
                )}
                {formData.accountType === 'liability' && (
                  <>
                    <option value="accounts_payable">Accounts Payable</option>
                    <option value="accrued_liability">Accrued Liability</option>
                    <option value="tax_payable">Tax Payable (MOR)</option>
                  </>
                )}
                {formData.accountType === 'equity' && (
                  <>
                    <option value="owner_equity">Owner Equity</option>
                    <option value="retained_earnings">Retained Earnings</option>
                  </>
                )}
                {formData.accountType === 'revenue' && (
                  <>
                    <option value="sales_revenue">Sales Revenue</option>
                  </>
                )}
                {formData.accountType === 'cogs' && (
                  <>
                    <option value="direct_material_cogs">Direct Material COGS</option>
                    <option value="direct_labor_cogs">Direct Labor COGS</option>
                    <option value="machine_overhead_cogs">Machine Overhead COGS</option>
                  </>
                )}
                {formData.accountType === 'expense' && (
                  <>
                    <option value="operating_expense">Operating Expense</option>
                    <option value="administrative_expense">Administrative Expense</option>
                    <option value="financial_expense">Financial Expense</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Normal Balance Side *
              </label>
              <select
                value={formData.normalBalance}
                onChange={(e) => setFormData({ ...formData, normalBalance: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="debit">Debit (Dr)</option>
                <option value="credit">Credit (Cr)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Currency
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Description / Notes
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              placeholder="Optional notes or purpose..."
            />
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.isGroupAccount}
                onChange={(e) => setFormData({ ...formData, isGroupAccount: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              Header Group Account (Cannot post direct transactions)
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              Active
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

