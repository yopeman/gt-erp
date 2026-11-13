import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const JournalLineSchema = new Schema({
  account: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
  debit: { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 },
  partyType: {
    type: String,
    enum: ['Customer', 'Supplier', 'Employee', 'None'],
    default: 'None',
  },
  partyId: { type: Schema.Types.ObjectId },
  memo: { type: String },
});

const JournalEntrySchema = new Schema({
  entryNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  entryDate: { type: Date, default: Date.now, index: true },
  sourceModule: {
    type: String,
    required: true,
    enum: [
      'sales',
      'purchasing',
      'payroll',
      'treasury',
      'inventory',
      'expense',
      'production',
      'tax',
      'manual_adjustment',
    ],
    index: true,
  },
  referenceType: {
    type: String,
    enum: [
      'CustomerInvoice',
      'CustomerPayment',
      'SupplierBill',
      'SupplierPayment',
      'PayrollBatch',
      'ExpenseVoucher',
      'PettyCashVoucher',
      'StockMovement',
      'ProductionCostRollup',
      'TaxSettlement',
      'ManualVoucher',
    ],
  },
  referenceId: { type: Schema.Types.ObjectId },
  narration: { type: String, required: true },
  lines: [JournalLineSchema],
  totalDebit: { type: Number },
  totalCredit: { type: Number },
  status: { type: String, enum: ['draft', 'posted', 'voided'], default: 'posted', index: true },
  isReconciled: { type: Boolean, default: false },
  reconciledDate: { type: Date },
  postedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  voidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  voidReason: { type: String },
  voidedAt: { type: Date },
}, { timestamps: true });

// Ensure debits equal credits before saving
JournalEntrySchema.pre('validate', function(next) {
  const debitSum = (this.lines || []).reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const creditSum = (this.lines || []).reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  if (Math.abs(debitSum - creditSum) > 0.001) {
    throw new Error('Total debit must equal total credit');
  }
  this.totalDebit = debitSum;
  this.totalCredit = creditSum;
  if (typeof next === 'function') {
    next();
  }
});

export default model('JournalEntry', JournalEntrySchema);

