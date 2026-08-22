// backend/routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  respondToBookingRequest,
  cancelSession,
  deleteSession,
  completeSession,
  autoCompleteSession
} = require('../controllers/sessionController');

router.post('/', auth, createSession);
router.get('/', auth, getSessions);
router.get('/:id', auth, getSessionById);
router.put('/:id/status', auth, updateSessionStatus);
router.put('/:id/complete', auth, completeSession);  // ✅ Add this route
router.post('/:id/respond', auth, respondToBookingRequest);
router.post('/:id/cancel', auth, cancelSession);
router.delete('/:id', auth, deleteSession);
router.post('/:id/auto-complete', auth, autoCompleteSession);
module.exports = router;