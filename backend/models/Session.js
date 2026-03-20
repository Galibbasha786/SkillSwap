// backend/models/Session.js

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  },
  skillName: {
    type: String,
    required: true
  },
  
  // Session details
  title: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 30,
    max: 240
  },
  
  // Payment details
  hourlyRate: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: function() {
      return this.totalAmount * 0.1;
    }
  },
  teacherEarnings: {
    type: Number,
    default: function() {
      return this.totalAmount * 0.9;
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  
  // ✅ Google Meet Link
  meetLink: {
    type: String,
    required: true
  },
  meetProvider: {
    type: String,
    enum: ['google-meet', 'jitsi'],
    default: 'google-meet'
  },
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  
  // Ratings
  teacherRating: {
    rating: Number,
    review: String,
    givenAt: Date
  },
  learnerRating: {
    rating: Number,
    review: String,
    givenAt: Date
  },
  
  // Cancellation
  cancellationReason: String,
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ teacherId: 1, date: -1 });
sessionSchema.index({ learnerId: 1, date: -1 });
sessionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Session', sessionSchema);