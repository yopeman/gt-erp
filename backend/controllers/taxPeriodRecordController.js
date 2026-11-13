// backend/controllers/taxPeriodRecordController.js
import TaxPeriodRecord from '../models/TaxPeriodRecord.js';
import SupplierBill from '../models/SupplierBill.js';
import Invoice from '../models/Invoice.js';
import PayrollPaymentBatch from '../models/PayrollPaymentBatch.js';

/** Create a new tax period record (accumulating) */
export const createRecord = async (req, res) => {
  try {
    const record = await TaxPeriodRecord.create(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/**
 * Compute tax figures for a period by aggregating data from
 * invoices (output VAT), supplier bills (input VAT, WHT), and payroll batches.
 */
export const computeTaxes = async (req, res) => {
  try {
    const record = await TaxPeriodRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Not found' });

    const { month, year } = record.taxPeriod;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // --- VAT calculations ---
    if (record.filingType === 'vat_monthly_return') {
      // Output VAT from customer invoices
      const invoices = await Invoice.find({
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'draft'] },
      });
      let totalTaxableSales = 0;
      let outputVatCollected = 0;
      invoices.forEach((inv) => {
        totalTaxableSales += inv.financials?.subtotal || inv.subtotal || 0;
        outputVatCollected += inv.financials?.vatAmount || inv.vatAmount || 0;
      });

      // Input VAT from supplier bills
      const bills = await SupplierBill.find({
        billDate: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'draft'] },
      });
      let totalTaxablePurchases = 0;
      let inputVatPaid = 0;
      bills.forEach((b) => {
        totalTaxablePurchases += b.financials?.subtotal || 0;
        inputVatPaid += b.financials?.vatAmount || 0;
      });

      const netVatPayable = outputVatCollected - inputVatPaid;
      const carriedForwardCreditUsed = 0; // TODO: pull from previous period
      const finalPayableToMor = Math.max(0, netVatPayable - carriedForwardCreditUsed);

      record.vatCalculations = {
        totalTaxableSales,
        outputVatCollected,
        totalTaxablePurchases,
        inputVatPaid,
        netVatPayable,
        carriedForwardCreditUsed,
        finalPayableToMor,
      };
    }

    // --- Withholding Tax ---
    if (record.filingType === 'withholding_tax_return') {
      const bills = await SupplierBill.find({
        billDate: { $gte: startDate, $lte: endDate },
        status: { $nin: ['cancelled', 'draft'] },
      });
      let whtDeductedFromSuppliers = 0;
      bills.forEach((b) => {
        whtDeductedFromSuppliers += b.financials?.withholdingTaxAmount || 0;
      });

      record.withholdingCalculations = {
        whtDeductedFromSuppliers,
        whtDeductedByCustomers: 0, // TODO: pull from customer payments
        totalWhtPayable: whtDeductedFromSuppliers,
      };
    }

    // --- Payroll Tax & Pension ---
    if (record.filingType === 'payroll_tax_pension_return') {
      const batches = await PayrollPaymentBatch.find({
        month,
        year,
        status: { $in: ['disbursed', 'reconciled'] },
      });
      let totalEmploymentIncomeTax = 0;
      let totalEmployeePension7 = 0;
      let totalEmployerPension11 = 0;
      batches.forEach((b) => {
        const fs = b.financialSummary;
        totalEmploymentIncomeTax += fs.totalEmploymentIncomeTax || 0;
        totalEmployeePension7 += fs.totalEmployeePension || 0;
        totalEmployerPension11 += fs.totalEmployerPension || 0;
      });

      record.payrollTaxCalculations = {
        totalEmploymentIncomeTax,
        totalEmployeePension7,
        totalEmployerPension11,
        totalPensionPayable18: totalEmployeePension7 + totalEmployerPension11,
      };
    }

    record.status = 'computed';
    await record.save();
    res.json({ success: true, data: record });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listRecords = async (req, res) => {
  const filter = {};
  if (req.query.filingType) filter.filingType = req.query.filingType;
  if (req.query.status) filter.status = req.query.status;

  const list = await TaxPeriodRecord.find(filter).sort({ 'taxPeriod.year': -1, 'taxPeriod.month': -1 });
  res.json({ success: true, data: list });
};

export const getRecord = async (req, res) => {
  const r = await TaxPeriodRecord.findById(req.params.id);
  if (!r) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: r });
};

export const updateRecord = async (req, res) => {
  const r = await TaxPeriodRecord.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!r) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: r });
};

export const deleteRecord = async (req, res) => {
  const r = await TaxPeriodRecord.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Tax period record removed' });
};

