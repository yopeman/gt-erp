import mongoose from 'mongoose';

const approvalHistorySchema = new mongoose.Schema(
  {
    referenceType: {
      type: String,
      enum: [
        'purchase request',
        'purchase order',
        'stock request',
        'stock adjustment',
        'stock transfer'
      ],
      required: [true, 'Reference type is required'],
      trim: true
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Reference ID is required']
    },
    action: {
      type: String,
      enum: ['submitted', 'approved', 'rejected', 'returned for correction'],
      required: [true, 'Action is required'],
      trim: true
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Action by employee is required']
    },
    comment: {
      type: String,
      trim: true
    },
    actionDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

approvalHistorySchema.index({ referenceType: 1, referenceId: 1 });
approvalHistorySchema.index({ actionBy: 1 });
approvalHistorySchema.index({ actionDate: -1 });

const ApprovalHistory = mongoose.model('ApprovalHistory', approvalHistorySchema);

export default ApprovalHistory;

