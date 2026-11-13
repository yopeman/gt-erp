import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Checklist item text is required'],
      trim: true
    },
    completed: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    content: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      enum: ['default', 'yellow', 'amber', 'rose', 'emerald', 'sky', 'blue', 'purple', 'violet', 'orange', 'indigo', 'slate'],
      default: 'default'
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true
    },
    checklist: {
      type: [checklistItemSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// High performance index for personal user notes sorted by pinned and recency
noteSchema.index({ user: 1, isPinned: -1, updatedAt: -1 });

const Note = mongoose.model('Note', noteSchema);

export default Note;

