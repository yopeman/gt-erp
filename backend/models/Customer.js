import mongoose from 'mongoose';

const contactPersonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Contact person name is required'],
      trim: true
    },
    position: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      required: [true, 'Contact person phone is required'],
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const customerCustomAttributeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    type: {
      type: String,
      enum: ['text', 'file', 'number', 'date'],
      default: 'text'
    },
    value: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const customerSchema = new mongoose.Schema(
  {
    customerNumber: {
      type: String,
      required: [true, 'Customer number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Customer/Company name is required'],
      trim: true
    },
    companyName: {
      type: String,
      trim: true,
      default: ''
    },
    category: {
      type: String,
      enum: ['individual', 'company', 'government', 'corporation', 'ngo'],
      default: 'company',
      index: true
    },
    tinNumber: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    vatNumber: {
      type: String,
      trim: true,
      default: ''
    },
    contactPersons: [contactPersonSchema],
    billingAddress: {
      street: { type: String, trim: true, default: '' },
      subCity: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: 'Addis Ababa' },
      country: { type: String, trim: true, default: 'Ethiopia' }
    },
    shippingAddress: {
      street: { type: String, trim: true, default: '' },
      subCity: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: 'Addis Ababa' },
      deliveryNotes: { type: String, trim: true, default: '' }
    },
    source: {
      type: String,
      enum: ['lead_conversion', 'direct_walk_in', 'referral', 'tender', 'other'],
      default: 'direct_walk_in'
    },
    creditTerms: {
      allowedCredit: {
        type: Boolean,
        default: false
      },
      creditLimit: {
        type: Number,
        default: 0,
        min: [0, 'Credit limit cannot be negative']
      },
      creditTermDays: {
        type: Number,
        default: 0,
        min: [0, 'Credit term days cannot be negative']
      },
      currentBalance: {
        type: Number,
        default: 0
      }
    },
    assignedSalesRepresentative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    customAttributes: [customerCustomAttributeSchema],
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'blacklisted'],
      default: 'active',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      default: ''
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

customerSchema.index({ name: 'text', companyName: 'text', tinNumber: 'text' });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;

