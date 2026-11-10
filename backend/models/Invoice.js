import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    itemDescription: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    taxRate: {
      type: Number,
      default: 15
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: true }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    customerTin: {
      type: String,
      trim: true,
      default: ''
    },
    customerVat: {
      type: String,
      trim: true,
      default: ''
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    vatRate: {
      type: Number,
      default: 15
    },
    vatAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    withholdingTaxAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    remainingBalance: {
      type: Number,
      required: true,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
      index: true
    },
    status: {
      type: String,
      enum: ['draft', 'issued', 'cancelled'],
      default: 'issued',
      index: true
    },
    pdfUrl: {
      type: String,
      trim: true,
      default: ''
    },
    preparedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    }
  },
  {
    timestamps: true
  }
);

invoiceSchema.index({ invoiceNumber: 'text', customerTin: 'text' });

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;

