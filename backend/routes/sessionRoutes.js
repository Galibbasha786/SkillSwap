
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  rateSession
} = require('../controllers/sessionController');

// Routes
router.post('/', auth, createSession);
router.get('/', auth, getSessions);
router.get('/:id', auth, getSessionById);
router.put('/:id/status', auth, updateSessionStatus);
router.post('/:id/rate', auth, rateSession);

module.exports = router;
