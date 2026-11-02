import mongoose from 'mongoose';

const internshipSchema = new mongoose.Schema(
  {
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Supervisor reference is required']
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Intern employee reference is required']
    },
    type: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid'
    },
    department: {
      type: String,
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
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'terminated'],
      default: 'ongoing'
    }
  },
  {
    timestamps: true
  }
);

const Internship = mongoose.model('Internship', internshipSchema);

export default Internship;

