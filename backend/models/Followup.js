import mongoose from 'mongoose';

const followupSchema = new mongoose.Schema(
  {
    followupNumber: {
      type: String,
      required: [true, 'Follow-up number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
      index: true
    },
    type: {
      type: String,
      enum: ['phone_call', 'in_person_meeting', 'email', 'site_visit', 'quotation_followup', 'payment_reminder'],
      default: 'phone_call'
    },
    agenda: {
      type: String,
      required: [true, 'Follow-up agenda is required'],
      trim: true
    },
    scheduledTime: {
      type: Date,
      required: [true, 'Scheduled date and time are required'],
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
      index: true
    },
    result: {
      type: String,
      trim: true,
      default: ''
    },
    nextActionDate: {
      type: Date,
      default: null
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Assigned employee is required'],
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

followupSchema.index({ scheduledTime: 1, status: 1 });

const Followup = mongoose.model('Followup', followupSchema);

export default Followup;

