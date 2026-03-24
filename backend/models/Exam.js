// backend/models/Exam.js

const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skillName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  duration: {
    type: Number,
    required: true,
    default: 30
  },
  passingScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 70
  },
  questions: [{
    type: {
      type: String,
      enum: ['mcq', 'theory', 'viva'],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    options: [String],
    correctAnswer: String,
    marks: {
      type: Number,
      default: 1
    },
    keywords: [String]
  }],
  proctoring: {
    enabled: { type: Boolean, default: true },
    faceDetection: { type: Boolean, default: true },
    tabSwitchDetection: { type: Boolean, default: true },
    screenshotDetection: { type: Boolean, default: true },
    allowedAttempts: { type: Number, default: 3 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // ✅ Date Range for exam availability
  availableFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  availableTo: {
    type: Date,
    required: true
  },
  // ✅ Status fields
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'completed'],
    default: 'active'
  },
  cancellationReason: String,
  cancelledAt: Date,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for expired exams
examSchema.index({ availableTo: 1, status: 1 });

module.exports = mongoose.model('Exam', examSchema);