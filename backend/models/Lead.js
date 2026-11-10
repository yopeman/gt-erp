import mongoose from 'mongoose';

const discussionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now
    },
    agenda: {
      type: String,
      trim: true
    },
    summary: {
      type: String,
      required: [true, 'Discussion summary is required'],
      trim: true
    },
    nextFollowupDate: {
      type: Date,
      default: null
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    }
  },
  { _id: true }
);

const leadSchema = new mongoose.Schema(
  {
    leadNumber: {
      type: String,
      required: [true, 'Lead number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    source: {
      type: String,
      enum: ['walk_in', 'social_media', 'referral', 'website', 'tender', 'exhibition', 'phone_inquiry', 'other'],
      default: 'walk_in'
    },
    category: {
      type: String,
      enum: ['individual', 'corporate', 'sme', 'government', 'ngo'],
      default: 'corporate'
    },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'],
      default: 'new',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    estimatedValue: {
      type: Number,
      default: 0,
      min: [0, 'Estimated value cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    requirements: {
      type: String,
      trim: true,
      default: ''
    },
    discussions: [discussionSchema],
    lostReason: {
      type: String,
      trim: true,
      default: ''
    },
    convertedCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null
    },
    convertedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null
    },
    convertedAt: {
      type: Date,
      default: null
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

leadSchema.index({ name: 'text', companyName: 'text', phone: 'text' });

const Lead = mongoose.model('Lead', leadSchema);

export default Lead;

