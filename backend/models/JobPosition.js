import mongoose from 'mongoose';

const jobPositionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    requirements: [
      {
        type: String,
        trim: true
      }
    ],
    type: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'open', 'closed'],
      default: 'open'
    },
    postedAt: {
      type: Date,
      default: Date.now
    },
    closingTime: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const JobPosition = mongoose.model('JobPosition', jobPositionSchema);

export default JobPosition;

