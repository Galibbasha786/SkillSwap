// backend/routes/walletRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getWalletBalance,
  transferToTeacher,
  requestWithdrawal,
  getWithdrawals,
  addBankAccount,
  getBankAccount
} = require('../controllers/walletController');

// All wallet routes require authentication
router.get('/balance', auth, getWalletBalance);
router.post('/transfer-to-teacher', auth, transferToTeacher);
router.post('/withdraw', auth, requestWithdrawal);
router.get('/withdrawals', auth, getWithdrawals);
router.post('/add-bank-account', auth, addBankAccount);
router.get('/bank-account', auth, getBankAccount);

module.exports = router;