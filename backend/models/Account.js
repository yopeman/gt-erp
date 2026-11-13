import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const AccountSchema = new Schema({
  accountCode: { type: String, required: true, unique: true, uppercase: true, index: true },
  accountName: { type: String, required: true },
  accountType: {
    type: String,
    required: true,
    enum: ['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense'],
    index: true,
  },
  subType: {
    type: String,
    required: true,
    enum: [
      'cash_and_bank',
      'accounts_receivable',
      'inventory_asset',
      'prepaid_expense',
      'fixed_asset',
      'accounts_payable',
      'accrued_liability',
      'tax_payable',
      'owner_equity',
      'retained_earnings',
      'sales_revenue',
      'direct_material_cogs',
      'direct_labor_cogs',
      'machine_overhead_cogs',
      'operating_expense',
      'administrative_expense',
      'financial_expense',
    ],
  },
  currency: { type: String, default: 'ETB', uppercase: true },
  parentAccount: { type: Schema.Types.ObjectId, ref: 'Account' },
  isGroupAccount: { type: Boolean, default: false },
  currentBalance: { type: Number, default: 0 }, // store as smallest currency unit if needed
  normalBalance: { type: String, required: true, enum: ['debit', 'credit'] },
  isActive: { type: Boolean, default: true, index: true },
  description: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default model('Account', AccountSchema);

