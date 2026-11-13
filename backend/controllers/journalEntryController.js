// backend/controllers/journalEntryController.js
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/** Create and optionally post a journal entry */
export const createJournalEntry = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!data.postedBy && req.user?._id) {
      data.postedBy = req.user._id;
    }
    if (!data.entryNumber) {
      data.entryNumber = `JE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }
    const entry = await JournalEntry.create(data);
    if (entry.status === 'posted') await updateBalancesForEntry(entry);
    res.status(201).json({ success: true, data: entry });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listJournalEntries = async (req, res) => {
  try {
    const entries = await JournalEntry.find()
      .populate('lines.account', 'accountCode accountName')
      .populate('postedBy', 'fullName email')
      .sort({ entryDate: -1 });
    res.json({ success: true, data: entries });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const getJournalEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id)
      .populate('lines.account', 'accountCode accountName')
      .populate('postedBy', 'fullName email');
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: entry });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

export const updateJournalEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
    // Re‑calculate balances if status changed to posted
    if (entry.status === 'posted') await updateBalancesForEntry(entry);
    res.json({ success: true, data: entry });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteJournalEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Not found' });
    // Deleting a posted entry would leave balances inconsistent – in production you would reverse instead.
    res.json({ success: true, message: 'Journal entry deleted (use reversal in real system)' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

