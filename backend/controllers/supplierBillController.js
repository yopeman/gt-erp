// backend/controllers/supplierBillController.js
import SupplierBill from '../models/SupplierBill.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/** Create a supplier bill and automatically generate its journal entry */
export const createBill = async (req, res) => {
  try {
    const bill = await SupplierBill.create(req.body);
    const { financials, expenseAccount } = bill;
    // Build journal lines: debit expense (or asset) accounts, credit supplier liability
    const lines = [];
    // Assuming items are expenses – we debit the appropriate expense accounts per item if needed.
    // For simplicity we debit a generic expense account stored in financials (not defined in schema) – fallback to a placeholder.
    const expenseAcc = bill.expenseAccount || null; // you may add a field later.
    if (expenseAcc) {
      lines.push({ account: expenseAcc, debit: financials.grandTotal, credit: 0 });
    }
    // Credit the supplier's liability account (needs a GL account reference; placeholder here)
    if (bill.supplier) {
      lines.push({ account: bill.supplier, debit: 0, credit: financials.grandTotal });
    }
    const journal = await JournalEntry.create({
      entryNumber: `JE-BILL-${Date.now()}`,
      entryDate: bill.billDate,
      sourceModule: 'purchasing',
      narration: `Supplier bill ${bill.billNumber}`,
      lines,
      postedBy: req.user ? req.user._id : null,
    });
    bill.journalEntry = journal._id;
    await bill.save();
    await updateBalancesForEntry(journal);
    res.status(201).json({ success: true, data: bill });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listBills = async (req, res) => {
  const list = await SupplierBill.find()
    .populate('supplier purchaseOrder goodsReceipts')
    .sort({ billDate: -1 });
  res.json({ success: true, data: list });
};

export const getBill = async (req, res) => {
  const bill = await SupplierBill.findById(req.params.id).populate('supplier purchaseOrder goodsReceipts');
  if (!bill) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: bill });
};

export const updateBill = async (req, res) => {
  const bill = await SupplierBill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!bill) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: bill });
};

export const deleteBill = async (req, res) => {
  const bill = await SupplierBill.findByIdAndDelete(req.params.id);
  if (!bill) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Bill removed' });
};

