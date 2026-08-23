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
      'exam_rescheduled',
      'exam_results_published',
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
      'session_completed',
      'booking_request',
      'booking_request_sent',
      'booking_approved',
      'booking_declined',
      'session_refunded',
      'rating_received',
         'swap_request',      // When someone wants to swap skills
      'swap_confirmed',    // When swap is confirmed
      'swap_completed',     // When swap sessions are completed
      'account_status',
       'reward_earned',      // ✅ Add this
    'reward_redeemed',    // ✅ Add this  
    'reward_bonus'        // ✅ Add this
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