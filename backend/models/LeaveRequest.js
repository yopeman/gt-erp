import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
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
    numberOfDays: {
      type: Number,
      default: 1,
      min: [0.5, 'Leave duration must be at least half a day']
    },
    reason: {
      type: String,
      trim: true
    },
    attachments: [attachmentSchema],
    decision: {
      type: String,
      enum: ['pending', 'manager_approved', 'accepted', 'rejected', 'cancelled'],
      default: 'pending'
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    decideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    decideAt: {
      type: Date,
      default: null
    },
    managerReview: {
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      decidedAt: {
        type: Date,
        default: null
      },
      notes: {
        type: String,
        trim: true
      }
    },
    hrReview: {
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      decidedAt: {
        type: Date,
        default: null
      },
      notes: {
        type: String,
        trim: true
      }
    }
  },
  {
    timestamps: true
  }
);

leaveRequestSchema.index({ employee: 1, startDate: 1 });
leaveRequestSchema.index({ decision: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

export default LeaveRequest;
