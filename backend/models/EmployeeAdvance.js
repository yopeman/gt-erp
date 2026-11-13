import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const EmployeeAdvanceSchema = new Schema({
  advanceNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
  requestDate: { type: Date, default: Date.now },
  requestedAmount: { type: Number, required: true, min: 100 },
  approvedAmount: { type: Number, required: true, min: 0 },
  disbursementDate: { type: Date },
  bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount' },
  repaymentType: {
    type: String,
    enum: ['single_payroll', 'installments'],
    default: 'single_payroll',
  },
  numberOfInstallments: { type: Number, default: 1 },
  monthlyDeductionAmount: { type: Number, required: true },
  totalRepaidAmount: { type: Number, default: 0 },
  remainingBalance: { type: Number, required: true, index: true },
  repaymentHistory: [{
    payroll: { type: Schema.Types.ObjectId, ref: 'Payroll' },
    date: { type: Date },
    amount: { type: Number },
    deductedInBatch: { type: String },
  }],
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['requested', 'approved', 'disbursed', 'repaying', 'fully_repaid', 'written_off', 'rejected'],
    default: 'requested',
    index: true,
  },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true });

export default model('EmployeeAdvance', EmployeeAdvanceSchema);

