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
    timeSpent: Number,
    
    // ✅ For coding questions - store detailed results
    codingResults: {
      testResults: [{
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean
      }],
      passedTests: Number,
      totalTests: Number,
      language: String,
      code: String,
      executionTime: Number,
      memoryUsed: Number
    }
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
  
  // Proctoring logs
  proctoringLogs: [{
    type: {
      type: String,
      enum: [
        'tab_switch',
        'face_missing',
        'multiple_faces',
        'screenshot',
        'screenshot_attempt',
        'window_resize',
        'mouse_leave',
        'right_click',
        'copy_attempt',
        'paste_attempt',
        'copy_shortcut',
        'paste_shortcut',
        'print_attempt',
        'fullscreen_exit',
        'camera_denied',
        'devtools_attempt'
      ],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
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

// Indexes
examAttemptSchema.index({ examId: 1, studentId: 1 });
examAttemptSchema.index({ studentId: 1, status: 1 });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);