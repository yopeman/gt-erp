import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: 'Attachment'
    },
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'document', 'audio', 'video', 'file'],
      default: 'file'
    },
    mimeType: {
      type: String,
      default: ''
    },
    size: {
      type: Number,
      default: 0
    }
  },
  { _id: true }
);

const audioSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: 'audio/webm'
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender reference is required'],
      index: true
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true
    },
    content: {
      type: String,
      trim: true,
      default: ''
    },
    attachments: {
      type: [attachmentSchema],
      default: []
    },
    audio: {
      type: audioSchema,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for fast conversation history & unread queries
messageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
