// backend/routes/sessionRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createSession,
  getSessions,
  getSessionById,
  updateSessionStatus,
  cancelSession,
  deleteSession
} = require('../controllers/sessionController');

router.post('/', auth, createSession);
router.get('/', auth, getSessions);
router.get('/:id', auth, getSessionById);
router.put('/:id/status', auth, updateSessionStatus);
router.post('/:id/cancel', auth, cancelSession);
router.delete('/:id', auth, deleteSession);

module.exports = router;