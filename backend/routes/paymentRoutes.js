const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createPaymentIntent,
  confirmPayment,
  getEarnings,
  requestWithdrawal,
  getTransactions,
   testStripe
} = require('../controllers/paymentController');

// Payment routes
router.post('/create-payment-intent', auth, createPaymentIntent);
router.post('/confirm', auth, confirmPayment);
router.get('/earnings', auth, getEarnings);
router.get('/transactions', auth, getTransactions);
router.post('/withdraw', auth, requestWithdrawal);
router.post('/test', auth, testStripe);
module.exports = router;
