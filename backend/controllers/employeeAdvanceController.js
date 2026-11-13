// backend/controllers/employeeAdvanceController.js
import EmployeeAdvance from '../models/EmployeeAdvance.js';
import BankAccount from '../models/BankAccount.js';
import JournalEntry from '../models/JournalEntry.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';

/** Create an employee advance request */
export const createAdvance = async (req, res) => {
  try {
    const advance = await EmployeeAdvance.create({
      ...req.body,
      remainingBalance: req.body.approvedAmount || req.body.requestedAmount,
    });
    res.status(201).json({ success: true, data: advance });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/** Approve an advance */
export const approveAdvance = async (req, res) => {
  try {
    const adv = await EmployeeAdvance.findById(req.params.id);
    if (!adv) return res.status(404).json({ success: false, message: 'Not found' });

    adv.status = 'approved';
    adv.approvedBy = req.body.approvedBy || (req.user ? req.user._id : null);
    adv.approvedAmount = req.body.approvedAmount || adv.requestedAmount;
    adv.remainingBalance = adv.approvedAmount;
    adv.monthlyDeductionAmount = req.body.monthlyDeductionAmount || adv.monthlyDeductionAmount;
    await adv.save();
    res.json({ success: true, data: adv });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/** Disburse an approved advance: debit employee advance receivable, credit bank */
export const disburseAdvance = async (req, res) => {
  try {
    const adv = await EmployeeAdvance.findById(req.params.id);
    if (!adv) return res.status(404).json({ success: false, message: 'Not found' });
    if (adv.status !== 'approved') return res.status(400).json({ success: false, message: 'Advance must be approved first' });

    const bank = await BankAccount.findById(adv.bankAccount || req.body.bankAccount);
    if (!bank) return res.status(400).json({ success: false, message: 'Bank account required' });

    // Create journal entry
    const journal = await JournalEntry.create({
      entryNumber: `JE-ADV-${Date.now()}`,
      entryDate: new Date(),
      sourceModule: 'payroll',
      referenceType: 'ExpenseVoucher',
      referenceId: adv._id,
      narration: `Employee advance ${adv.advanceNumber} disbursement`,
      lines: [
        { account: bank.glAccount, debit: adv.approvedAmount, credit: 0, partyType: 'Employee', partyId: adv.employee, memo: 'Employee advance receivable' },
        { account: bank.glAccount, debit: 0, credit: adv.approvedAmount, memo: `Disbursed from ${bank.accountName}` },
      ],
      postedBy: req.user ? req.user._id : adv.employee,
    });

    bank.currentBalance = (bank.currentBalance || 0) - adv.approvedAmount;
    await bank.save();

    adv.status = 'disbursed';
    adv.disbursementDate = new Date();
    adv.bankAccount = bank._id;
    adv.journalEntry = journal._id;
    await adv.save();
    await updateBalancesForEntry(journal);

    res.json({ success: true, data: adv });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

/** Record a repayment (typically called during payroll run) */
export const recordRepayment = async (req, res) => {
  try {
    const adv = await EmployeeAdvance.findById(req.params.id);
    if (!adv) return res.status(404).json({ success: false, message: 'Not found' });

    const { amount, payroll, deductedInBatch } = req.body;
    adv.totalRepaidAmount = (adv.totalRepaidAmount || 0) + amount;
    adv.remainingBalance = adv.approvedAmount - adv.totalRepaidAmount;
    adv.repaymentHistory.push({ payroll, date: new Date(), amount, deductedInBatch });

    if (adv.remainingBalance <= 0) {
      adv.remainingBalance = 0;
      adv.status = 'fully_repaid';
    } else {
      adv.status = 'repaying';
    }
    await adv.save();
    res.json({ success: true, data: adv });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listAdvances = async (req, res) => {
  const filter = {};
  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.status) filter.status = req.query.status;

  const list = await EmployeeAdvance.find(filter)
    .populate('employee', 'firstName lastName employeeId')
    .populate('bankAccount', 'accountName')
    .sort({ requestDate: -1 });
  res.json({ success: true, data: list });
};

export const getAdvance = async (req, res) => {
  const a = await EmployeeAdvance.findById(req.params.id)
    .populate('employee bankAccount');
  if (!a) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: a });
};

export const updateAdvance = async (req, res) => {
  const a = await EmployeeAdvance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!a) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: a });
};

export const deleteAdvance = async (req, res) => {
  const a = await EmployeeAdvance.findByIdAndDelete(req.params.id);
  if (!a) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Advance removed' });
};

