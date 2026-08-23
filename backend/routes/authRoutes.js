// backend/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  googleLogin,
  sendOTP,
  verifyOTP,
  resetPassword,
  changePassword,
  githubAuth,
  githubCallback,
  linkedinAuth,
  linkedinCallback,
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { captchaMiddleware } = require('../middleware/captcha');

router.post('/register', register);
router.post('/login', captchaMiddleware, login);
router.post('/google', googleLogin);
router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);
router.get('/linkedin', linkedinAuth);
router.get('/linkedin/callback', linkedinCallback);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/change-password', auth, changePassword);
router.get('/me', auth, getMe);

module.exports = router;
