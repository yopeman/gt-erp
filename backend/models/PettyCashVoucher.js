import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const PettyCashVoucherSchema = new Schema({
  voucherNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  voucherType: { type: String, required: true, enum: ['disbursement', 'replenishment'] },
  bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  expenseAccount: { type: Schema.Types.ObjectId, ref: 'Account', required: true }, // GL account to debit for disbursement
  amount: { type: Number, required: true, min: 0.01 },
  expenseCategory: {
    type: String,
    required: true,
    enum: [
      'transport_fare',
      'stationery',
      'factory_refreshment',
      'minor_repairs',
      'loading_unloading',
      'emergency_supplies',
      'other',
    ],
  },
  paidTo: { type: String, required: true },
  custodian: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  receiptAttachmentUrl: { type: String },
  paymentDate: { type: Date, default: Date.now, index: true },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'paid', 'reconciled', 'rejected'],
    default: 'paid',
    index: true,
  },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  notes: { type: String },
}, { timestamps: true });

export default model('PettyCashVoucher', PettyCashVoucherSchema);

