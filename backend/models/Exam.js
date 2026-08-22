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
      enum: ['mcq', 'theory', 'viva', 'coding'],
      required: true
    },
    question: {
      type: String,
      required: true
    },
    marks: {
      type: Number,
      default: 1
    },
    
    // MCQ fields
    options: [String],
    correctAnswer: String,
    
    // Theory fields
    keywords: [String],
    
    // ✅ CODING ASSESSMENT FIELDS
    coding: {
      programmingLanguage: {
        type: String,
        enum: ['javascript', 'python', 'cpp', 'c'],
        default: 'javascript'
      },
      initialCode: {
        type: String,
        default: '// Write your code here\n'
      },
      solutionCode: {
        type: String,
        default: ''
      },
      functionName: {
        type: String,
        default: 'solve'
      },
      testCases: [{
        input: {
          type: String,
          required: true
        },
        expectedOutput: {
          type: String,
          required: true
        },
        isHidden: {
          type: Boolean,
          default: false
        }
      }],
      timeLimit: {
        type: Number,
        default: 2000 // milliseconds
      },
      memoryLimit: {
        type: Number,
        default: 256 // MB
      }
    }
  }],
  
  // ✅ EXAM ACCESS CONTROL
  accessControl: {
    type: {
      type: String,
      enum: ['all', 'passcode', 'specific'],
      default: 'all'
    },
    passcode: {
      type: String,
      default: null
    },
    allowedEmails: [{
      type: String,
      lowercase: true,
      trim: true
    }]
  },
  
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
  availableFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  availableTo: {
    type: Date,
    required: true
  },
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
  },
  resultsPublished: {
    type: Boolean,
    default: false
  },
  resultsPublishedAt: Date,
  examType: {
    type: String,
    enum: ['certification', 'manual'],
    default: 'certification'
  }
}, {
  timestamps: true
});

// Index for expired exams
examSchema.index({ availableTo: 1, status: 1 });

module.exports = mongoose.model('Exam', examSchema);