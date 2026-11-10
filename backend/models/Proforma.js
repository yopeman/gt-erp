import mongoose from 'mongoose';

const proformaItemSchema = new mongoose.Schema(
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

const proformaSchema = new mongoose.Schema(
  {
    proformaNumber: {
      type: String,
      required: [true, 'Proforma number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
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
    validUntil: {
      type: Date,
      required: [true, 'Validity expiry date is required']
    },
    items: [proformaItemSchema],
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
      default: 0,
      min: 0
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true
    },
    termsAndConditions: {
      type: String,
      trim: true,
      default: '1. Price is valid for 15 days from issue date.\n2. 50% advance payment required upon order confirmation.\n3. Standard delivery within 7 working days following design approval.'
    },
    status: {
      type: String,
      enum: ['draft', 'sent_to_customer', 'accepted', 'rejected', 'expired'],
      default: 'draft',
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

proformaSchema.index({ proformaNumber: 'text', termsAndConditions: 'text' });

const Proforma = mongoose.model('Proforma', proformaSchema);

export default Proforma;

