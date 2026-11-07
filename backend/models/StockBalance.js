import mongoose from 'mongoose';

const stockBalanceSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: [true, 'Inventory item reference is required']
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'Warehouse reference is required']
    },
    quantityOnHand: {
      type: Number,
      default: 0,
      min: [0, 'Quantity on hand cannot be negative']
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved quantity cannot be negative']
    },
    availableQuantity: {
      type: Number,
      default: 0
    },
    damagedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Damaged quantity cannot be negative']
    },
    minimumStockLevel: {
      type: Number,
      default: 0,
      min: [0, 'Minimum stock level cannot be negative']
    },
    maximumStockLevel: {
      type: Number,
      default: 0,
      min: [0, 'Maximum stock level cannot be negative']
    },
    lastStockMovementAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Calculate available quantity before save: Available Quantity = Quantity on Hand - Reserved Quantity
stockBalanceSchema.pre('save', function (next) {
  this.availableQuantity = (this.quantityOnHand || 0) - (this.reservedQuantity || 0);
  if (typeof next === 'function') next();
});

// Compound unique index for item + warehouse
stockBalanceSchema.index({ item: 1, warehouse: 1 }, { unique: true });
stockBalanceSchema.index({ warehouse: 1 });
stockBalanceSchema.index({ item: 1 });

const StockBalance = mongoose.model('StockBalance', stockBalanceSchema);

export default StockBalance;

