// backend/models/Notification.js

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'exam_cancelled',
      'exam_created',
      'exam_updated',
      'session_reminder',
      'certificate_issued',
      'message_received',
      'announcement',
      'platform_update',
      'admin_notification',
      // ✅ Withdrawal related types - ADD THESE
      'withdrawal_requested',
      'withdrawal_processing',
      'withdrawal_completed',
      'withdrawal_rejected',
      'withdrawal_message',
      'withdrawal_success',      // ✅ Add this alias
      'withdrawal_failed',       // ✅ Add this
      'session_cancelled',
       'rating_received',     // ✅ Add this
    'session_completed',
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);