import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Landmark, 
  BookOpen, 
  ArrowLeftRight, 
  Receipt, 
  FileCheck2, 
  TrendingUp, 
  Building2, 
  DollarSign, 
  Plus, 
  RefreshCw, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import financeService from '../../services/financeService';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalBankBalance: 0,
    bankAccountsCount: 0,
    totalReceivables: 0,
    totalPayables: 0,
    journalCount: 0,
    pendingExpenses: 0,
    activeAdvances: 0
  });
  const [bankAccounts, setBankAccounts] = useState([]);
  const [recentJournals, setRecentJournals] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [banksRes, journalsRes, billsRes, expensesRes, advancesRes] = await Promise.allSettled([
        financeService.getBankAccounts(),
        financeService.getJournalEntries(),
        financeService.getSupplierBills(),
        financeService.getExpenseVouchers(),
        financeService.getEmployeeAdvances()
      ]);

      const banks = banksRes.status === 'fulfilled' && banksRes.value?.data ? banksRes.value.data : [];
      const journals = journalsRes.status === 'fulfilled' && journalsRes.value?.data ? journalsRes.value.data : [];
      const bills = billsRes.status === 'fulfilled' && billsRes.value?.data ? billsRes.value.data : [];
      const expenses = expensesRes.status === 'fulfilled' && expensesRes.value?.data ? expensesRes.value.data : [];
      const advances = advancesRes.status === 'fulfilled' && advancesRes.value?.data ? advancesRes.value.data : [];

      const totalBank = banks.reduce((sum, b) => sum + (Number(b.currentBalance) || 0), 0);
      const totalAP = bills.reduce((sum, b) => sum + (Number(b.financials?.remainingBalance) || 0), 0);
      const pendingExp = expenses.filter(e => e.status === 'draft' || e.status === 'submitted').length;
      const actAdv = advances.filter(a => a.status === 'disbursed' || a.status === 'repaying').length;

      setMetrics({
        totalBankBalance: totalBank,
        bankAccountsCount: banks.length,
        totalPayables: totalAP,
        journalCount: journals.length,
        pendingExpenses: pendingExp,
        activeAdvances: actAdv
      });

      setBankAccounts(banks.slice(0, 5));
      setRecentJournals(journals.slice(0, 5));
      setRecentExpenses(expenses.slice(0, 5));
    } catch (err) {
      console.error('Failed to load finance dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val || 0);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="h-7 w-7 text-primary-500" />
            Financial Management & General Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time double-entry ledger, treasury vaults, Ethiopian tax MOR compliance & AP/AR costing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="btn btn-outline border-slate-300 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/finance/journal-entries"
            className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Journal Entry
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Treasury & Bank Liquidity"
          value={formatCurrency(metrics.totalBankBalance)}
          subtitle={`${metrics.bankAccountsCount} Active Bank & Petty Cash Accounts`}
          icon={Landmark}
          color="emerald"
        />
        <StatCard
          title="Accounts Payable (AP)"
          value={formatCurrency(metrics.totalPayables)}
          subtitle="Outstanding Supplier Invoices"
          icon={ArrowDownRight}
          color="rose"
        />
        <StatCard
          title="General Ledger Postings"
          value={metrics.journalCount}
          subtitle="Double-entry balanced records"
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Pending Expense Vouchers"
          value={metrics.pendingExpenses}
          subtitle={`${metrics.activeAdvances} Active Employee Advances`}
          icon={Receipt}
          color="amber"
        />
      </div>

      {/* Main Grid: Treasury & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Treasury Accounts */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-500" />
              Treasury, Banks & Mobile Wallets
            </h2>
            <Link to="/finance/treasury" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Manage All Accounts →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {bankAccounts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                No bank or cash accounts configured yet.
              </div>
            ) : (
              bankAccounts.map((acc) => (
                <div key={acc._id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      {acc.accountName}
                      {acc.isPettyCashVault && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-bold px-1.5 py-0.5 rounded">
                          PETTY CASH
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {acc.bankName} {acc.accountNumber ? `• ${acc.accountNumber}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      {formatCurrency(acc.currentBalance)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Currency: {acc.currency || 'ETB'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Module Navigation Links */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <PieChart className="h-5 w-5 text-primary-500" />
            Financial Operations
          </h2>

          <div className="grid grid-cols-1 gap-2.5">
            <Link
              to="/finance/accounts"
              className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Chart of Accounts (COA)</div>
                <div className="text-[11px] text-slate-400">Hierarchical asset, liability & equity accounts</div>
              </div>
            </Link>

            <Link
              to="/finance/journal-entries"
              className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <FileCheck2 className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">General Ledger & Journals</div>
                <div className="text-[11px] text-slate-400">Double-entry balanced postings & audit trail</div>
              </div>
            </Link>

            <Link
              to="/finance/supplier-bills"
              className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                <ArrowDownRight className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Accounts Payable (Bills & Pay)</div>
                <div className="text-[11px] text-slate-400">Match PO/GRV, 2% WHT, 15% VAT & payouts</div>
              </div>
            </Link>

            <Link
              to="/finance/payroll-batches"
              className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Payroll Mass Payouts</div>
                <div className="text-[11px] text-slate-400">7% & 11% pension, income tax & bulk disbursals</div>
              </div>
            </Link>

            <Link
              to="/finance/tax"
              className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
            >
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Ethiopian Tax (MOR Filings)</div>
                <div className="text-[11px] text-slate-400">15% VAT Netting, 2% WHT & Monthly E-Filing</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Ledger Postings */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary-500" />
            Recent Posted Journal Entries
          </h2>
          <Link to="/finance/journal-entries" className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
            View All Ledger Entries →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
              <tr>
                <th className="py-2.5 px-3">Entry #</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Narration</th>
                <th className="py-2.5 px-3 text-right">Debit (ETB)</th>
                <th className="py-2.5 px-3 text-right">Credit (ETB)</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {recentJournals.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-slate-400">
                    No journal entries posted yet.
                  </td>
                </tr>
              ) : (
                recentJournals.map((j) => (
                  <tr key={j._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono font-medium text-primary-600 dark:text-primary-400 text-xs">
                      {j.entryNumber}
                    </td>
                    <td className="py-3 px-3 text-xs">
                      {j.entryDate ? new Date(j.entryDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-3 text-xs uppercase font-semibold text-slate-500">
                      {j.sourceModule}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate text-xs" title={j.narration}>
                      {j.narration}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-xs">
                      {formatCurrency(j.totalDebit)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-xs">
                      {formatCurrency(j.totalCredit)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {j.status || 'posted'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

