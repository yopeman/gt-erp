// backend/controllers/journalEntryController.js
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/** Create and optionally post a journal entry */
export const createJournalEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.create(req.body);
    if (entry.status === 'posted') await updateBalancesForEntry(entry);
    res.status(201).json({ success: true, data: entry });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listJournalEntries = async (req, res) => {
  const entries = await JournalEntry.find()
    .populate('lines.account', 'accountCode accountName')
    .sort({ entryDate: -1 });
  res.json({ success: true, data: entries });
};

export const getJournalEntry = async (req, res) => {
  const entry = await JournalEntry.findById(req.params.id)
    .populate('lines.account', 'accountCode accountName');
  if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: entry });
};

export const updateJournalEntry = async (req, res) => {
  const entry = await JournalEntry.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
  // Re‑calculate balances if status changed to posted
  if (entry.status === 'posted') await updateBalancesForEntry(entry);
  res.json({ success: true, data: entry });
};

export const deleteJournalEntry = async (req, res) => {
  const entry = await JournalEntry.findByIdAndDelete(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
  // Deleting a posted entry would leave balances inconsistent – in production you would reverse instead.
  res.json({ success: true, message: 'Journal entry deleted (use reversal in real system)' });
};

