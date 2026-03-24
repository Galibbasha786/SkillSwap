// backend/routes/examRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createExam,
  getTeacherExams,
  getAvailableExams,
  startExam,
  submitAnswer,
  finishExam,
  recordViolation,
  cancelExam,  // ✅ Add this import
  deleteExam
} = require('../controllers/examController');

// All routes require authentication
router.use(auth);

router.post('/', createExam);
router.get('/teacher', getTeacherExams);
router.get('/available', getAvailableExams);
router.post('/:examId/start', startExam);
router.post('/:examId/submit', submitAnswer);
router.post('/:examId/finish', finishExam);
router.post('/:examId/violation', recordViolation);
router.post('/:examId/cancel', cancelExam);  // ✅ Add cancel route
router.delete('/:examId', deleteExam);

module.exports = router;