import mongoose from 'mongoose';

const wastageItemSchema = new mongoose.Schema(
  {
    materialItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      default: null
    },
    description: {
      type: String,
      required: [true, 'Waste item description is required'],
      trim: true
    },
    quantity: {
      type: Number,
      required: [true, 'Wasted quantity is required'],
      min: [0.01, 'Quantity must be positive']
    },
    unitOfMeasurement: {
      type: String,
      default: 'sheet',
      trim: true
    },
    unitCost: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0
    },
    reason: {
      type: String,
      enum: [
        'setup_spoilage',
        'machine_malfunction',
        'operator_error',
        'defective_raw_material',
        'color_mismatch',
        'plate_defect',
        'cutting_misalignment',
        'other'
      ],
      required: [true, 'Root cause reason is required']
    },
    notes: { type: String, trim: true, default: '' }
  },
  { _id: true }
);

const productionWastageSchema = new mongoose.Schema(
  {
    wastageNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    productionJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionJob',
      required: [true, 'Production job reference is required'],
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Sales order reference is required'],
      index: true
    },
    stageName: {
      type: String,
      required: [true, 'Stage name is required'],
      trim: true
    },
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      default: null
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    wasteCategory: {
      type: String,
      enum: ['raw_material', 'defective_product', 'setup_spoilage'],
      required: [true, 'Waste category is required']
    },
    items: [wastageItemSchema],
    totalWastageCost: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending_review', 'approved', 'rejected'],
      default: 'pending_review',
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    approvedAt: { type: Date, default: null },
    recordedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productionWastageSchema.pre('validate', async function () {
  if (!this.wastageNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('ProductionWastage').countDocuments();
    let code = `WST-${year}-${String(count + 1).padStart(4, '0')}`;
    let exists = await mongoose.model('ProductionWastage').findOne({ wastageNumber: code });
    let increment = 1;
    while (exists) {
      code = `WST-${year}-${String(count + 1 + increment).padStart(4, '0')}`;
      exists = await mongoose.model('ProductionWastage').findOne({ wastageNumber: code });
      increment++;
    }
    this.wastageNumber = code;
  }

  let totalCost = 0;
  if (Array.isArray(this.items)) {
    this.items.forEach((item) => {
      item.totalCost = Number(((item.quantity || 0) * (item.unitCost || 0)).toFixed(2));
      totalCost += item.totalCost;
    });
  }
  this.totalWastageCost = Number(totalCost.toFixed(2));
});

const ProductionWastage = mongoose.model('ProductionWastage', productionWastageSchema);
export default ProductionWastage;

