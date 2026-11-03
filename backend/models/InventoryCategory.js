import mongoose from 'mongoose';

const inventoryCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryCategory',
      default: null
    },
    categoryType: {
      type: String,
      enum: [
        'raw material',
        'finished product',
        'spare part',
        'office supply',
        'consumable',
        'fixed asset'
      ],
      required: [true, 'Category type is required'],
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

inventoryCategorySchema.index({ name: 1 });
inventoryCategorySchema.index({ categoryType: 1 });
inventoryCategorySchema.index({ parentCategory: 1 });
inventoryCategorySchema.index({ isDeleted: 1 });

const InventoryCategory = mongoose.model('InventoryCategory', inventoryCategorySchema);

export default InventoryCategory;

