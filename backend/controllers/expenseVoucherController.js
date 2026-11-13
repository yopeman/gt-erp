// backend/controllers/expenseVoucherController.js
import ExpenseVoucher from '../models/ExpenseVoucher.js';
import BankAccount from '../models/BankAccount.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/** Create an expense voucher (draft) */
export const createVoucher = async (req, res) => {
  try {
    const voucher = await ExpenseVoucher.create(req.body);
    res.status(201).json({ success: true, data: voucher });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/** Approve and pay an expense voucher – creates journal entry, updates bank balance */
export const approveAndPay = async (req, res) => {
  try {
    const voucher = await ExpenseVoucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ success: false, message: 'Not found' });
    if (voucher.status === 'paid') return res.status(400).json({ success: false, message: 'Already paid' });

    const bank = await BankAccount.findById(voucher.bankAccount);
    if (!bank) return res.status(400).json({ success: false, message: 'Bank account not found' });

    // Journal: debit expense account, credit bank GL
    const journal = await JournalEntry.create({
      entryNumber: `JE-EXP-${Date.now()}`,
      entryDate: voucher.expenseDate,
      sourceModule: 'expense',
      referenceType: 'ExpenseVoucher',
      referenceId: voucher._id,
      narration: `Expense voucher ${voucher.voucherNumber}: ${voucher.description}`,
      lines: [
        { account: voucher.expenseAccount, debit: voucher.netPaidAmount, credit: 0, memo: voucher.description },
        { account: bank.glAccount, debit: 0, credit: voucher.netPaidAmount, memo: `Paid from ${bank.accountName}` },
      ],
      postedBy: req.user ? req.user._id : voucher.recordedBy,
    });

    // Handle VAT input (if any)
    // In a full implementation you'd also debit Input VAT account & credit WHT payable account

    bank.currentBalance = (bank.currentBalance || 0) - voucher.netPaidAmount;
    await bank.save();

    voucher.status = 'paid';
    voucher.approvedBy = req.body.approvedBy || (req.user ? req.user._id : null);
    voucher.journalEntry = journal._id;
    await voucher.save();
    await updateBalancesForEntry(journal);

    res.json({ success: true, data: voucher });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listVouchers = async (req, res) => {
  const filter = {};
  if (req.query.costCenter) filter.costCenter = req.query.costCenter;
  if (req.query.status) filter.status = req.query.status;

  const list = await ExpenseVoucher.find(filter)
    .populate('expenseAccount', 'accountCode accountName')
    .populate('bankAccount', 'accountName')
    .populate('machine', 'machineName')
    .sort({ expenseDate: -1 });
  res.json({ success: true, data: list });
};

export const getVoucher = async (req, res) => {
  const v = await ExpenseVoucher.findById(req.params.id)
    .populate('expenseAccount bankAccount machine machineMaintenanceTicket');
  if (!v) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: v });
};

export const updateVoucher = async (req, res) => {
  const v = await ExpenseVoucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!v) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: v });
};

export const deleteVoucher = async (req, res) => {
  const v = await ExpenseVoucher.findByIdAndDelete(req.params.id);
  if (!v) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Expense voucher removed' });
};

