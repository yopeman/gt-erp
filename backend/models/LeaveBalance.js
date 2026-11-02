import mongoose from 'mongoose';

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
      enum: ['annual', 'sick', 'emergency', 'holiday', 'casual'],
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
    total: {
      type: Number,
      default: 0,
      min: [0, 'Total leave cannot be negative']
    },
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

