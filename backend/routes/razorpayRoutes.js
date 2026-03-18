// backend/routes/razorpayRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  testRazorpay
} = require('../controllers/razorpayController');

// All routes require authentication
router.post('/create-order', auth, createOrder);
router.post('/verify', auth, verifyPayment);
router.post('/test', auth, testRazorpay);

module.exports = router;