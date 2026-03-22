// backend/models/ExamAttempt.js

const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  answers: [{
    questionId: String,
    answer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    marksObtained: Number,
    timeSpent: Number // seconds
  }],
  totalMarks: {
    type: Number,
    default: 0
  },
  obtainedMarks: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  passed: {
    type: Boolean,
    default: false
  },
  certificateUrl: String,
  certificateId: String,
  proctoringLogs: [{
    type: {
      type: String,
      enum: ['tab_switch', 'face_missing', 'screenshot', 'window_resize', 'mouse_leave']
    },
    timestamp: Date,
    details: String
  }],
  violations: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'terminated', 'passed', 'failed'],
    default: 'in_progress'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);