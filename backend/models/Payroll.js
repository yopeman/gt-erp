import mongoose from 'mongoose';

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    fromDate: {
      type: Date,
      required: [true, 'From date is required']
    },
    toDate: {
      type: Date,
      required: [true, 'To date is required']
    },
    currency: {
      type: String,
      default: 'ETB',
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['paid', 'partially', 'unpaid'],
      default: 'unpaid'
    },
    type: {
      type: String,
      enum: ['salary', 'overtime', 'transport', 'bonus', 'commission'],
      default: 'salary'
    },
    paidAt: {
      type: Date,
      default: null
    },
    totalGross: {
      type: Number,
      default: 0,
      min: [0, 'Total gross cannot be negative']
    },
    totalDeduction: {
      type: Number,
      default: 0,
      min: [0, 'Total deduction cannot be negative']
    },
    totalNet: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;

