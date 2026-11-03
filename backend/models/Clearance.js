import mongoose from 'mongoose';

const clearanceChecklistItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Checklist item title is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'cleared', 'rejected'],
      default: 'pending'
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const clearanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    reason: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'approved', 'rejected'],
      default: 'pending'
    },
    checklist: [clearanceChecklistItemSchema],
    finalApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Clearance = mongoose.model('Clearance', clearanceSchema);

export default Clearance;

