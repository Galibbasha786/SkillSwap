// backend/models/Withdrawal.js
const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 100  // Minimum withdrawal amount
  },
  paymentMethod: {
    type: String,
    enum: ['upi', 'bank'],
    required: true
  },
  upiId: {
    type: String,
    // Required only if paymentMethod is 'upi'
  },
  bankInfo: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountHolderName: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'success', 'rejected'],
    default: 'pending'
  },
  transferStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  transactionId: {
    type: String,  // Admin enters this when payment is sent
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  adminNote: {
    type: String,
    default: null
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'  // Which admin processed this
  },
  processedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
withdrawalSchema.index({ userId: 1, status: 1 });
withdrawalSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);