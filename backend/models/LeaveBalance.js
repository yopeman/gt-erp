import mongoose from 'mongoose';

const adjustmentRecordSchema = new mongoose.Schema(
  {
    adjustment: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adjustedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    year: {
      type: Number,
      required: [true, 'Year is required']
    },
    type: {
      type: String,
      enum: ['annual', 'sick', 'emergency', 'holiday', 'casual', 'maternity', 'paternity', 'unpaid', 'other'],
      required: [true, 'Leave type is required'],
      trim: true
    },
    isPayable: {
      type: Boolean,
      default: false
    },
    remaining: {
      type: Number,
      default: 0,
      min: [0, 'Remaining leave cannot be negative']
    },
    totalUsed: {
      type: Number,
      default: 0,
      min: [0, 'Total used leave cannot be negative']
    },
    carryForward: {
      type: Number,
      default: 0,
      min: 0
    },
    accrued: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total leave cannot be negative']
    },
    adjustmentReason: {
      type: String,
      trim: true,
      default: ''
    },
    lastAdjustedAt: {
      type: Date
    },
    lastAdjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adjustments: [adjustmentRecordSchema],
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

leaveBalanceSchema.index({ employee: 1, year: 1, type: 1 }, { unique: true });

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

export default LeaveBalance;
