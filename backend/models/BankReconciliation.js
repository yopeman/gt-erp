import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const BankReconciliationSchema = new Schema({
  statementReference: { type: String, required: true, unique: true, index: true },
  bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  statementStartDate: { type: Date, required: true },
  statementEndDate: { type: Date, required: true },
  statementEndingBalance: { type: Number, required: true },
  glEndingBalance: { type: Number, required: true },
  clearedTransactions: [{
    journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
    referenceNumber: { type: String },
    amount: { type: Number },
    clearedDate: { type: Date },
  }],
  unreconciledDifference: { type: Number, default: 0 },
  status: { type: String, enum: ['in_progress', 'reconciled', 'discrepancy_flagged'], default: 'in_progress' },
  reconciledBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  statementAttachmentUrl: { type: String },
  notes: { type: String },
}, { timestamps: true });

export default model('BankReconciliation', BankReconciliationSchema);

