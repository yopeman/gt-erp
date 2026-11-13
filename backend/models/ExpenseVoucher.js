import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const ExpenseVoucherSchema = new Schema({
  voucherNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  expenseAccount: { type: Schema.Types.ObjectId, ref: 'Account', required: true, index: true },
  costCenter: {
    type: String,
    required: true,
    enum: [
      'production_floor',
      'sales_and_marketing',
      'administration',
      'plant_maintenance',
      'logistics',
      'executive',
    ],
    index: true,
  },
  machine: { type: Schema.Types.ObjectId, ref: 'Machine' },
  machineMaintenanceTicket: { type: Schema.Types.ObjectId, ref: 'MachineMaintenance' },
  vendorName: { type: String, required: true },
  vendorTin: { type: String },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  vatRate: { type: Number, default: 0 },
  vatAmount: { type: Number, default: 0 },
  withholdingTaxRate: { type: Number, default: 0 },
  withholdingTaxAmount: { type: Number, default: 0 },
  netPaidAmount: { type: Number, required: true },
  bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'cash', 'telebirr', 'petty_cash'],
    default: 'bank_transfer',
  },
  referenceNumber: { type: String },
  receiptAttachmentUrl: { type: String },
  expenseDate: { type: Date, default: Date.now, index: true },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'paid', 'rejected'],
    default: 'draft',
    index: true,
  },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  recordedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  notes: { type: String },
}, { timestamps: true });

export default model('ExpenseVoucher', ExpenseVoucherSchema);

