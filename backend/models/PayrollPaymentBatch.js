import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const PayrollPaymentBatchSchema = new Schema({
  batchNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  periodStartDate: { type: Date, required: true },
  periodEndDate: { type: Date, required: true },
  disbursementDate: { type: Date, default: Date.now, index: true },
  bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  payrollsIncluded: [{ type: Schema.Types.ObjectId, ref: 'Payroll' }],
  employeeCount: { type: Number, required: true },
  financialSummary: {
    totalBaseSalary: { type: Number, required: true },
    totalOvertimePay: { type: Number, default: 0 },
    totalAllowances: { type: Number, default: 0 },
    totalGrossPay: { type: Number, required: true },
    totalTaxableIncome: { type: Number, required: true },
    totalEmploymentIncomeTax: { type: Number, required: true },
    totalEmployeePension: { type: Number, required: true },
    totalEmployerPension: { type: Number, required: true },
    totalAdvanceDeductions: { type: Number, default: 0 },
    totalOtherDeductions: { type: Number, default: 0 },
    totalNetSalaryDisbursement: { type: Number, required: true },
  },
  disbursementMethod: {
    type: String,
    enum: ['bank_bulk_transfer', 'cheque', 'telebirr_corporate', 'cash_payout'],
    default: 'bank_bulk_transfer',
  },
  bankTransactionReference: { type: String },
  bankExportGenerated: { type: Boolean, default: false },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  status: {
    type: String,
    enum: ['draft', 'approved', 'disbursed', 'reconciled', 'cancelled'],
    default: 'draft',
    index: true,
  },
  preparedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  disbursedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  notes: { type: String },
}, { timestamps: true });

export default model('PayrollPaymentBatch', PayrollPaymentBatchSchema);

