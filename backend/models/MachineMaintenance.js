import mongoose from 'mongoose';

const sparePartUsageSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Spare part item reference is required']
    },
    quantity: {
      type: Number,
      required: [true, 'Spare part quantity is required'],
      min: [0.01, 'Quantity must be positive']
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
    }
  },
  { _id: false }
);

const machineMaintenanceSchema = new mongoose.Schema(
  {
    maintenanceNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    machine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      required: [true, 'Machine reference is required'],
      index: true
    },
    maintenanceType: {
      type: String,
      enum: ['breakdown_repair', 'preventive', 'calibration', 'emergency_repair'],
      required: [true, 'Maintenance type is required']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Reporting employee is required']
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    externalServiceProvider: {
      type: String,
      trim: true,
      default: ''
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    },
    downtimeHours: {
      type: Number,
      default: 0,
      min: 0
    },
    issueDescription: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true
    },
    rootCause: {
      type: String,
      trim: true,
      default: ''
    },
    correctiveActionTaken: {
      type: String,
      trim: true,
      default: ''
    },
    sparePartsUsed: [sparePartUsageSchema],
    technicianLaborCost: {
      type: Number,
      default: 0,
      min: 0
    },
    externalServiceCost: {
      type: Number,
      default: 0,
      min: 0
    },
    totalMaintenanceCost: {
      type: Number,
      default: 0,
      min: 0
    },
    status: {
      type: String,
      enum: ['reported', 'approved', 'in_progress', 'completed', 'cancelled'],
      default: 'reported',
      index: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

machineMaintenanceSchema.pre('validate', async function () {
  if (!this.maintenanceNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('MachineMaintenance').countDocuments();
    let code = `MNT-${year}-${String(count + 1).padStart(4, '0')}`;
    let exists = await mongoose.model('MachineMaintenance').findOne({ maintenanceNumber: code });
    let increment = 1;
    while (exists) {
      code = `MNT-${year}-${String(count + 1 + increment).padStart(4, '0')}`;
      exists = await mongoose.model('MachineMaintenance').findOne({ maintenanceNumber: code });
      increment++;
    }
    this.maintenanceNumber = code;
  }

  // Calculate spare parts total cost and overall maintenance cost
  let spareCost = 0;
  if (Array.isArray(this.sparePartsUsed)) {
    this.sparePartsUsed.forEach(part => {
      part.totalCost = Number(((part.quantity || 0) * (part.unitCost || 0)).toFixed(2));
      spareCost += part.totalCost;
    });
  }
  this.totalMaintenanceCost = Number(
    (spareCost + (this.technicianLaborCost || 0) + (this.externalServiceCost || 0)).toFixed(2)
  );

  // Compute downtimeHours if startedAt and completedAt are present and downtimeHours is 0
  if (this.startedAt && this.completedAt && (!this.downtimeHours || this.downtimeHours === 0)) {
    const diffMs = new Date(this.completedAt) - new Date(this.startedAt);
    if (diffMs > 0) {
      this.downtimeHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    }
  }
});

const MachineMaintenance = mongoose.model('MachineMaintenance', machineMaintenanceSchema);
export default MachineMaintenance;

