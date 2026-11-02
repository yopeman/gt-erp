import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    type: {
      type: String,
      enum: ['annual', 'sick', 'emergency', 'holiday', 'casual', 'maternity', 'paternity', 'unpaid', 'other'],
      required: [true, 'Leave type is required'],
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    reason: {
      type: String,
      trim: true
    },
    decision: {
      type: String,
      enum: ['pending', 'rejected', 'accepted'],
      default: 'pending'
    },
    decideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decideAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

export default LeaveRequest;

