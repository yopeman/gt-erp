import mongoose from 'mongoose';

const returnAttachmentSchema = new mongoose.Schema(
  {
    name: {
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

const returnItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Item reference is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative']
    },
    unitCost: {
      type: Number,
      default: 0,
      min: [0, 'Unit cost cannot be negative']
    },
    reason: {
      type: String,
      trim: true
    },
    condition: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const supplierReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: [true, 'Return number is required'],
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
      default: null
    },
    goodsReceipt: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GoodsReceipt',
      default: null
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    items: {
      type: [returnItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Supplier return must contain at least one item'
      }
    },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Returned by employee is required']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    returnDate: {
      type: Date,
      default: Date.now
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: [0, 'Refund amount cannot be negative']
    },
    attachments: [returnAttachmentSchema],
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'returned', 'refunded', 'rejected'],
      default: 'draft',
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

supplierReturnSchema.index({ returnNumber: 1 });
supplierReturnSchema.index({ supplier: 1 });
supplierReturnSchema.index({ warehouse: 1 });
supplierReturnSchema.index({ purchaseOrder: 1 });
supplierReturnSchema.index({ status: 1 });
supplierReturnSchema.index({ returnDate: -1 });

const SupplierReturn = mongoose.model('SupplierReturn', supplierReturnSchema);

export default SupplierReturn;

