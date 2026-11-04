import mongoose from 'mongoose';

const selfieCaptureSchema = new mongoose.Schema(
  {
    image: {
      type: String, // base64 data URI or image URL
      trim: true
    },
    capturedAt: {
      type: Date,
      default: Date.now
    },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
      address: { type: String, trim: true },
      accuracy: { type: Number },
      diameter: { type: Number },
      distanceFromOfficeMeters: { type: Number },
      withinGeofence: { type: Boolean, default: true }
    },
    deviceInfo: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee reference is required']
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required']
    },
    startTime: {
      type: Date,
      default: null
    },
    endTime: {
      type: Date,
      default: null
    },
    workedHours: {
      type: Number,
      default: 0,
      min: 0
    },
    type: {
      type: String,
      enum: ['late', 'absent', 'overtime', 'on time'],
      required: [true, 'Attendance type is required'],
      default: 'on time'
    },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'absent', 'on_leave', 'overtime'],
      default: 'present'
    },
    workShift: {
      name: { type: String, default: 'Standard' },
      expectedStartTime: { type: String, default: '09:00' },
      expectedEndTime: { type: String, default: '17:00' }
    },
    clockInSelfie: selfieCaptureSchema,
    clockOutSelfie: selfieCaptureSchema,
    workedHours: {
      type: Number,
      default: 0
    },
    linkedOvertime: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Overtime',
      default: null
    },
    selfRecorded: {
      type: Boolean,
      default: true
    },
    notes: {
      type: String,
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

attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ date: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
