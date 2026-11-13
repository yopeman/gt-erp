import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  ArrowLeftRight, 
  Receipt, 
  Search, 
  Wallet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign,
  FileCheck
} from 'lucide-react';
import financeService from '../../services/financeService';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';

export default function TreasuryBanking() {
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'petty_cash' | 'transfers' | 'reconciliations'
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [pettyCashVouchers, setPettyCashVouchers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);

  // Modals
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isPettyModalOpen, setIsPettyModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReconModalOpen, setIsReconModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Bank Account Form
  const [bankForm, setBankForm] = useState({
    accountName: '',
    accountNumber: '',
    bankName: 'Commercial Bank of Ethiopia',
    branch: '',
    glAccount: '',
    openingBalance: 0,
    isPettyCashVault: false,
    notes: ''
  });

  // Petty Cash Form
  const [pettyForm, setPettyForm] = useState({
    voucherType: 'disbursement',
    bankAccount: '',
    expenseAccount: '',
    amount: '',
    expenseCategory: 'transport_fare',
    paidTo: '',
    custodian: '',
    notes: ''
  });

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    transferFee: 0,
    referenceNumber: '',
    notes: ''
  });

  // Reconciliation Form
  const [reconForm, setReconForm] = useState({
    statementReference: '',
    bankAccount: '',
    statementStartDate: new Date().toISOString().split('T')[0],
    statementEndDate: new Date().toISOString().split('T')[0],
    statementEndingBalance: '',
    glEndingBalance: '',
    notes: ''
  });

  const fetchAllTreasuryData = async () => {
    setLoading(true);
    try {
      const [banksRes, pettyRes, trfRes, reconRes, glRes] = await Promise.allSettled([
        financeService.getBankAccounts(),
        financeService.getPettyCashVouchers(),
        financeService.getBankTransfers(),
        financeService.getBankReconciliations(),
        financeService.getAccounts()
      ]);

      setBankAccounts(banksRes.status === 'fulfilled' && banksRes.value?.data ? banksRes.value.data : []);
      setPettyCashVouchers(pettyRes.status === 'fulfilled' && pettyRes.value?.data ? pettyRes.value.data : []);
      setTransfers(trfRes.status === 'fulfilled' && trfRes.value?.data ? trfRes.value.data : []);
      setReconciliations(reconRes.status === 'fulfilled' && reconRes.value?.data ? reconRes.value.data : []);
      setGlAccounts(glRes.status === 'fulfilled' && glRes.value?.data ? glRes.value.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTreasuryData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val || 0);
  };

  // Handlers
  const handleCreateBankAccount = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await financeService.createBankAccount(bankForm);
      setIsBankModalOpen(false);
      fetchAllTreasuryData();
    } catch (err) {
      setError(err?.message || 'Failed to create bank account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePettyVoucher = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...pettyForm,
        voucherNumber: `PCV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        amount: Number(pettyForm.amount),
        custodian: pettyForm.custodian || glAccounts[0]?._id // fallback for demo/staff selection
      };
      await financeService.createPettyCashVoucher(payload);
      setIsPettyModalOpen(false);
      fetchAllTreasuryData();
    } catch (err) {
      setError(err?.message || 'Failed to submit petty cash voucher');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...transferForm,
        transferNumber: `TRF-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
        amount: Number(transferForm.amount),
        transferFee: Number(transferForm.transferFee) || 0
      };
      await financeService.createBankTransfer(payload);
      setIsTransferModalOpen(false);
      fetchAllTreasuryData();
    } catch (err) {
      setError(err?.message || 'Failed to execute transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReconciliation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...reconForm,
        statementEndingBalance: Number(reconForm.statementEndingBalance),
        glEndingBalance: Number(reconForm.glEndingBalance),
        unreconciledDifference: Number(reconForm.statementEndingBalance) - Number(reconForm.glEndingBalance)
      };
      await financeService.createBankReconciliation(payload);
      setIsReconModalOpen(false);
      fetchAllTreasuryData();
    } catch (err) {
      setError(err?.message || 'Failed to record bank reconciliation');
    } finally {
      setSubmitting(false);
    }
  };

  const totalVaultBalance = bankAccounts.reduce((sum, b) => sum + (Number(b.currentBalance) || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary-500" />
            Treasury, Cash & Bank Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Corporate accounts (CBE, Awash, Telebirr), factory petty cash imprest, transfers & reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAllTreasuryData}
            disabled={loading}
            className="btn btn-outline border-slate-300 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeTab === 'accounts' && (
            <button
              onClick={() => { setError(''); setIsBankModalOpen(true); }}
              className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Add Bank / Vault
            </button>
          )}
          {activeTab === 'petty_cash' && (
            <button
              onClick={() => { setError(''); setIsPettyModalOpen(true); }}
              className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Petty Cash Voucher
            </button>
          )}
          {activeTab === 'transfers' && (
            <button
              onClick={() => { setError(''); setIsTransferModalOpen(true); }}
              className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              New Fund Transfer
            </button>
          )}
          {activeTab === 'reconciliations' && (
            <button
              onClick={() => { setError(''); setIsReconModalOpen(true); }}
              className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Reconcile Statement
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'accounts'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="h-4 w-4" />
          Bank Accounts & Wallets ({bankAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('petty_cash')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'petty_cash'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Petty Cash Imprest ({pettyCashVouchers.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'transfers'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <ArrowLeftRight className="h-4 w-4" />
          Fund Transfers ({transfers.length})
        </button>
        <button
          onClick={() => setActiveTab('reconciliations')}
          className={`pb-3 flex items-center gap-2 ${
            activeTab === 'reconciliations'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          Bank Reconciliations ({reconciliations.length})
        </button>
      </div>

      {/* Tab 1: Bank Accounts */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Combined Available Cash"
              value={formatCurrency(totalVaultBalance)}
              subtitle="All Banks & Vaults"
              icon={Wallet}
              color="emerald"
            />
            <StatCard
              title="Operating Banks"
              value={bankAccounts.filter(b => !b.isPettyCashVault).length}
              subtitle="CBE, Awash, Telebirr, etc."
              icon={Building2}
              color="blue"
            />
            <StatCard
              title="Petty Cash Vaults"
              value={bankAccounts.filter(b => b.isPettyCashVault).length}
              subtitle="Factory Floor Daily Consumables"
              icon={Receipt}
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((acc) => (
              <div key={acc._id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                      {acc.accountName}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {acc.bankName} {acc.branch ? `• ${acc.branch}` : ''}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    acc.isPettyCashVault ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {acc.isPettyCashVault ? 'PETTY CASH' : 'BANK'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400">Current Balance</div>
                  <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {formatCurrency(acc.currentBalance)}
                  </div>
                </div>

                {acc.accountNumber && (
                  <div className="text-xs font-mono text-slate-500">
                    Acct #: {acc.accountNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Petty Cash Vouchers */}
      {activeTab === 'petty_cash' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Voucher #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Paid To</th>
                  <th className="py-3 px-4 text-right">Amount (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {pettyCashVouchers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-400">
                      No petty cash vouchers recorded yet.
                    </td>
                  </tr>
                ) : (
                  pettyCashVouchers.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{v.voucherNumber}</td>
                      <td className="py-3 px-4 text-xs">{v.paymentDate ? new Date(v.paymentDate).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 text-xs capitalize font-medium">{v.voucherType}</td>
                      <td className="py-3 px-4 text-xs capitalize text-slate-500">{(v.expenseCategory || '').replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 text-xs">{v.paidTo}</td>
                      <td className="py-3 px-4 text-right font-semibold text-xs">{formatCurrency(v.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {v.status || 'paid'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Fund Transfers */}
      {activeTab === 'transfers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Transfer #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">From Account</th>
                  <th className="py-3 px-4">To Account</th>
                  <th className="py-3 px-4 text-right">Amount (ETB)</th>
                  <th className="py-3 px-4 text-right">Transfer Fee</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-400">
                      No internal bank transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{t.transferNumber}</td>
                      <td className="py-3 px-4 text-xs">{t.transferDate ? new Date(t.transferDate).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 text-xs font-medium">{t.fromAccount?.accountName || 'Source'}</td>
                      <td className="py-3 px-4 text-xs font-medium">{t.toAccount?.accountName || 'Destination'}</td>
                      <td className="py-3 px-4 text-right font-semibold text-xs">{formatCurrency(t.amount)}</td>
                      <td className="py-3 px-4 text-right text-xs text-slate-400">{formatCurrency(t.transferFee)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {t.status || 'completed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Bank Reconciliations */}
      {activeTab === 'reconciliations' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Statement Reference</th>
                  <th className="py-3 px-4">Bank Account</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4 text-right">Statement Balance</th>
                  <th className="py-3 px-4 text-right">GL Balance</th>
                  <th className="py-3 px-4 text-right">Difference</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {reconciliations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-slate-400">
                      No bank reconciliations performed yet.
                    </td>
                  </tr>
                ) : (
                  reconciliations.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{r.statementReference}</td>
                      <td className="py-3 px-4 text-xs font-medium">{r.bankAccount?.accountName || 'Bank'}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {new Date(r.statementStartDate).toLocaleDateString()} - {new Date(r.statementEndDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-xs">{formatCurrency(r.statementEndingBalance)}</td>
                      <td className="py-3 px-4 text-right font-medium text-xs">{formatCurrency(r.glEndingBalance)}</td>
                      <td className={`py-3 px-4 text-right font-semibold text-xs ${
                        r.unreconciledDifference === 0 ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        {formatCurrency(r.unreconciledDifference)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 capitalize">
                          {(r.status || 'in_progress').replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Bank Account */}
      <Modal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        title="Add Bank Account / Digital Wallet"
      >
        <form onSubmit={handleCreateBankAccount} className="space-y-4">
          {error && <div className="text-rose-500 text-xs">{error}</div>}

          <div>
            <label className="block text-xs font-semibold mb-1">Account Display Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. CBE Main Operations"
              value={bankForm.accountName}
              onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Bank / Institution *</label>
              <select
                value={bankForm.bankName}
                onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="Commercial Bank of Ethiopia">Commercial Bank of Ethiopia (CBE)</option>
                <option value="Awash Bank">Awash Bank</option>
                <option value="Dashen Bank">Dashen Bank</option>
                <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                <option value="Nib International Bank">Nib International Bank</option>
                <option value="Cooperative Bank of Oromia">Cooperative Bank of Oromia</option>
                <option value="Telebirr">Telebirr Merchant</option>
                <option value="CBE Birr">CBE Birr</option>
                <option value="Cash in Vault">Cash in Vault</option>
                <option value="Petty Cash Vault">Petty Cash Vault</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Account Number</label>
              <input
                type="text"
                placeholder="e.g. 1000123456789"
                value={bankForm.accountNumber}
                onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">GL Asset Account Link *</label>
              <select
                required
                value={bankForm.glAccount}
                onChange={(e) => setBankForm({ ...bankForm, glAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select COA Account...</option>
                {glAccounts.filter(a => a.accountType === 'asset').map(a => (
                  <option key={a._id} value={a._id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Opening Balance (ETB)</label>
              <input
                type="number"
                step="0.01"
                value={bankForm.openingBalance}
                onChange={(e) => setBankForm({ ...bankForm, openingBalance: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isPetty"
              checked={bankForm.isPettyCashVault}
              onChange={(e) => setBankForm({ ...bankForm, isPettyCashVault: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isPetty" className="text-xs font-medium cursor-pointer">
              Mark as Factory Petty Cash Imprest Vault
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsBankModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Save Bank Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Petty Cash Voucher */}
      <Modal
        isOpen={isPettyModalOpen}
        onClose={() => setIsPettyModalOpen(false)}
        title="Record Petty Cash Voucher"
      >
        <form onSubmit={handleCreatePettyVoucher} className="space-y-4">
          {error && <div className="text-rose-500 text-xs">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Voucher Type *</label>
              <select
                value={pettyForm.voucherType}
                onChange={(e) => setPettyForm({ ...pettyForm, voucherType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="disbursement">Disbursement (Expense out)</option>
                <option value="replenishment">Replenishment (Fund in)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Petty Cash Vault *</label>
              <select
                required
                value={pettyForm.bankAccount}
                onChange={(e) => setPettyForm({ ...pettyForm, bankAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select Vault...</option>
                {bankAccounts.map(b => (
                  <option key={b._id} value={b._id}>{b.accountName} (Balance: {formatCurrency(b.currentBalance)})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">GL Expense Account *</label>
              <select
                required
                value={pettyForm.expenseAccount}
                onChange={(e) => setPettyForm({ ...pettyForm, expenseAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select Expense GL...</option>
                {glAccounts.filter(a => a.accountType === 'expense' || a.accountType === 'cogs').map(a => (
                  <option key={a._id} value={a._id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Category *</label>
              <select
                value={pettyForm.expenseCategory}
                onChange={(e) => setPettyForm({ ...pettyForm, expenseCategory: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="transport_fare">Transport Fare / Taxi</option>
                <option value="stationery">Stationery & Office Supplies</option>
                <option value="factory_refreshment">Factory Refreshment / Water</option>
                <option value="minor_repairs">Minor Machine Repairs</option>
                <option value="loading_unloading">Loading & Unloading Labor</option>
                <option value="emergency_supplies">Emergency Supplies</option>
                <option value="other">Other Consumables</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Amount (ETB) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={pettyForm.amount}
                onChange={(e) => setPettyForm({ ...pettyForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Paid To (Recipient) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Abebe Bikila"
                value={pettyForm.paidTo}
                onChange={(e) => setPettyForm({ ...pettyForm, paidTo: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsPettyModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Submit Voucher
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Fund Transfer */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Internal Bank & Vault Fund Transfer"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          {error && <div className="text-rose-500 text-xs">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Source Account (From) *</label>
              <select
                required
                value={transferForm.fromAccount}
                onChange={(e) => setTransferForm({ ...transferForm, fromAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select Source...</option>
                {bankAccounts.map(b => (
                  <option key={b._id} value={b._id}>{b.accountName} ({formatCurrency(b.currentBalance)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Destination Account (To) *</label>
              <select
                required
                value={transferForm.toAccount}
                onChange={(e) => setTransferForm({ ...transferForm, toAccount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              >
                <option value="">Select Destination...</option>
                {bankAccounts.filter(b => b._id !== transferForm.fromAccount).map(b => (
                  <option key={b._id} value={b._id}>{b.accountName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Transfer Amount (ETB) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Bank Transfer Fee (ETB)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={transferForm.transferFee}
                onChange={(e) => setTransferForm({ ...transferForm, transferFee: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Bank Reference #</label>
            <input
              type="text"
              placeholder="e.g. FT26101928374"
              value={transferForm.referenceNumber}
              onChange={(e) => setTransferForm({ ...transferForm, referenceNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Execute Transfer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Reconciliation */}
      <Modal
        isOpen={isReconModalOpen}
        onClose={() => setIsReconModalOpen(false)}
        title="Record Bank Statement Reconciliation"
      >
        <form onSubmit={handleCreateReconciliation} className="space-y-4">
          {error && <div className="text-rose-500 text-xs">{error}</div>}

          <div>
            <label className="block text-xs font-semibold mb-1">Statement Reference / ID *</label>
            <input
              type="text"
              required
              placeholder="e.g. RECON-CBE-2026-10"
              value={reconForm.statementReference}
              onChange={(e) => setReconForm({ ...reconForm, statementReference: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Bank Account *</label>
            <select
              required
              value={reconForm.bankAccount}
              onChange={(e) => setReconForm({ ...reconForm, bankAccount: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
            >
              <option value="">Select Account...</option>
              {bankAccounts.map(b => (
                <option key={b._id} value={b._id}>{b.accountName} ({b.bankName})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Bank Statement Ending Balance (ETB) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={reconForm.statementEndingBalance}
                onChange={(e) => setReconForm({ ...reconForm, statementEndingBalance: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">ERP GL Ending Balance (ETB) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={reconForm.glEndingBalance}
                onChange={(e) => setReconForm({ ...reconForm, glEndingBalance: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsReconModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Save Reconciliation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

