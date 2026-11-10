import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema(
  {
    task: {
      type: String,
      required: [true, 'Checklist task is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pass', 'fail', 'needs_attention'],
      required: [true, 'Item status is required'],
      default: 'pass'
    },
    notes: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

const machineCheckupSchema = new mongoose.Schema(
  {
    checkupNumber: {
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
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: [true, 'Inspection checkup type is required']
    },
    inspectionDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Inspecting employee is required']
    },
    checklistItems: [checklistItemSchema],
    overallStatus: {
      type: String,
      enum: ['passed', 'failed'],
      required: [true, 'Overall status is required']
    },
    triggeredMaintenanceTicket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MachineMaintenance',
      default: null
    },
    remarks: { type: String, trim: true, default: '' },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

machineCheckupSchema.pre('validate', async function () {
  if (!this.checkupNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('MachineCheckup').countDocuments();
    let code = `CHK-${year}-${String(count + 1).padStart(4, '0')}`;
    let exists = await mongoose.model('MachineCheckup').findOne({ checkupNumber: code });
    let increment = 1;
    while (exists) {
      code = `CHK-${year}-${String(count + 1 + increment).padStart(4, '0')}`;
      exists = await mongoose.model('MachineCheckup').findOne({ checkupNumber: code });
      increment++;
    }
    this.checkupNumber = code;
  }
});

const MachineCheckup = mongoose.model('MachineCheckup', machineCheckupSchema);
export default MachineCheckup;

