import mongoose from 'mongoose';

const volumeTierSchema = new mongoose.Schema(
  {
    minQuantity: {
      type: Number,
      required: true,
      min: 1
    },
    maxQuantity: {
      type: Number,
      default: null
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const standardSpecSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    inputType: {
      type: String,
      enum: ['select', 'number', 'text', 'boolean'],
      default: 'select'
    },
    options: {
      type: [String],
      default: []
    },
    isRequired: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const workflowStepTemplateSchema = new mongoose.Schema(
  {
    sequence: {
      type: Number,
      required: true
    },
    stageName: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    estimatedDurationMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    defaultMachineCategory: {
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
        'manual_finishing',
        'other'
      ],
      default: 'other'
    },
    preferredMachine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Machine',
      default: null
    }
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    serviceCode: {
      type: String,
      required: [true, 'Service code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['offset_printing', 'digital_printing', 'large_format', 'packaging', 'finishing_service', 'other'],
      default: 'offset_printing',
      index: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    pricingModel: {
      unitOfMeasurement: {
        type: String,
        enum: ['piece', 'copy', 'sqm', 'sheet', 'pack', 'box', 'roll'],
        default: 'copy'
      },
      basePrice: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Base price cannot be negative']
      },
      minimumOrderQuantity: {
        type: Number,
        default: 1,
        min: 1
      },
      volumeTiers: [volumeTierSchema]
    },
    standardSpecifications: [standardSpecSchema],
    workflowTemplate: [workflowStepTemplateSchema],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

serviceSchema.index({ name: 'text', description: 'text' });

const Service = mongoose.model('Service', serviceSchema);

export default Service;

