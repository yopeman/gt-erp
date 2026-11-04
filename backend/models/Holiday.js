import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Holiday title is required'],
      trim: true
    },
    date: {
      type: Date,
      required: [true, 'Holiday date is required']
    },
    isRecurringYearly: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

holidaySchema.index({ date: 1 });

const Holiday = mongoose.model('Holiday', holidaySchema);

export default Holiday;

