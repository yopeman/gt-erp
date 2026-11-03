import mongoose from 'mongoose';

const supplierBankDetailSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      trim: true
    },
    accountHolder: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const supplierDocumentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true
    },
    supplierCode: {
      type: String,
      required: [true, 'Supplier code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    companyName: {
      type: String,
      trim: true
    },
    contactPerson: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    alternativePhone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    tin: {
      type: String,
      trim: true
    },
    businessLicenseNumber: {
      type: String,
      trim: true
    },
    supplierType: {
      type: String,
      enum: ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service provider'],
      trim: true
    },
    suppliedItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InventoryItem'
      }
    ],
    paymentTerms: {
      type: String,
      enum: ['cash', 'credit', 'partial'],
      default: 'cash',
      trim: true
    },
    bankDetails: [supplierBankDetailSchema],
    documents: [supplierDocumentSchema],
    rating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot exceed 5'],
      default: 0
    },
    notes: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blacklisted'],
      default: 'active',
      trim: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

supplierSchema.index({ supplierCode: 1 });
supplierSchema.index({ supplierName: 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ isDeleted: 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;

