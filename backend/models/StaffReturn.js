import mongoose from 'mongoose';

const staffReturnAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const staffReturnItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Item reference is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Return quantity is required'],
      min: [0.001, 'Quantity must be greater than zero']
    },
    unitOfMeasurement: {
      type: String,
      trim: true
    },
    condition: {
      type: String,
      enum: ['good', 'damaged', 'scrap'],
      default: 'good'
    },
    reason: {
      type: String,
      trim: true,
      default: 'Unused material return'
    },
    acceptedQuantity: {
      type: Number,
      default: 0
    },
    rejectedQuantity: {
      type: Number,
      default: 0
    },
    note: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const staffReturnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: [true, 'Return number is required'],
      unique: true,
      trim: true
    },
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Returned by employee is required']
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
    originalStockRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockRequest',
      default: null
    },
    jobReference: {
      type: String,
      trim: true
    },
    items: {
      type: [staffReturnItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: 'Material return must contain at least one item'
      }
    },
    reason: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'partially received', 'rejected'],
      default: 'pending'
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    receivedAt: {
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
    },
    attachments: [staffReturnAttachmentSchema]
  },
  {
    timestamps: true
  }
);

staffReturnSchema.index({ returnNumber: 1 });
staffReturnSchema.index({ returnedBy: 1 });
staffReturnSchema.index({ warehouse: 1 });
staffReturnSchema.index({ status: 1 });
staffReturnSchema.index({ createdAt: -1 });

const StaffReturn = mongoose.model('StaffReturn', staffReturnSchema);

export default StaffReturn;

