// backend/controllers/accountController.js
import Account from '../models/Account.js';
import { recalculateAccountBalance } from '../utils/balanceUtils.js';

export const createAccount = async (req, res) => {
  try {
    const acct = await Account.create(req.body);
    // initial balance calculation (usually zero)
    await recalculateAccountBalance(acct._id);
    res.status(201).json({ success: true, data: acct });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
};

export const listAccounts = async (req, res) => {
  const list = await Account.find().sort({ accountCode: 1 });
  res.json({ success: true, data: list });
};

export const getAccount = async (req, res) => {
  const acct = await Account.findById(req.params.id);
  if (!acct) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, data: acct });
};

export const updateAccount = async (req, res) => {
  const acct = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!acct) return res.status(404).json({ success: false, message: 'Not found' });
  // recompute balance if relevant fields changed
  await recalculateAccountBalance(acct._id);
  res.json({ success: true, data: acct });
};

export const deleteAccount = async (req, res) => {
  const acct = await Account.findByIdAndDelete(req.params.id);
  if (!acct) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'Account removed' });
};

