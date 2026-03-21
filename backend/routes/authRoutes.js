// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const { 
  register, login, getMe, googleLogin, 
  sendOTP, verifyOTP, resetPassword  // ← Add resetPassword
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);  // ← Add this route

// Private route
router.get('/me', auth, getMe);

module.exports = router;