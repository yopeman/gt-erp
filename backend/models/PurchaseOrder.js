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
  next();
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
  next();
});

purchaseOrderSchema.index({ purchaseOrderNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ warehouse: 1 });
purchaseOrderSchema.index({ purchaseRequest: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;

