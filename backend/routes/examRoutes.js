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
  recordViolation
} = require('../controllers/examController');

// Protect all routes
router.use(auth);

router.post('/', createExam);
router.get('/teacher', getTeacherExams);
router.get('/available', getAvailableExams);
router.post('/:examId/start', startExam);
router.post('/:examId/submit', submitAnswer);
router.post('/:examId/finish', finishExam);
router.post('/:examId/violation', recordViolation);

module.exports = router;