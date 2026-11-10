import mongoose from 'mongoose';

const machineSchema = new mongoose.Schema(
  {
    machineCode: {
      type: String,
      required: [true, 'Machine code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Machine name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: [
        'offset_press',
        'digital_press',
        'large_format_plotter',
        'guillotine_cutter',
        'lamination_machine',
        'die_cutter',
        'folding_machine',
        'binding_machine',
        'packaging_gluer',
        'other'
      ],
      required: [true, 'Machine category is required']
    },
    manufacturer: { type: String, trim: true, default: '' },
    model: { type: String, trim: true, default: '' },
    serialNumber: { type: String, trim: true, sparse: true },
    yearOfManufacture: { type: Number, default: null },
    hourlyCostRate: {
      type: Number,
      required: [true, 'Hourly operational cost rate is required'],
      min: [0, 'Cost rate cannot be negative'],
      default: 0
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    assignedOperators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }
    ],
    status: {
      type: String,
      enum: ['available', 'running', 'maintenance', 'breakdown', 'decommissioned'],
      default: 'available',
      index: true
    },
    specifications: {
      maxSheetWidthMm: { type: Number, default: 0 },
      maxSheetLengthMm: { type: Number, default: 0 },
      maxSpeedPerHour: { type: Number, default: 0 },
      powerRatingKw: { type: Number, default: 0 }
    },
    checklists: {
      daily: [{ type: String, trim: true }],
      weekly: [{ type: String, trim: true }],
      monthly: [{ type: String, trim: true }]
    },
    totalOperatingHours: {
      type: Number,
      default: 0,
      min: 0
    },
    lastMaintenanceDate: { type: Date, default: null },
    nextScheduledMaintenance: { type: Date, default: null },
    notes: { type: String, trim: true, default: '' },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Auto-generate machineCode if not provided
machineSchema.pre('validate', async function () {
  if (!this.machineCode) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Machine').countDocuments();
    const prefix = 'MCH';
    let code = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
    let exists = await mongoose.model('Machine').findOne({ machineCode: code });
    let increment = 1;
    while (exists) {
      code = `${prefix}-${year}-${String(count + 1 + increment).padStart(4, '0')}`;
      exists = await mongoose.model('Machine').findOne({ machineCode: code });
      increment++;
    }
    this.machineCode = code;
  }
});

const Machine = mongoose.model('Machine', machineSchema);
export default Machine;

