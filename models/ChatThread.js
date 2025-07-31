const mongoose = require('mongoose');

const chatThreadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['global', 'event', 'user-created', 'private'],
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  }],
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage',
    default: null
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
chatThreadSchema.index({ type: 1, isActive: 1, lastActivity: -1 });
chatThreadSchema.index({ 'participants.user': 1 });
chatThreadSchema.index({ eventId: 1 });

// Virtual for unread message count per user
chatThreadSchema.virtual('unreadCount').get(function() {
  return this._unreadCount || 0;
});

chatThreadSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('ChatThread', chatThreadSchema);
