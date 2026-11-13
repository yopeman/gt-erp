import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const SupplierPaymentSchema = new Schema({
  paymentNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  supplierBill: { type: Schema.Types.ObjectId, ref: 'SupplierBill', required: true, index: true },
  purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  bankAccount: { type: Schema.Types.ObjectId, ref: 'BankAccount', required: true },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['bank_transfer', 'cheque', 'cpo', 'cash', 'telebirr', 'credit_offset'],
  },
  paymentDate: { type: Date, default: Date.now, index: true },
  amount: { type: Number, required: true, min: 0.01 },
  referenceNumber: { type: String },
  withholdingReceiptNumber: { type: String },
  checkDetails: {
    checkNumber: { type: String },
    bankName: { type: String },
    maturityDate: { type: Date },
    isCleared: { type: Boolean, default: true },
  },
  paidBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  status: {
    type: String,
    enum: ['pending', 'cleared', 'bounced', 'voided'],
    default: 'cleared',
    index: true,
  },
  receiptAttachmentUrl: { type: String },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  notes: { type: String },
}, { timestamps: true });

export default model('SupplierPayment', SupplierPaymentSchema);
