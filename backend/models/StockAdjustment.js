import mongoose from 'mongoose';

const adjustmentAttachmentSchema = new mongoose.Schema(
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

const stockAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNumber: {
      type: String,
      required: [true, 'Adjustment number is required'],
      unique: true,
      trim: true
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Item reference is required']
    },
    systemQuantity: {
      type: Number,
      required: [true, 'System quantity is required']
    },
    physicalQuantity: {
      type: Number,
      required: [true, 'Physical quantity is required']
    },
    difference: {
      type: Number,
      required: [true, 'Difference is required']
    },
    reason: {
      type: String,
      enum: ['damaged', 'lost', 'expired', 'counting error', 'other'],
      required: [true, 'Reason is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    attachments: [adjustmentAttachmentSchema],
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'requestedByModel',
      required: [true, 'Requested by user or employee is required']
    },
    requestedByModel: {
      type: String,
      enum: ['User', 'Employee'],
      default: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'approvedByModel',
      default: null
    },
    approvedByModel: {
      type: String,
      enum: ['User', 'Employee'],
      default: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
      trim: true
    },
    adjustmentDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

stockAdjustmentSchema.pre('validate', function (next) {
  if (this.systemQuantity !== undefined && this.physicalQuantity !== undefined && this.difference === undefined) {
    this.difference = this.physicalQuantity - this.systemQuantity;
  }
  if (typeof next === 'function') next();
});

stockAdjustmentSchema.index({ adjustmentNumber: 1 });
stockAdjustmentSchema.index({ warehouse: 1 });
stockAdjustmentSchema.index({ item: 1 });
stockAdjustmentSchema.index({ status: 1 });
stockAdjustmentSchema.index({ adjustmentDate: -1 });

const StockAdjustment = mongoose.model('StockAdjustment', stockAdjustmentSchema);

export default StockAdjustment;

