import mongoose from 'mongoose';

const jobStageSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true,
      default: 1
    },
    stageName: {
      type: String,
      required: true,
      trim: true
    },
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      default: null
    },
    operators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }
    ],
    plannedStartTime: { type: Date, default: null },
    actualStartTime: { type: Date, default: null },
    actualEndTime: { type: Date, default: null },
    hoursRun: { type: Number, default: 0, min: 0 },
    machineCost: { type: Number, default: 0, min: 0 },
    completedQuantity: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'skipped'],
      default: 'pending'
    },
    qcPassed: { type: Boolean, default: false },
    qcInspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    notes: { type: String, trim: true, default: '' }
  },
  { _id: true }
);

const materialConsumedSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true
    },
    plannedQuantity: { type: Number, default: 0 },
    issuedQuantity: { type: Number, default: 0 },
    consumedQuantity: { type: Number, default: 0 },
    returnedQuantity: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    totalMaterialCost: { type: Number, default: 0 }
  },
  { _id: true }
);

const productionJobSchema = new mongoose.Schema(
  {
    jobOrderNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Sales order reference is required'],
      index: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required']
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: [true, 'Service catalog reference is required']
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'medium', 'high', 'urgent'],
      default: 'normal',
      set: (val) => {
        if (!val) return 'normal';
        const v = String(val).toLowerCase().trim();
        return v === 'medium' || v === 'low' ? 'normal' : v;
      }
    },
    targetQuantity: {
      type: Number,
      required: [true, 'Target quantity is required'],
      min: [1, 'Target quantity must be at least 1']
    },
    producedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    defectiveQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    scheduledStartDate: {
      type: Date,
      required: [true, 'Scheduled start date is required']
    },
    scheduledCompletionDate: {
      type: Date,
      required: [true, 'Scheduled completion date is required']
    },
    actualStartDate: { type: Date, default: null },
    actualCompletionDate: { type: Date, default: null },
    stages: [jobStageSchema],
    materialRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StockRequest'
      }
    ],
    actualMaterialsConsumed: [materialConsumedSchema],
    wastageRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductionWastage'
      }
    ],
    costRollup: {
      totalMaterialCost: { type: Number, default: 0 },
      totalMachineCost: { type: Number, default: 0 },
      totalLaborCost: { type: Number, default: 0 },
      totalWastageCost: { type: Number, default: 0 },
      totalActualCost: { type: Number, default: 0 }
    },
    status: {
      type: String,
      enum: ['scheduled', 'prepress', 'in_production', 'finishing', 'qc_check', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    remarks: { type: String, trim: true, default: '' },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Auto-generate jobOrderNumber if not supplied
productionJobSchema.pre('validate', async function () {
  // Normalize priority from Order enum (medium/low) to normal if needed
  if (this.priority) {
    const p = String(this.priority).toLowerCase().trim();
    if (p === 'medium' || p === 'low') {
      this.priority = 'normal';
    }
  }

  if (!this.jobOrderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('ProductionJob').countDocuments();
    let code = `JO-${year}-${String(count + 1).padStart(4, '0')}`;
    let exists = await mongoose.model('ProductionJob').findOne({ jobOrderNumber: code });
    let increment = 1;
    while (exists) {
      code = `JO-${year}-${String(count + 1 + increment).padStart(4, '0')}`;
      exists = await mongoose.model('ProductionJob').findOne({ jobOrderNumber: code });
      increment++;
    }
    this.jobOrderNumber = code;
  }

  // Ensure every stage has a sequence
  if (Array.isArray(this.stages)) {
    this.stages.forEach((stg, idx) => {
      if (stg.sequence === undefined || stg.sequence === null || isNaN(stg.sequence)) {
        stg.sequence = idx + 1;
      }
    });
  }

  // Calculate actualMaterialsConsumed totalMaterialCost
  let materialSum = 0;
  if (Array.isArray(this.actualMaterialsConsumed)) {
    this.actualMaterialsConsumed.forEach((mat) => {
      mat.totalMaterialCost = Number(((mat.consumedQuantity || 0) * (mat.unitCost || 0)).toFixed(2));
      materialSum += mat.totalMaterialCost;
    });
  }

  // Calculate totalMachineCost from stages
  let machineSum = 0;
  if (Array.isArray(this.stages)) {
    this.stages.forEach((stg) => {
      machineSum += stg.machineCost || 0;
    });
  }

  this.costRollup = {
    totalMaterialCost: Number(materialSum.toFixed(2)),
    totalMachineCost: Number(machineSum.toFixed(2)),
    totalLaborCost: Number((this.costRollup?.totalLaborCost || 0).toFixed(2)),
    totalWastageCost: Number((this.costRollup?.totalWastageCost || 0).toFixed(2)),
    totalActualCost: Number(
      (
        materialSum +
        machineSum +
        (this.costRollup?.totalLaborCost || 0) +
        (this.costRollup?.totalWastageCost || 0)
      ).toFixed(2)
    )
  };
});

const ProductionJob = mongoose.model('ProductionJob', productionJobSchema);
export default ProductionJob;

