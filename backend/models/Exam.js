// backend/models/Exam.js

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
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
}, {
  _id: true // Let Mongoose auto-generate _id
});

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
  questions: [questionSchema],
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);