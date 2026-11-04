import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    warehouseName: {
      type: String,
      required: [true, 'Warehouse name is required'],
      trim: true
    },
    warehouseCode: {
      type: String,
      required: [true, 'Warehouse code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    branch: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    contactPerson: {
      type: String,
      trim: true
    },
    phoneNumber: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
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

warehouseSchema.index({ warehouseCode: 1 });
warehouseSchema.index({ status: 1 });
warehouseSchema.index({ isDeleted: 1 });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);

export default Warehouse;

