// backend/controllers/bankAccountController.js
import BankAccount from '../models/BankAccount.js';
import { updateBalancesForEntry } from '../utils/balanceUtils.js';
import JournalEntry from '../models/JournalEntry.js';

// Helper to create a linked journal entry for a new bank account (opening balance)
const createOpeningJournal = async (account) => {
  if (!account.openingBalance || account.openingBalance === 0) return null;
  const gl = await BankAccount.findById(account._id).populate('glAccount');
  const entry = await JournalEntry.create({
    entryNumber: `JE-OPEN-${Date.now()}`,
    entryDate: new Date(),
    sourceModule: 'treasury',
    narration: `Opening balance for bank account ${account.accountName}`,
    lines: [
      { account: gl.glAccount, debit: account.openingBalance, credit: 0 },
      { account: account.glAccount, debit: 0, credit: account.openingBalance },
    ],
    postedBy: account.createdBy,
  });
  await updateBalancesForEntry(entry);
  return entry;
};

export const createBankAccount = async (req, res) => {
  try {
    const account = await BankAccount.create(req.body);
    const je = await createOpeningJournal(account);
    if (je) account.journalEntry = je._id;
    await account.save();
    res.status(201).json({ success: true, data: account });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listBankAccounts = async (req, res) => {
  const list = await BankAccount.find().populate('glAccount', 'accountCode accountName');
  res.json({ success: true, data: list });
};

export const getBankAccount = async (req, res) => {
  const acc = await BankAccount.findById(req.params.id).populate('glAccount');
  if (!acc) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: acc });
};

export const updateBankAccount = async (req, res) => {
  const acc = await BankAccount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!acc) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: acc });
};

export const deleteBankAccount = async (req, res) => {
  const acc = await BankAccount.findByIdAndDelete(req.params.id);
  if (!acc) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Bank account removed' });
};

