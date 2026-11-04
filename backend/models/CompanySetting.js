import mongoose from 'mongoose';

const officeLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    radiusMeters: {
      type: Number,
      default: 200,
      min: 10
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const companySettingSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'GT ERP Corporation',
      trim: true
    },
    currency: {
      type: String,
      default: 'ETB',
      trim: true
    },
    officeLocations: [officeLocationSchema],
    workSchedule: {
      standardStartTime: {
        type: String,
        default: '09:00'
      },
      standardEndTime: {
        type: String,
        default: '17:00'
      },
      gracePeriodMinutes: {
        type: Number,
        default: 15
      },
      standardDailyHours: {
        type: Number,
        default: 8
      },
      workingDays: {
        type: [Number],
        default: [1, 2, 3, 4, 5] // Monday through Friday (0 = Sunday)
      }
    },
    leaveSettings: {
      annualDaysPerYear: { type: Number, default: 16 },
      sickDaysPerYear: { type: Number, default: 15 },
      emergencyDaysPerYear: { type: Number, default: 5 },
      casualDaysPerYear: { type: Number, default: 3 },
      maternityDays: { type: Number, default: 90 },
      paternityDays: { type: Number, default: 5 },
      requireAttachmentForSickLeave: { type: Boolean, default: true },
      allowNegativeBalance: { type: Boolean, default: false }
    },
    payrollSettings: {
      employeePensionPercent: { type: Number, default: 7 },
      employerPensionPercent: { type: Number, default: 11 },
      overtimeRateRegular: { type: Number, default: 1.5 },
      overtimeRateHoliday: { type: Number, default: 2.0 },
      overtimeRateWeekend: { type: Number, default: 1.5 }
    }
  },
  {
    timestamps: true
  }
);

const CompanySetting = mongoose.model('CompanySetting', companySettingSchema);

export default CompanySetting;

