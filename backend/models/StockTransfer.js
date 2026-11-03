import mongoose from 'mongoose';

const transferAttachmentSchema = new mongoose.Schema(
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

const transferItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Item reference is required']
    },
    requestedQuantity: {
      type: Number,
      required: [true, 'Requested quantity is required'],
      min: [0, 'Requested quantity cannot be negative']
    },
    approvedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Approved quantity cannot be negative']
    },
    transferredQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Transferred quantity cannot be negative']
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Received quantity cannot be negative']
    },
    note: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const stockTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: [true, 'Transfer number is required'],
      unique: true,
      trim: true
    },
    sourceWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Source warehouse is required']
    },
    destinationWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Destination warehouse is required']
    },
    items: {
      type: [transferItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Stock transfer must contain at least one item'
      }
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Requested by employee is required']
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'approved',
        'in transit',
        'partially received',
        'completed',
        'rejected',
        'cancelled'
      ],
      default: 'draft',
      trim: true
    },
    transferDate: {
      type: Date,
      default: Date.now
    },
    receivedDate: {
      type: Date,
      default: null
    },
    attachments: [transferAttachmentSchema],
    note: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

stockTransferSchema.index({ transferNumber: 1 });
stockTransferSchema.index({ sourceWarehouse: 1 });
stockTransferSchema.index({ destinationWarehouse: 1 });
stockTransferSchema.index({ status: 1 });
stockTransferSchema.index({ transferDate: -1 });

const StockTransfer = mongoose.model('StockTransfer', stockTransferSchema);

export default StockTransfer;

