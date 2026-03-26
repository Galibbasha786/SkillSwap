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
    min: 50
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Payment method details
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'upi', 'razorpay_payout'],
    required: true
  },
  
  // Bank details
  bankInfo: {
    accountHolder: String,
    bankName: String,
    accountNumber: String,
    ifscCode: String
  },
  
  // UPI details
  upiId: String,
  
  // Processing details
  razorpayPayoutId: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: Date,
  completedAt: Date,
  failureReason: String,
  notes: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);