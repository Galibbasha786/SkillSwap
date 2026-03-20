// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const { register, login, getMe, googleLogin } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Public routes
router.post('/google', googleLogin);
router.post('/register', register);
router.post('/login', login);

// Private route
router.get('/me', auth, getMe);

module.exports = router;