import mongoose from 'mongoose';

const customerPaymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice reference is required'],
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than zero']
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'telebirr', 'cbe_birr', 'credit_offset'],
      required: [true, 'Payment method is required']
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: ''
    },
    bankDetails: {
      bankName: { type: String, trim: true, default: '' },
      accountNumber: { type: String, trim: true, default: '' }
    },
    receiptAttachmentUrl: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending_verification', 'verified', 'bounced', 'cancelled'],
      default: 'verified',
      index: true
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Received by employee reference is required']
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

customerPaymentSchema.index({ receiptNumber: 'text', referenceNumber: 'text' });

const CustomerPayment = mongoose.model('CustomerPayment', customerPaymentSchema);

export default CustomerPayment;

