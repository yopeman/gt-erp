import mongoose from 'mongoose';

const approvalHistorySchema = new mongoose.Schema(
  {
    referenceType: {
      type: String,
      enum: [
        'leave request',
        'overtime',
        'clearance',
        'payroll',
        'job application',
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
      enum: [
        'submitted',
        'approved',
        'rejected',
        'manager_approved',
        'hr_approved',
        'returned for correction',
        'cancelled',
        'cleared',
        'paid'
      ],
      required: [true, 'Action is required'],
      trim: true
    },
    actionBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'actionByModel',
      required: [true, 'Action by user or employee is required']
    },
    actionByModel: {
      type: String,
      enum: ['User', 'Employee'],
      default: 'User'
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
