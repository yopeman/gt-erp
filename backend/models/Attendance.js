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
      address: { type: String, trim: true }
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
    type: {
      type: String,
      enum: ['late', 'absent', 'overtime', 'on time'],
      required: [true, 'Attendance type is required'],
      default: 'on time'
    },
    clockInSelfie: selfieCaptureSchema,
    clockOutSelfie: selfieCaptureSchema,
    selfRecorded: {
      type: Boolean,
      default: true
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

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
