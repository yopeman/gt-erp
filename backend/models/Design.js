import mongoose from 'mongoose';

const designVersionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true
    },
    fileUrl: {
      type: String,
      required: [true, 'Artwork file URL is required'],
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: ''
    },
    clientFeedback: {
      type: String,
      trim: true,
      default: ''
    },
    status: {
      type: String,
      enum: ['pending_review', 'client_approved', 'client_rejected'],
      default: 'pending_review'
    },
    approvedByCustomer: {
      type: Boolean,
      default: false
    },
    approvedAt: {
      type: Date,
      default: null
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

const designSchema = new mongoose.Schema(
  {
    designNumber: {
      type: String,
      required: [true, 'Design number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order reference is required'],
      index: true
    },
    assignedDesigner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Assigned designer is required'],
      index: true
    },
    specifications: {
      bleedMm: {
        type: Number,
        default: 3
      },
      colorProfile: {
        type: String,
        enum: ['CMYK', 'Pantone', 'RGB'],
        default: 'CMYK'
      },
      resolutionDpi: {
        type: Number,
        default: 300
      },
      orientation: {
        type: String,
        enum: ['portrait', 'landscape', 'square'],
        default: 'portrait'
      }
    },
    versions: [designVersionSchema],
    status: {
      type: String,
      enum: ['in_design', 'proof_submitted', 'revision_requested', 'approved_for_press'],
      default: 'in_design',
      index: true
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const Design = mongoose.model('Design', designSchema);

export default Design;

