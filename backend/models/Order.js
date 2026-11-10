import mongoose from 'mongoose';

const orderItemSpecSchema = new mongoose.Schema(
  {
    dimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
      unit: { type: String, default: 'mm' }
    },
    pages: { type: Number, default: 1 },
    paperType: { type: String, trim: true, default: '' },
    colorFormat: { type: String, trim: true, default: '4/4 CMYK' },
    finishingOptions: { type: [String], default: [] },
    bindingType: { type: String, trim: true, default: '' },
    customSpecs: [
      {
        name: { type: String, trim: true },
        value: { type: String, trim: true }
      }
    ]
  },
  { _id: false }
);

const estimatedCostSchema = new mongoose.Schema(
  {
    materialCost: { type: Number, default: 0, min: 0 },
    machineCost: { type: Number, default: 0, min: 0 },
    laborCost: { type: Number, default: 0, min: 0 },
    finishingCost: { type: Number, default: 0, min: 0 },
    overheadCost: { type: Number, default: 0, min: 0 },
    totalEstimatedCost: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service reference is required']
    },
    productTitle: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1']
    },
    unitOfMeasurement: {
      type: String,
      default: 'copy'
    },
    specifications: orderItemSpecSchema,
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative']
    },
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: 0
    },
    estimatedCost: estimatedCostSchema
  },
  { _id: true }
);

const actualCostSummarySchema = new mongoose.Schema(
  {
    actualMaterialCost: { type: Number, default: 0 },
    actualMachineCost: { type: Number, default: 0 },
    actualLaborCost: { type: Number, default: 0 },
    actualWastageCost: { type: Number, default: 0 },
    actualFinishingCost: { type: Number, default: 0 },
    totalActualCost: { type: Number, default: 0 },
    grossProfit: { type: Number, default: 0 },
    profitMarginPercentage: { type: Number, default: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required'],
      index: true
    },
    salesRepresentative: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Sales representative is required'],
      index: true
    },
    quotationRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Proforma',
      default: null
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    deliveryDeadline: {
      type: Date,
      required: [true, 'Delivery deadline date is required']
    },
    actualDeliveryDate: {
      type: Date,
      default: null
    },
    items: [orderItemSchema],
    financials: {
      subtotal: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      discountAmount: {
        type: Number,
        default: 0,
        min: 0
      },
      vatRate: {
        type: Number,
        default: 15
      },
      vatAmount: {
        type: Number,
        default: 0,
        min: 0
      },
      grandTotal: {
        type: Number,
        required: true,
        default: 0,
        min: 0
      },
      currency: {
        type: String,
        default: 'ETB',
        uppercase: true
      }
    },
    actualCostSummary: actualCostSummarySchema,
    status: {
      type: String,
      enum: [
        'draft',
        'proforma_issued',
        'confirmed',
        'design_in_progress',
        'design_approved',
        'in_production',
        'finishing',
        'qc_completed',
        'ready_for_delivery',
        'delivered',
        'completed',
        'cancelled'
      ],
      default: 'draft',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'partially_paid', 'paid'],
      default: 'unpaid',
      index: true
    },
    productionJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
      default: null
    },
    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
      default: null
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
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

orderSchema.index({ orderNumber: 'text', notes: 'text' });

const Order = mongoose.model('Order', orderSchema);

export default Order;

