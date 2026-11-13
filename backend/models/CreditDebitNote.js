import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const CreditDebitNoteSchema = new Schema({
  noteNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  noteType: { type: String, required: true, enum: ['credit_note', 'debit_note'], index: true },
  partyType: { type: String, required: true, enum: ['Customer', 'Supplier'], index: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  relatedInvoice: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  relatedBill: { type: Schema.Types.ObjectId, ref: 'SupplierBill' },
  relatedSupplierReturn: { type: Schema.Types.ObjectId, ref: 'SupplierReturn' },
  amount: { type: Number, required: true, min: 0.01 },
  vatAdjustment: { type: Number, default: 0 },
  totalAdjustment: { type: Number, required: true },
  reason: {
    type: String,
    required: true,
    enum: [
      'print_defect',
      'goods_returned',
      'pricing_error',
      'discount_allowance',
      'order_cancellation',
      'other',
    ],
  },
  detailedExplanation: { type: String, required: true },
  status: {
    type: String,
    enum: ['draft', 'approved', 'applied', 'voided'],
    default: 'approved',
    index: true,
  },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  appliedAt: { type: Date },
}, { timestamps: true });

export default model('CreditDebitNote', CreditDebitNoteSchema);

