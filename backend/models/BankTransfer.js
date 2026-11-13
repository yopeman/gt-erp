import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const BankTransferSchema = new Schema({
  transferNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  fromAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  toAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  amount: { type: Number, required: true, min: 0.01 },
  transferFee: { type: Number, default: 0, min: 0 },
  transferDate: { type: Date, default: Date.now, index: true },
  referenceNumber: { type: String },
  transferProofUrl: { type: String },
  status: { type: String, enum: ['initiated', 'completed', 'cancelled'], default: 'completed', index: true },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String },
}, { timestamps: true });

export default model('BankTransfer', BankTransferSchema);

