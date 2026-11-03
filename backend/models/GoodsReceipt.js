import mongoose from 'mongoose';

const grnAttachmentSchema = new mongoose.Schema(
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

const goodsReceiptItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Item reference is required']
    },
    orderedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Ordered quantity cannot be negative']
    },
    previouslyReceivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Previously received quantity cannot be negative']
    },
    receivedQuantity: {
      type: Number,
      required: [true, 'Received quantity is required'],
      min: [0, 'Received quantity cannot be negative']
    },
    acceptedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Accepted quantity cannot be negative']
    },
    rejectedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Rejected quantity cannot be negative']
    },
    damagedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Damaged quantity cannot be negative']
    },
    unitCost: {
      type: Number,
      default: 0,
      min: [0, 'Unit cost cannot be negative']
    },
    note: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const goodsReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: [true, 'Receipt number is required'],
      unique: true,
      trim: true
    },
    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'Purchase order reference is required']
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
      type: [goodsReceiptItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Goods receipt must contain at least one item'
      }
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Received by employee is required']
    },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    receiptDate: {
      type: Date,
      default: Date.now
    },
    supplierDeliveryNoteNumber: {
      type: String,
      trim: true
    },
    supplierInvoiceNumber: {
      type: String,
      trim: true
    },
    attachments: [grnAttachmentSchema],
    status: {
      type: String,
      enum: ['draft', 'pending inspection', 'accepted', 'partially accepted', 'rejected', 'completed'],
      default: 'draft',
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

goodsReceiptSchema.index({ receiptNumber: 1 });
goodsReceiptSchema.index({ purchaseOrder: 1 });
goodsReceiptSchema.index({ supplier: 1 });
goodsReceiptSchema.index({ warehouse: 1 });
goodsReceiptSchema.index({ status: 1 });
goodsReceiptSchema.index({ receiptDate: -1 });

const GoodsReceipt = mongoose.model('GoodsReceipt', goodsReceiptSchema);

export default GoodsReceipt;

