// backend/controllers/payrollPaymentBatchController.js
import PayrollPaymentBatch from '../models/PayrollPaymentBatch.js';
import BankAccount from '../models/BankAccount.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/** Create a payroll payment batch */
export const createBatch = async (req, res) => {
  try {
    const batch = await PayrollPaymentBatch.create(req.body);
    res.status(201).json({ success: true, data: batch });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/** Disburse a batch: debit salary expense accounts, credit bank, create journal entry */
export const disburseBatch = async (req, res) => {
  try {
    const batch = await PayrollPaymentBatch.findById(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Not found' });
    if (batch.status === 'disbursed') return res.status(400).json({ success: false, message: 'Already disbursed' });

    const bank = await BankAccount.findById(batch.bankAccount);
    if (!bank) return res.status(400).json({ success: false, message: 'Bank account not found' });

    const fs = batch.financialSummary;
    const bankGl = bank.glAccount;

    // Journal: debit salary expense, pension expense; credit bank, tax payable, pension payable
    const journal = await JournalEntry.create({
      entryNumber: `JE-PAY-${Date.now()}`,
      entryDate: new Date(),
      sourceModule: 'payroll',
      referenceType: 'PayrollBatch',
      referenceId: batch._id,
      narration: `Payroll disbursement ${batch.batchNumber} for ${batch.month}/${batch.year}`,
      lines: [
        { account: bankGl, debit: fs.totalGrossPay + fs.totalEmployerPension, credit: 0, memo: 'Gross salary + employer pension expense' },
        { account: bankGl, debit: 0, credit: fs.totalNetSalaryDisbursement, memo: 'Net salary paid to employees' },
        { account: bankGl, debit: 0, credit: fs.totalEmploymentIncomeTax, memo: 'Employment income tax payable' },
        { account: bankGl, debit: 0, credit: fs.totalEmployeePension + fs.totalEmployerPension, memo: 'Pension payable (7% + 11%)' },
        { account: bankGl, debit: 0, credit: fs.totalAdvanceDeductions + fs.totalOtherDeductions, memo: 'Advance & other deductions' },
      ],
      postedBy: req.user ? req.user._id : batch.preparedBy,
    });

    // Update bank balance
    bank.currentBalance = (bank.currentBalance || 0) - fs.totalNetSalaryDisbursement;
    await bank.save();

    batch.status = 'disbursed';
    batch.disbursementDate = new Date();
    batch.journalEntry = journal._id;
    if (req.body.disbursedBy) batch.disbursedBy = req.body.disbursedBy;
    await batch.save();
    await updateBalancesForEntry(journal);

    res.json({ success: true, data: batch });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listBatches = async (req, res) => {
  const list = await PayrollPaymentBatch.find()
    .populate('bankAccount', 'accountName')
    .sort({ disbursementDate: -1 });
  res.json({ success: true, data: list });
};

export const getBatch = async (req, res) => {
  const b = await PayrollPaymentBatch.findById(req.params.id)
    .populate('bankAccount payrollsIncluded');
  if (!b) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: b });
};

export const updateBatch = async (req, res) => {
  const b = await PayrollPaymentBatch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!b) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: b });
};

export const deleteBatch = async (req, res) => {
  const b = await PayrollPaymentBatch.findByIdAndDelete(req.params.id);
  if (!b) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Batch removed' });
};

