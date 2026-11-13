import React, { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Eye, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import financeService from '../../services/financeService';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';

export default function JournalEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State for new Journal Entry
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    sourceModule: 'manual_adjustment',
    referenceType: 'ManualVoucher',
    narration: '',
    status: 'posted',
    lines: [
      { account: '', debit: 0, credit: 0, memo: '' },
      { account: '', debit: 0, credit: 0, memo: '' }
    ]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [entriesRes, accountsRes] = await Promise.allSettled([
        financeService.getJournalEntries(),
        financeService.getAccounts()
      ]);
      setEntries(entriesRes.status === 'fulfilled' && entriesRes.value?.data ? entriesRes.value.data : []);
      setAccounts(accountsRes.status === 'fulfilled' && accountsRes.value?.data ? accountsRes.value.data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { account: '', debit: 0, credit: 0, memo: '' }]
    }));
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length <= 2) return;
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index)
    }));
  };

  const handleLineChange = (index, field, value) => {
    const updated = [...formData.lines];
    updated[index][field] = field === 'debit' || field === 'credit' ? Number(value) || 0 : value;
    setFormData(prev => ({ ...prev, lines: updated }));
  };

  const totalDebit = formData.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = formData.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isBalanced) {
      setError('Total debits must strictly equal total credits and be greater than 0.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        entryNumber: `JE-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        entryDate: formData.entryDate,
        sourceModule: formData.sourceModule,
        referenceType: formData.referenceType,
        narration: formData.narration,
        status: formData.status,
        lines: formData.lines.filter(l => l.account && (l.debit > 0 || l.credit > 0)),
        totalDebit,
        totalCredit,
        ...(user?._id || user?.id ? { postedBy: user._id || user.id } : {})
      };

      await financeService.createJournalEntry(payload);
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to post journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val || 0);
  };

  const filteredEntries = entries.filter(ent => {
    const matchSearch = (ent.entryNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                        (ent.narration || '').toLowerCase().includes(search.toLowerCase());
    const matchModule = !moduleFilter || ent.sourceModule === moduleFilter;
    return matchSearch && matchModule;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="h-7 w-7 text-primary-500" />
            General Ledger & Journal Entries
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable double-entry transaction journals across Sales, Procurement, Payroll & Treasury.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="btn btn-outline border-slate-300 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setError('');
              setIsCreateModalOpen(true);
            }}
            className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Post Journal Entry
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by entry # or narration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Source Modules</option>
            <option value="sales">Sales & AR</option>
            <option value="purchasing">Purchasing & AP</option>
            <option value="payroll">Payroll & HR</option>
            <option value="treasury">Treasury & Bank</option>
            <option value="inventory">Inventory & Store</option>
            <option value="expense">Operating Expense</option>
            <option value="production">Production Costing</option>
            <option value="tax">Tax Settlement</option>
            <option value="manual_adjustment">Manual Adjustment</option>
          </select>
        </div>
      </div>

      {/* Journal Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Entry Number</th>
                <th className="py-3 px-4">Posting Date</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Reference Type</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-4 text-right">Debit (ETB)</th>
                <th className="py-3 px-4 text-right">Credit (ETB)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary-500" />
                    Loading General Ledger...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    No journal entries found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((ent) => (
                  <tr key={ent._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-primary-600 dark:text-primary-400 text-xs">
                      {ent.entryNumber}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {ent.entryDate ? new Date(ent.entryDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-xs uppercase font-semibold text-slate-500">
                      {ent.sourceModule}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {ent.referenceType || 'Manual'}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-xs" title={ent.narration}>
                      {ent.narration}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-xs">
                      {formatCurrency(ent.totalDebit)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-xs">
                      {formatCurrency(ent.totalCredit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {ent.status || 'posted'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedEntry(ent)}
                        className="p-1 hover:text-primary-600 dark:hover:text-primary-400 transition"
                        title="View Lines"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Entry Details Modal */}
      {selectedEntry && (
        <Modal
          isOpen={!!selectedEntry}
          onClose={() => setSelectedEntry(null)}
          title={`Journal Details: ${selectedEntry.entryNumber}`}
        >
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Date:</span>{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {new Date(selectedEntry.entryDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Source:</span>{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200 uppercase">
                  {selectedEntry.sourceModule}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400">Narration:</span>{' '}
                <span className="font-medium text-slate-800 dark:text-white">
                  {selectedEntry.narration}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-2 px-3">Account</th>
                    <th className="py-2 px-3">Line Memo</th>
                    <th className="py-2 px-3 text-right">Debit (ETB)</th>
                    <th className="py-2 px-3 text-right">Credit (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(selectedEntry.lines || []).map((line, idx) => {
                    const acct = accounts.find(a => a._id === line.account || a._id === line.account?._id);
                    return (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-medium">
                          {acct ? `${acct.accountCode} - ${acct.accountName}` : (line.account?.accountName || 'Account')}
                        </td>
                        <td className="py-2 px-3 text-slate-500">{line.memo || '-'}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          {line.debit > 0 ? formatCurrency(line.debit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-medium">
                          {line.credit > 0 ? formatCurrency(line.credit) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t border-slate-200 dark:border-slate-700">
                  <tr>
                    <td colSpan="2" className="py-2 px-3 text-right">Total:</td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedEntry.totalDebit)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedEntry.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* Post New Journal Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Post Double-Entry Journal Voucher"
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
                Posting Date *
              </label>
              <input
                type="date"
                required
                value={formData.entryDate}
                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Source Module *
              </label>
              <select
                value={formData.sourceModule}
                onChange={(e) => setFormData({ ...formData, sourceModule: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="manual_adjustment">Manual Adjustment</option>
                <option value="treasury">Treasury / Cash</option>
                <option value="purchasing">Purchasing / AP</option>
                <option value="sales">Sales / AR</option>
                <option value="payroll">Payroll</option>
                <option value="production">Production Costing</option>
                <option value="expense">Operating Expense</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Narration / Description *
            </label>
            <textarea
              required
              rows="2"
              placeholder="e.g. Factory machinery insurance allocation for October"
              value={formData.narration}
              onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Journal Lines */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Ledger Split Lines (Debit must equal Credit)
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Line
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {formData.lines.map((line, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <select
                    required
                    value={line.account}
                    onChange={(e) => handleLineChange(index, 'account', e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                  >
                    <option value="">Select Account...</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>
                        {a.accountCode} - {a.accountName} ({a.accountType})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Debit"
                    value={line.debit || ''}
                    onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                    className="w-24 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-right font-medium"
                  />

                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Credit"
                    value={line.credit || ''}
                    onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                    className="w-24 px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs text-right font-medium"
                  />

                  {formData.lines.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(index)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Balancing Indicator */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
              <div className="flex items-center gap-4">
                <span>Total Debit: <span className="text-blue-600 dark:text-blue-400 font-bold">{formatCurrency(totalDebit)}</span></span>
                <span>Total Credit: <span className="text-purple-600 dark:text-purple-400 font-bold">{formatCurrency(totalCredit)}</span></span>
              </div>
              <div className={isBalanced ? 'text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1' : 'text-rose-500 font-bold flex items-center gap-1'}>
                {isBalanced ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Balanced
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Unbalanced Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isBalanced}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post to Ledger'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

