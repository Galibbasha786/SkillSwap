// backend/models/Certificate.js

const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  attemptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamAttempt',
    required: true
  },
  certificateId: {
    type: String,
    unique: true,
    required: true
  },
  studentName: String,
  skillName: String,
  score: Number,
  percentage: Number,
  issueDate: {
    type: Date,
    default: Date.now
  },
  certificateUrl: String,
  qrCode: String,
  verified: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Certificate', certificateSchema);