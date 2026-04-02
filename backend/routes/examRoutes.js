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
  getExamById,
  recordViolation,
  cancelExam,  // ✅ Add this import
  deleteExam,
  verifyExamAccess,
  runCode,
  submitCoding
} = require('../controllers/examController');

// All routes require authentication
router.use(auth);

router.post('/', createExam);
router.get('/teacher', getTeacherExams);
router.get('/available', getAvailableExams);
router.get('/:examId', getExamById);
router.post('/:examId/start', startExam);
router.post('/:examId/submit', submitAnswer);
router.post('/:examId/finish', finishExam);
router.post('/:examId/violation', recordViolation);
router.post('/:examId/cancel', cancelExam);  // ✅ Add cancel route
router.delete('/:examId', deleteExam);
router.post('/:examId/verify-access', verifyExamAccess);
router.post('/:examId/run-code', auth, runCode);
router.post('/:examId/submit-coding', auth, submitCoding);
module.exports = router;