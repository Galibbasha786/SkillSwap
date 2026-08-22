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
  getLiveAttempts,
  getExamResults,
  publishExamResults,
  updateAttemptGrade,
  updateExam,
  cancelExam,
  deleteExam,
  verifyExamAccess,
  runCode,
  submitCoding,
  rescheduleExam,
  removeStudentFromExam,
  getPracticeExam,
  submitPractice
} = require('../controllers/examController');

// All routes require authentication
router.use(auth);

router.post('/', createExam);
router.put('/:examId', updateExam);
router.get('/teacher', getTeacherExams);
router.get('/available', getAvailableExams);
router.get('/:examId/practice', getPracticeExam);
router.post('/:examId/practice/submit', submitPractice);
router.get('/:examId/live-attempts', getLiveAttempts);
router.get('/:examId/results', getExamResults);
router.post('/:examId/publish-results', publishExamResults);
router.put('/:examId/attempts/:attemptId/grade', updateAttemptGrade);
router.get('/:examId', getExamById);
router.post('/:examId/start', startExam);
router.post('/:examId/submit', submitAnswer);
router.post('/:examId/finish', finishExam);
router.post('/:examId/violation', recordViolation);
router.post('/:examId/cancel', cancelExam);
router.post('/:examId/reschedule', rescheduleExam);
router.post('/:examId/remove-student/:studentId', removeStudentFromExam);
router.delete('/:examId', deleteExam);
router.post('/:examId/verify-access', verifyExamAccess);
router.post('/:examId/run-code', auth, runCode);
router.post('/:examId/submit-coding', auth, submitCoding);
module.exports = router;