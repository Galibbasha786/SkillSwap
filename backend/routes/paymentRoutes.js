// backend/routes/paymentRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createUPIPayment,
  verifyUPIPayment
} = require('../controllers/paymentController');

// UPI Payment routes
router.post('/create-upi-payment', auth, createUPIPayment);
router.post('/verify-upi-payment', auth, verifyUPIPayment);

module.exports = router;