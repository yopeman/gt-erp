// backend/utils/balanceUtils.js
import Account from '../models/Account.js';
import JournalEntry from '../models/JournalEntry.js';

/** Recalculate the balance of a single account based on posted journal entries */
export const recalculateAccountBalance = async (accountId) => {
  const account = await Account.findById(accountId);
  if (!account) throw new Error('Account not found');

  const agg = await JournalEntry.aggregate([
    { $match: { status: 'posted' } },
    { $unwind: '$lines' },
    { $match: { 'lines.account': account._id } },
    {
      $group: {
        _id: null,
        debit: { $sum: '$lines.debit' },
        credit: { $sum: '$lines.credit' },
      },
    },
  ]);
  const { debit = 0, credit = 0 } = agg[0] || {};

  const isDebitNormal = account.normalBalance === 'debit';
  const balance = isDebitNormal ? debit - credit : credit - debit;
  account.currentBalance = balance;
  await account.save();
  return balance;
};

/** Update balances for all accounts referenced in a posted journal entry */
export const updateBalancesForEntry = async (entry) => {
  const ids = new Set();
  entry.lines.forEach((l) => ids.add(l.account.toString()));
  await Promise.all([...ids].map((id) => recalculateAccountBalance(id)));
};

