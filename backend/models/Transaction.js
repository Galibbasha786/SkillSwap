// backend/models/Transaction.js

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  platformFee: {
    type: Number,
    default: 0
  },
  teacherEarnings: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'wallet', 'stripe', 'razorpay', 'upi_qr'],
    required: true
  },
  
  // ✅ UPI Payment Fields
  upiId: String,
  upiQRCode: String,
  upiIntentLink: String,
  upiTransactionId: String,
  upiExpiresAt: Date,
  
  // Payment Gateway IDs
  stripePaymentIntentId: String,
  stripeTransferId: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  
  // Transfer tracking
  transferStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transferredAt: Date,
  
  // Session details
  duration: Number,
  hourlyRate: Number,
  skillName: String,
  description: String,
  
  // Timestamps
  paidAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);