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

const jobApplicationSchema = new mongoose.Schema(
  {
    position: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosition',
      required: [true, 'Position reference is required']
    },
    applyAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'],
      default: 'applied'
    },
    candidate: {
      name: {
        type: String,
        required: [true, 'Candidate name is required'],
        trim: true
      },
      email: {
        type: String,
        required: [true, 'Candidate email is required'],
        lowercase: true,
        trim: true
      },
      phoneNumber: {
        type: String,
        trim: true
      },
      telegramUsername: {
        type: String,
        trim: true
      }
    },
    attachments: [attachmentSchema],
    interview: {
      date: {
        type: Date
      },
      type: {
        type: String,
        enum: ['physical', 'online']
      },
      meetingLink: {
        type: String,
        trim: true
      },
      note: {
        type: String,
        trim: true
      }
    }
  },
  {
    timestamps: true
  }
);

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

export default JobApplication;

