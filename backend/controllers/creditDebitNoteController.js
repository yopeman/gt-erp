// backend/controllers/creditDebitNoteController.js
import CreditDebitNote from '../models/CreditDebitNote.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/**
 * Create a credit/debit note.
 * Credit note (customer): Debit sales returns/allowances, Credit AR
 * Debit note (supplier): Debit AP, Credit purchase returns
 */
export const createNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.create(req.body);
    res.status(201).json({ success: true, data: note });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listNotes = async (req, res) => {
  const { noteType, partyType } = req.query;
  const filter = {};
  if (noteType) filter.noteType = noteType;
  if (partyType) filter.partyType = partyType;

  const list = await CreditDebitNote.find(filter)
    .populate('customer', 'name')
    .populate('supplier', 'name')
    .populate('relatedInvoice', 'invoiceNumber')
    .populate('relatedBill', 'billNumber')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: list });
};

export const getNote = async (req, res) => {
  const n = await CreditDebitNote.findById(req.params.id)
    .populate('customer supplier relatedInvoice relatedBill relatedSupplierReturn');
  if (!n) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: n });
};

export const updateNote = async (req, res) => {
  const n = await CreditDebitNote.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!n) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: n });
};

export const applyNote = async (req, res) => {
  try {
    const note = await CreditDebitNote.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Not found' });
    if (note.status === 'applied') return res.status(400).json({ success: false, message: 'Already applied' });

    note.status = 'applied';
    note.appliedAt = new Date();
    await note.save();
    res.json({ success: true, data: note });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const deleteNote = async (req, res) => {
  const n = await CreditDebitNote.findByIdAndDelete(req.params.id);
  if (!n) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Note removed' });
};

