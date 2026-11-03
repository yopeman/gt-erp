import mongoose from 'mongoose';

const purchaseRequestAttachmentSchema = new mongoose.Schema(
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

const purchaseRequestItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      default: null
    },
    itemName: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    requestedQuantity: {
      type: Number,
      required: [true, 'Requested quantity is required'],
      min: [0, 'Requested quantity cannot be negative']
    },
    unitOfMeasurement: {
      type: String,
      trim: true
    },
    estimatedUnitPrice: {
      type: Number,
      default: 0,
      min: [0, 'Estimated unit price cannot be negative']
    },
    estimatedTotal: {
      type: Number,
      default: 0,
      min: [0, 'Estimated total cannot be negative']
    },
    preferredSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },
    note: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

purchaseRequestItemSchema.pre('validate', function (next) {
  if (this.requestedQuantity && this.estimatedUnitPrice && (!this.estimatedTotal || this.estimatedTotal === 0)) {
    this.estimatedTotal = this.requestedQuantity * this.estimatedUnitPrice;
  }
  next();
});

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestNumber: {
      type: String,
      required: [true, 'Request number is required'],
      unique: true,
      trim: true
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Requested by employee is required']
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    items: {
      type: [purchaseRequestItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Purchase request must contain at least one item'
      }
    },
    purpose: {
      type: String,
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      trim: true
    },
    requiredDate: {
      type: Date,
      default: null
    },
    estimatedTotalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Estimated total amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true,
      trim: true
    },
    attachments: [purchaseRequestAttachmentSchema],
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'approved',
        'rejected',
        'partially approved',
        'converted to purchase order',
        'cancelled'
      ],
      default: 'draft',
      trim: true
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
    rejectionReason: {
      type: String,
      trim: true
    },
    note: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

purchaseRequestSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.estimatedTotalAmount = this.items.reduce((sum, item) => sum + (item.estimatedTotal || 0), 0);
  }
  next();
});

purchaseRequestSchema.index({ requestNumber: 1 });
purchaseRequestSchema.index({ requestedBy: 1 });
purchaseRequestSchema.index({ department: 1 });
purchaseRequestSchema.index({ status: 1 });
purchaseRequestSchema.index({ priority: 1 });

const PurchaseRequest = mongoose.model('PurchaseRequest', purchaseRequestSchema);

export default PurchaseRequest;

