
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
    ref: 'Skill',
    required: true
  },
  skillName: String,
  
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
  
  // 💰 Payment details
  hourlyRate: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true // hourlyRate * (duration/60)
  },
  platformFee: {
    type: Number,
    default: function() {
      return this.totalAmount * 0.1; // 10% platform fee
    }
  },
  teacherEarnings: {
    type: Number,
    default: function() {
      return this.totalAmount * 0.9; // 90% to teacher
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  
  // Meeting
  meetingLink: String,
  meetingProvider: {
    type: String,
    enum: ['agora', 'jitsi', 'google-meet', 'zoom'],
    default: 'jitsi'
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
  
  // Refund info
  refundReason: String,
  refundedAt: Date
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ teacherId: 1, date: -1 });
sessionSchema.index({ learnerId: 1, date: -1 });
sessionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Session', sessionSchema);
