// backend/controllers/bankTransferController.js
import BankTransfer from '../models/BankTransfer.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

export const createTransfer = async (req, res) => {
  try {
    const { fromAccount, toAccount, amount, transferFee = 0 } = req.body;
    const total = Number(amount) + Number(transferFee);

    const transfer = await BankTransfer.create({
      ...req.body,
      amount: Number(amount),
      transferFee: Number(transferFee),
    });

    // Build journal entry: debit source, credit destination, fees go to a fee expense account if needed.
    const lines = [
      { account: fromAccount, debit: 0, credit: total }, // cash out
      { account: toAccount, debit: total, credit: 0 },   // cash in
    ];
    const journal = await JournalEntry.create({
      entryNumber: `JE-TRF-${Date.now()}`,
      entryDate: new Date(),
      sourceModule: 'treasury',
      narration: `Bank transfer ${transfer.transferNumber}`,
      lines,
      postedBy: req.user ? req.user._id : null,
    });
    transfer.journalEntry = journal._id;
    await transfer.save();
    await updateBalancesForEntry(journal);
    res.status(201).json({ success: true, data: transfer });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listTransfers = async (req, res) => {
  const list = await BankTransfer.find()
    .populate('fromAccount toAccount', 'accountCode accountName')
    .sort({ transferDate: -1 });
  res.json({ success: true, data: list });
};

export const getTransfer = async (req, res) => {
  const tr = await BankTransfer.findById(req.params.id)
    .populate('fromAccount toAccount');
  if (!tr) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: tr });
};

export const updateTransfer = async (req, res) => {
  const tr = await BankTransfer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!tr) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: tr });
};

export const deleteTransfer = async (req, res) => {
  const tr = await BankTransfer.findByIdAndDelete(req.params.id);
  if (!tr) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Transfer removed' });
};

