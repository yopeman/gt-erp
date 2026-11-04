import mongoose from 'mongoose';

const itemAttachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      trim: true
    },
    url: {
      type: String,
      trim: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const inventoryItemSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true
    },
    itemCode: {
      type: String,
      required: [true, 'Item code is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryCategory',
      required: [true, 'Category reference is required']
    },
    itemType: {
      type: String,
      enum: ['raw material', 'finished product', 'spare part', 'consumable', 'fixed asset'],
      required: [true, 'Item type is required'],
      trim: true
    },
    unitOfMeasurement: {
      type: String,
      enum: ['piece', 'kg', 'liter', 'meter', 'box', 'pack', 'roll', 'ream', 'other'],
      required: [true, 'Unit of measurement is required'],
      lowercase: true,
      trim: true
    },
    brand: {
      type: String,
      trim: true
    },
    model: {
      type: String,
      trim: true
    },
    specifications: {
      type: String,
      trim: true
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
    reorderLevel: {
      type: Number,
      default: 0,
      min: [0, 'Reorder level cannot be negative']
    },
    unitCost: {
      type: Number,
      default: 0,
      min: [0, 'Unit cost cannot be negative']
    },
    currency: {
      type: String,
      default: 'ETB',
      uppercase: true,
      trim: true
    },
    preferredSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      default: null
    },
    image: {
      type: String,
      trim: true
    },
    attachments: [itemAttachmentSchema],
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

inventoryItemSchema.index({ itemCode: 1 });
inventoryItemSchema.index({ itemName: 1 });
inventoryItemSchema.index({ category: 1 });
inventoryItemSchema.index({ itemType: 1 });
inventoryItemSchema.index({ preferredSupplier: 1 });
inventoryItemSchema.index({ status: 1 });
inventoryItemSchema.index({ isDeleted: 1 });

const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema);

export default InventoryItem;

