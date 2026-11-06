import mongoose from 'mongoose';

const poDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['quotation', 'invoice', 'contract', 'other'],
      default: 'other',
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

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Item reference is required']
    },
    description: {
      type: String,
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Received quantity cannot be negative']
    },
    unitOfMeasurement: {
      type: String,
      trim: true
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, 'Discount cannot be negative']
    },
    taxPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Tax percentage cannot be negative']
    },
    totalPrice: {
      type: Number,
      default: 0,
      min: [0, 'Total price cannot be negative']
    }
  },
  { _id: true }
);

purchaseOrderItemSchema.pre('validate', function (next) {
  if (this.quantity !== undefined && this.unitPrice !== undefined) {
    const rawTotal = this.quantity * this.unitPrice;
    const discounted = rawTotal - (this.discount || 0);
    const withTax = discounted + (discounted * (this.taxPercentage || 0)) / 100;
    this.totalPrice = Math.max(0, withTax);
  }
  if (typeof next === 'function') next();
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    purchaseOrderNumber: {
      type: String,
      required: [true, 'Purchase order number is required'],
      unique: true,
      trim: true
    },
    purchaseRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequest',
      default: null
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier reference is required']
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Purchase order must contain at least one item'
      }
    },
    subtotal: {
      type: Number,
      default: 0,
      min: [0, 'Subtotal cannot be negative']
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative']
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative']
    },
    shippingCost: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative']
    },
    otherExpenses: {
      type: Number,
      default: 0,
      min: [0, 'Other expenses cannot be negative']
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: [0, 'Grand total cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true,
      trim: true
    },
    paymentTerms: {
      type: String,
      trim: true
    },
    paymentType: {
      type: String,
      enum: ['cash', 'credit', 'partial'],
      default: 'cash',
      trim: true
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially paid', 'paid', 'overdue'],
      default: 'unpaid',
      trim: true
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative']
    },
    balanceDue: {
      type: Number,
      default: 0,
      min: [0, 'Balance due cannot be negative']
    },
    creditPeriodDays: {
      type: Number,
      default: 30,
      min: [0, 'Credit period cannot be negative']
    },
    paymentDueDate: {
      type: Date,
      default: null
    },
    creditLimitExceeded: {
      type: Boolean,
      default: false
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    expectedDeliveryDate: {
      type: Date,
      default: null
    },
    deliveryAddress: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    documents: [poDocumentSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Created by employee is required']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'approved',
        'sent',
        'partially received',
        'received',
        'completed',
        'rejected',
        'cancelled'
      ],
      default: 'draft',
      trim: true
    }
  },
  {
    timestamps: true
  }
);

purchaseOrderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const calculatedGrand =
      this.subtotal -
      (this.discountAmount || 0) +
      (this.taxAmount || 0) +
      (this.shippingCost || 0) +
      (this.otherExpenses || 0);
    this.grandTotal = Math.max(0, calculatedGrand);
  }

  // Handle Credit Purchasing & Payment Calculations
  const paid = Number(this.paidAmount || 0);
  this.balanceDue = Math.max(0, Number(this.grandTotal || 0) - paid);

  // Auto calculate paymentDueDate for credit purchases if not set
  if (this.paymentType === 'credit' && !this.paymentDueDate) {
    const baseDate = this.orderDate ? new Date(this.orderDate) : new Date();
    const days = Number(this.creditPeriodDays || 30);
    this.paymentDueDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  // Update payment status dynamically
  if (this.balanceDue === 0 && this.grandTotal > 0) {
    this.paymentStatus = 'paid';
  } else if (paid > 0 && this.balanceDue > 0) {
    this.paymentStatus = 'partially paid';
  } else if (this.paymentDueDate && new Date(this.paymentDueDate) < new Date() && this.balanceDue > 0) {
    this.paymentStatus = 'overdue';
  } else {
    this.paymentStatus = 'unpaid';
  }

  if (typeof next === 'function') next();
});

purchaseOrderSchema.index({ purchaseOrderNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ warehouse: 1 });
purchaseOrderSchema.index({ purchaseRequest: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ paymentType: 1 });
purchaseOrderSchema.index({ paymentStatus: 1 });
purchaseOrderSchema.index({ paymentDueDate: 1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;

