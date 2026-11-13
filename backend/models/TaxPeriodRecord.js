import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const TaxPeriodRecordSchema = new Schema({
  filingCode: { type: String, required: true, unique: true, uppercase: true, index: true },
  taxPeriod: {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    filingDeadline: { type: Date },
  },
  filingType: {
    type: String,
    required: true,
    enum: ['vat_monthly_return', 'withholding_tax_return', 'payroll_tax_pension_return'],
    index: true,
  },
  vatCalculations: {
    totalTaxableSales: { type: Number, default: 0 },
    outputVatCollected: { type: Number, default: 0 },
    totalTaxablePurchases: { type: Number, default: 0 },
    inputVatPaid: { type: Number, default: 0 },
    netVatPayable: { type: Number, default: 0 },
    carriedForwardCreditUsed: { type: Number, default: 0 },
    finalPayableToMor: { type: Number, default: 0 },
  },
  withholdingCalculations: {
    whtDeductedFromSuppliers: { type: Number, default: 0 },
    whtDeductedByCustomers: { type: Number, default: 0 },
    totalWhtPayable: { type: Number, default: 0 },
  },
  payrollTaxCalculations: {
    totalEmploymentIncomeTax: { type: Number, default: 0 },
    totalEmployeePension7: { type: Number, default: 0 },
    totalEmployerPension11: { type: Number, default: 0 },
    totalPensionPayable18: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: ['accumulating', 'computed', 'approved', 'filed_with_mor', 'settled'],
    default: 'accumulating',
    index: true,
  },
  morDeclarationReceiptNumber: { type: String },
  paymentVoucherRef: { type: Schema.Types.ObjectId, ref: 'ExpenseVoucher' },
  filingDate: { type: Date },
  filedBy: { type: Schema.Types.ObjectId, ref: 'Employee' },
  notes: { type: String },
}, { timestamps: true });

export default model('TaxPeriodRecord', TaxPeriodRecordSchema);

