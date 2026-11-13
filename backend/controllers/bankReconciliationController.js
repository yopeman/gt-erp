// backend/controllers/bankReconciliationController.js
import BankReconciliation from '../models/BankReconciliation.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

export const createReconciliation = async (req, res) => {
  try {
    const recon = await BankReconciliation.create(req.body);
    // optional: create a journal entry summarising cleared transactions
    if (recon.clearedTransactions && recon.clearedTransactions.length) {
      const lines = recon.clearedTransactions.map((t) => ({
        account: t.journalEntry, // assuming each cleared transaction references its journal entry as account – simplify
        debit: t.amount,
        credit: 0,
      }));
      const journal = await JournalEntry.create({
        entryNumber: `JE-RECON-${Date.now()}`,
        entryDate: new Date(),
        sourceModule: 'treasury',
        narration: `Bank reconciliation ${recon.statementReference}`,
        lines,
        postedBy: req.user ? req.user._id : null,
      });
      recon.journalEntry = journal._id;
      await recon.save();
      await updateBalancesForEntry(journal);
    }
    res.status(201).json({ success: true, data: recon });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listReconciliations = async (req, res) => {
  const list = await BankReconciliation.find()
    .populate('bankAccount')
    .sort({ statementEndDate: -1 });
  res.json({ success: true, data: list });
};

export const getReconciliation = async (req, res) => {
  const rec = await BankReconciliation.findById(req.params.id).populate('bankAccount');
  if (!rec) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: rec });
};

export const updateReconciliation = async (req, res) => {
  const rec = await BankReconciliation.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!rec) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: rec });
};

export const deleteReconciliation = async (req, res) => {
  const rec = await BankReconciliation.findByIdAndDelete(req.params.id);
  if (!rec) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Reconciliation removed' });
};

