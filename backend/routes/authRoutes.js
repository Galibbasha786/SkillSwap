// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const { 
  register, login, getMe, googleLogin, 
  sendOTP, verifyOTP, resetPassword, changePassword  // ← Add resetPassword
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);  // ← Add this route
router.post('/change-password', auth, changePassword);
// Private route
router.get('/me', auth, getMe);

module.exports = router;