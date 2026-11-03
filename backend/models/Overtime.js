import mongoose from 'mongoose';

const overtimeSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    startAt: {
      type: Date,
      required: [true, 'Start date/time is required']
    },
    workedHours: {
      type: Number,
      required: [true, 'Worked hours is required'],
      min: [0, 'Worked hours cannot be negative']
    },
    approvedHours: {
      type: Number,
      default: 0,
      min: [0, 'Approved hours cannot be negative']
    },
    reason: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: ['holiday', 'weekend', 'calendar'],
      default: 'calendar'
    },
    calculationRate: {
      type: Number,
      enum: [1, 1.5, 2],
      default: 1.5
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'partially'],
      default: 'unpaid'
    },
    isPreApproved: {
      type: Boolean,
      default: false
    },
    decisionReason: {
      type: String,
      trim: true,
      default: ''
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Overtime = mongoose.model('Overtime', overtimeSchema);

export default Overtime;

