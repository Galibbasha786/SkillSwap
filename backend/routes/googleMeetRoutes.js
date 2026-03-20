// backend/routes/googleMeetRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { createMeetLink } = require('../controllers/googleMeetController');

// Create a real Google Meet link
router.post('/create', auth, createMeetLink);

module.exports = router;