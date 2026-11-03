import mongoose from 'mongoose';

const paymentAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const purchasePaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      required: [true, 'Payment number is required'],
      unique: true,
      trim: true
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required']
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'Purchase order reference is required']
    },
    goodsReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoodsReceipt',
      default: null
    },
    invoiceNumber: {
      type: String,
      trim: true
    },
    paymentDate: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Payment amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true,
      trim: true
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank transfer', 'cheque', 'other'],
      required: [true, 'Payment method is required'],
      trim: true
    },
    transactionReference: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Paid by employee is required']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    attachments: [paymentAttachmentSchema],
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'rejected', 'cancelled'],
      default: 'pending',
      trim: true
    },
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

purchasePaymentSchema.index({ paymentNumber: 1 });
purchasePaymentSchema.index({ supplier: 1 });
purchasePaymentSchema.index({ purchaseOrder: 1 });
purchasePaymentSchema.index({ status: 1 });
purchasePaymentSchema.index({ paymentDate: -1 });

const PurchasePayment = mongoose.model('PurchasePayment', purchasePaymentSchema);

export default PurchasePayment;

