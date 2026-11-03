import mongoose from 'mongoose';

const movementAttachmentSchema = new mongoose.Schema(
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

const stockMovementSchema = new mongoose.Schema(
  {
    movementNumber: {
      type: String,
      required: [true, 'Movement number is required'],
      unique: true,
      trim: true
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Item reference is required']
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    movementType: {
      type: String,
      enum: [
        'purchase receipt',
        'stock issue',
        'stock transfer in',
        'stock transfer out',
        'adjustment',
        'return',
        'damaged'
      ],
      required: [true, 'Movement type is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required']
    },
    unitCost: {
      type: Number,
      default: 0,
      min: [0, 'Unit cost cannot be negative']
    },
    totalCost: {
      type: Number,
      default: 0,
      min: [0, 'Total cost cannot be negative']
    },
    referenceType: {
      type: String,
      enum: [
        'purchase order',
        'goods receipt',
        'stock transfer',
        'manual adjustment',
        'production order',
        'stock request',
        'supplier return',
        'other'
      ],
      trim: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    reason: {
      type: String,
      trim: true
    },
    note: {
      type: String,
      trim: true
    },
    attachments: [movementAttachmentSchema],
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    movementDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.pre('save', function (next) {
  if (this.quantity && this.unitCost && (!this.totalCost || this.totalCost === 0)) {
    this.totalCost = Math.abs(this.quantity) * this.unitCost;
  }
  next();
});

stockMovementSchema.index({ movementNumber: 1 });
stockMovementSchema.index({ item: 1, warehouse: 1 });
stockMovementSchema.index({ movementType: 1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });
stockMovementSchema.index({ movementDate: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

export default StockMovement;

