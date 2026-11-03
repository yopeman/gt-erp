import mongoose from 'mongoose';

const inventoryAuditLogSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      default: null
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    action: {
      type: String,
      enum: ['created', 'updated', 'deleted', 'stock changed'],
      required: [true, 'Action is required'],
      trim: true
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    newValues: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    reason: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

inventoryAuditLogSchema.index({ item: 1, warehouse: 1 });
inventoryAuditLogSchema.index({ action: 1 });
inventoryAuditLogSchema.index({ performedBy: 1 });
inventoryAuditLogSchema.index({ createdAt: -1 });

const InventoryAuditLog = mongoose.model('InventoryAuditLog', inventoryAuditLogSchema);

export default InventoryAuditLog;

