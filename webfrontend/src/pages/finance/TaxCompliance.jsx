import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  Calculator, 
  Calendar, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  DollarSign
} from 'lucide-react';
import financeService from '../../services/financeService';
import Modal from '../../components/common/Modal';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';

export default function TaxCompliance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    filingType: 'vat_monthly_return',
    notes: ''
  });

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await financeService.getTaxRecords();
      setRecords(res?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const typeCode = formData.filingType === 'vat_monthly_return' ? 'VAT' :
                       formData.filingType === 'withholding_tax_return' ? 'WHT' : 'PAY';
      const payload = {
        filingCode: `TAX-${formData.year}-${String(formData.month).padStart(2, '0')}-${typeCode}`,
        taxPeriod: {
          month: Number(formData.month),
          year: Number(formData.year)
        },
        filingType: formData.filingType,
        status: 'accumulating',
        notes: formData.notes
      };

      const res = await financeService.createTaxRecord(payload);
      // Auto-compute figures right after creation
      if (res?.data?._id) {
        await financeService.computeTaxRecord(res.data._id);
      }

      setIsCreateModalOpen(false);
      fetchRecords();
    } catch (err) {
      setError(err?.message || 'Failed to initialize tax period record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompute = async (id) => {
    try {
      await financeService.computeTaxRecord(id);
      fetchRecords();
    } catch (err) {
      alert(err?.message || 'Re-computation failed');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(val || 0);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary-500" />
            Ethiopian Ministry of Revenues (MOR) Tax Compliance
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated monthly 15% VAT Netting (Output vs Input), 2% Withholding Tax & Payroll Income Tax / Pension returns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="btn btn-outline border-slate-300 dark:border-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => { setError(''); setIsCreateModalOpen(true); }}
            className="btn btn-primary bg-primary-600 hover:bg-primary-700 text-white flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Tax Filing Period
          </button>
        </div>
      </div>

      {/* Tax Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Filing Code</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Filing Type</th>
                <th className="py-3 px-4 text-right">Taxable Base / Gross</th>
                <th className="py-3 px-4 text-right">Net Tax Payable (MOR)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {records.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No statutory tax filings initialized yet.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  let payable = 0;
                  let base = 0;
                  if (r.filingType === 'vat_monthly_return') {
                    payable = r.vatCalculations?.finalPayableToMor || 0;
                    base = r.vatCalculations?.totalTaxableSales || 0;
                  } else if (r.filingType === 'withholding_tax_return') {
                    payable = r.withholdingCalculations?.totalWhtPayable || 0;
                  } else {
                    payable = (r.payrollTaxCalculations?.totalEmploymentIncomeTax || 0) + (r.payrollTaxCalculations?.totalPensionPayable18 || 0);
                  }

                  return (
                    <tr key={r._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-primary-600 text-xs">{r.filingCode}</td>
                      <td className="py-3 px-4 text-xs font-semibold">{r.taxPeriod?.month}/{r.taxPeriod?.year}</td>
                      <td className="py-3 px-4 text-xs font-medium capitalize">{(r.filingType || '').replace(/_/g, ' ')}</td>
                      <td className="py-3 px-4 text-right font-medium text-xs">{base > 0 ? formatCurrency(base) : '-'}</td>
                      <td className="py-3 px-4 text-right font-bold text-xs text-rose-600 dark:text-rose-400">
                        {formatCurrency(payable)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          r.status === 'settled' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          r.status === 'computed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {(r.status || 'accumulating').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCompute(r._id)}
                            className="p-1 hover:text-primary-600 transition"
                            title="Recalculate from Invoices & Bills"
                          >
                            <Calculator className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Tax Filing Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Initialize Ethiopian Ministry of Revenues (MOR) Filing"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="text-rose-500 text-xs">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Fiscal Month (1 - 12) *</label>
              <input
                type="number"
                min="1"
                max="12"
                required
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Fiscal Year *</label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Filing Declaration Type *</label>
            <select
              value={formData.filingType}
              onChange={(e) => setFormData({ ...formData, filingType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
            >
              <option value="vat_monthly_return">Monthly VAT Return (15% Output vs Input Netting)</option>
              <option value="withholding_tax_return">Monthly Withholding Tax Return (2% WHT on Suppliers)</option>
              <option value="payroll_tax_pension_return">Monthly Employment Income Tax & Pension (7% + 11%)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Notes</label>
            <textarea
              rows="2"
              placeholder="e.g. October declaration prepared for MOR e-filing portal"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              Create & Calculate Figures
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

