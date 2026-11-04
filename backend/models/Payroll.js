import mongoose from 'mongoose';

const payrollItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    }
  },
  { _id: true }
);

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    payslipReference: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    year: {
      type: Number
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
    baseSalary: {
      type: Number,
      default: 0,
      min: 0
    },
    workedDays: {
      type: Number,
      default: 30
    },
    overtimeHours: {
      type: Number,
      default: 0,
      min: 0
    },
    overtimeAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    allowances: {
      transport: { type: Number, default: 0 },
      housing: { type: Number, default: 0 },
      bonus: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    deductions: {
      incomeTax: { type: Number, default: 0 },
      pensionEmployee: { type: Number, default: 0 },
      unpaidLeave: { type: Number, default: 0 },
      loanOrAdvance: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    },
    employerContributions: {
      pensionEmployer: { type: Number, default: 0 }
    },
    overtimeRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Overtime'
      }
    ],
    leaveRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LeaveRequest'
      }
    ],
    earnings: [payrollItemSchema],
    deductions: [payrollItemSchema],
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
    },
    paymentMethod: {
      type: String,
      enum: ['bank_transfer', 'cash', 'cheque', 'telebirr'],
      default: 'bank_transfer'
    },
    bankDetails: {
      bankName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      holderName: { type: String, trim: true }
    },
    type: {
      type: String,
      enum: ['salary', 'overtime', 'transport', 'bonus', 'commission'],
      default: 'salary'
    },
    status: {
      type: String,
      enum: ['paid', 'partially', 'unpaid', 'cancelled'],
      default: 'unpaid'
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
    paidAt: {
      type: Date,
      default: null
    },
    remarks: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

payrollSchema.index({ employeeId: 1, month: 1, year: 1 });
payrollSchema.index({ status: 1 });

const Payroll = mongoose.model('Payroll', payrollSchema);

export default Payroll;
