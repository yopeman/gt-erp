import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const BankAccountSchema = new Schema({
  accountName: { type: String, required: true },
  accountNumber: { type: String, trim: true, sparse: true, unique: true },
  bankName: {
    type: String,
    required: true,
    enum: [
      'Commercial Bank of Ethiopia',
      'Awash Bank',
      'Dashen Bank',
      'Bank of Abyssinia',
      'Nib International Bank',
      'Cooperative Bank of Oromia',
      'Telebirr',
      'CBE Birr',
      'Cash in Vault',
      'Petty Cash Vault',
      'Other',
    ],
  },
  branch: { type: String },
  glAccount: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  currency: { type: String, default: 'ETB', uppercase: true },
  openingBalance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  minimumBalanceAlert: { type: Number, default: 1000 },
  isPettyCashVault: { type: Boolean, default: false },
  signatories: [{
    employee: { type: Schema.Types.ObjectId, ref: 'Employee' },
    role: { type: String },
  }],
  status: { type: String, enum: ['active', 'frozen', 'closed'], default: 'active', index: true },
  notes: { type: String },
}, { timestamps: true });

export default model('BankAccount', BankAccountSchema);

