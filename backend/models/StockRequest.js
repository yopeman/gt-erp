import mongoose from 'mongoose';

const requestAttachmentSchema = new mongoose.Schema(
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

const stockRequestItemSchema = new mongoose.Schema(
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
    issuedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Issued quantity cannot be negative']
    },
    unitOfMeasurement: {
      type: String,
      trim: true
    },
    note: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const stockRequestSchema = new mongoose.Schema(
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
      required: [true, 'Warehouse reference is required']
    },
    items: {
      type: [stockRequestItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Stock request must contain at least one item'
      }
    },
    purpose: {
      type: String,
      trim: true
    },
    requiredDate: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      trim: true
    },
    status: {
      type: String,
      enum: [
        'draft',
        'pending',
        'approved',
        'partially approved',
        'rejected',
        'partially issued',
        'completed',
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
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    issuedAt: {
      type: Date,
      default: null
    },
    attachments: [requestAttachmentSchema],
    note: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

stockRequestSchema.index({ requestNumber: 1 });
stockRequestSchema.index({ requestedBy: 1 });
stockRequestSchema.index({ warehouse: 1 });
stockRequestSchema.index({ department: 1 });
stockRequestSchema.index({ status: 1 });
stockRequestSchema.index({ priority: 1 });

const StockRequest = mongoose.model('StockRequest', stockRequestSchema);

export default StockRequest;

