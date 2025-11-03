const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const notificationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => uuidv4(),
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
    },
    type: {
      type: String,
      enum: ['competition_updates', 'winner_announcements', 'new_competitions', 'live_updates', 'system_update'],
      default: 'system_update',
    },
    is_read: {
      type: Boolean,
      default: false,
    },
    user_id: {
      type: String,
      ref: 'User',
      default: null, // null means broadcast notification
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ user_id: 1 });
notificationSchema.index({ is_read: 1 });
notificationSchema.index({ created_at: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

