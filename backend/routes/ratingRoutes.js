// backend/routes/ratingRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  rateSession,
  getUserRatings,
  canRateSession
} = require('../controllers/ratingController');

// All rating routes require authentication
router.use(auth);

// Rate a session
router.post('/session/:sessionId', rateSession);

// Check if user can rate a session
router.get('/session/:sessionId/can-rate', canRateSession);

// Get user's ratings (this is public for viewing profiles)
router.get('/user/:userId', getUserRatings);

module.exports = router;