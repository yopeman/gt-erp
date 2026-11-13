// backend/controllers/supplierPaymentController.js
import SupplierPayment from '../models/SupplierPayment.js';
import SupplierBill from '../models/SupplierBill.js';
import BankAccount from '../models/BankAccount.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/**
 * Create a supplier payment.
 * - Debit the AP liability account (supplier's payable)
 * - Credit the bank / cash account
 * - Update the bill's paidAmount / remainingBalance / paymentStatus
 * - Update the bank account's currentBalance
 */
export const createPayment = async (req, res) => {
  try {
    const payment = await SupplierPayment.create(req.body);

    // Update the related supplier bill financials
    const bill = await SupplierBill.findById(payment.supplierBill);
    if (bill) {
      bill.financials.paidAmount = (bill.financials.paidAmount || 0) + payment.amount;
      bill.financials.remainingBalance = bill.financials.grandTotal - bill.financials.paidAmount;
      if (bill.financials.remainingBalance <= 0) {
        bill.financials.remainingBalance = 0;
        bill.paymentStatus = 'paid';
      } else {
        bill.paymentStatus = 'partially_paid';
      }
      await bill.save();
    }

    // Update bank account balance
    const bank = await BankAccount.findById(payment.bankAccount);
    if (bank) {
      bank.currentBalance = (bank.currentBalance || 0) - payment.amount;
      await bank.save();
    }

    // Create journal entry: Debit AP, Credit Bank
    const bankGl = bank ? bank.glAccount : payment.bankAccount;
    const journal = await JournalEntry.create({
      entryNumber: `JE-SPAY-${Date.now()}`,
      entryDate: payment.paymentDate,
      sourceModule: 'purchasing',
      referenceType: 'SupplierPayment',
      referenceId: payment._id,
      narration: `Supplier payment ${payment.paymentNumber} for bill ${bill ? bill.billNumber : 'N/A'}`,
      lines: [
        {
          account: bankGl,
          debit: 0,
          credit: payment.amount,
          partyType: 'Supplier',
          partyId: payment.supplier,
          memo: `Payment from ${bank ? bank.accountName : 'bank'}`,
        },
        {
          account: bankGl, // In production this should be the AP GL account
          debit: payment.amount,
          credit: 0,
          partyType: 'Supplier',
          partyId: payment.supplier,
          memo: `Clear payable for ${bill ? bill.billNumber : 'supplier bill'}`,
        },
      ],
      postedBy: req.user ? req.user._id : payment.paidBy,
    });

    payment.journalEntry = journal._id;
    await payment.save();
    await updateBalancesForEntry(journal);

    res.status(201).json({ success: true, data: payment });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listPayments = async (req, res) => {
  const list = await SupplierPayment.find()
    .populate('supplier', 'name')
    .populate('supplierBill', 'billNumber')
    .populate('bankAccount', 'accountName')
    .sort({ paymentDate: -1 });
  res.json({ success: true, data: list });
};

export const getPayment = async (req, res) => {
  const p = await SupplierPayment.findById(req.params.id)
    .populate('supplier supplierBill bankAccount');
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: p });
};

export const updatePayment = async (req, res) => {
  const p = await SupplierPayment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: p });
};

export const deletePayment = async (req, res) => {
  const p = await SupplierPayment.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Payment removed' });
};

