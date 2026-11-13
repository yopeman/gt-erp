// backend/controllers/pettyCashVoucherController.js
import PettyCashVoucher from '../models/PettyCashVoucher.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/**
 * Create a petty‑cash voucher.
 * For a *disbursement* we debit the expense account and credit the cash/bank account.
 * For a *replenishment* we debit the cash/bank account and credit the expense account.
 */
export const createVoucher = async (req, res) => {
  try {
    const voucher = await PettyCashVoucher.create(req.body);
    const { voucherType, bankAccount, expenseAccount, amount } = voucher;
    const debit = voucherType === 'disbursement' ? amount : 0;
    const credit = voucherType === 'disbursement' ? 0 : amount;

    const journal = await JournalEntry.create({
      entryNumber: `JE-PETTY-${Date.now()}`,
      entryDate: new Date(),
      sourceModule: 'treasury',
      narration: `Petty cash ${voucherType}`,
      lines: [
        { account: expenseAccount, debit, credit },
        { account: bankAccount, debit: credit, credit: debit },
      ],
      postedBy: req.user ? req.user._id : null,
    });
    voucher.journalEntry = journal._id;
    await voucher.save();
    await updateBalancesForEntry(journal);
    res.status(201).json({ success: true, data: voucher });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listVouchers = async (req, res) => {
  const list = await PettyCashVoucher.find()
    .populate('bankAccount expenseAccount', 'accountCode accountName')
    .sort({ paymentDate: -1 });
  res.json({ success: true, data: list });
};

export const getVoucher = async (req, res) => {
  const v = await PettyCashVoucher.findById(req.params.id)
    .populate('bankAccount expenseAccount');
  if (!v) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: v });
};

export const updateVoucher = async (req, res) => {
  const v = await PettyCashVoucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!v) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: v });
};

export const deleteVoucher = async (req, res) => {
  const v = await PettyCashVoucher.findByIdAndDelete(req.params.id);
  if (!v) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Voucher removed' });
};

