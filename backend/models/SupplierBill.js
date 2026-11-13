import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const SupplierBillSchema = new Schema({
  billNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
  supplierInvoiceNumber: { type: String, required: true },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
  purchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true, index: true },
  goodsReceipts: [{ type: Schema.Types.ObjectId, ref: 'GoodsReceipt' }],
  billDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true, index: true },
  items: [{
    item: { type: Schema.Types.ObjectId, ref: 'InventoryItem' },
    description: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true },
  }],
  financials: {
    subtotal: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, default: 15 },
    vatAmount: { type: Number, default: 0 },
    withholdingTaxRate: { type: Number, default: 2 },
    withholdingTaxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingBalance: { type: Number, required: true, min: 0, index: true },
    currency: { type: String, default: 'ETB' },
  },
  paymentStatus: { type: String, enum: ['unpaid', 'partially_paid', 'paid'], default: 'unpaid', index: true },
  status: { type: String, enum: ['draft', 'verified', 'approved', 'disputed', 'cancelled'], default: 'verified', index: true },
  journalEntry: { type: Schema.Types.ObjectId, ref: 'JournalEntry' },
  attachments: [{ name: { type: String }, url: { type: String } }],
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  notes: { type: String },
}, { timestamps: true });

export default model('SupplierBill', SupplierBillSchema);

