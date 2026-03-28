// backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');
const {
  getDashboardStats,
  getPendingWithdrawals,
  approveWithdrawal,
  completeWithdrawal,
  rejectWithdrawal,
  getAllUsers,
  updateUserStatus,
  deleteUser,
  getAllTransactions,
  sendNotificationToAll,
  sendWithdrawalMessage,
  getWithdrawalDetails
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(auth, adminAuth);

// Dashboard
router.get('/stats', getDashboardStats);

// Withdrawals
router.get('/withdrawals/pending', getPendingWithdrawals);
router.get('/withdrawals/:id', getWithdrawalDetails);
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/complete', completeWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);
router.post('/withdrawals/:id/message', sendWithdrawalMessage);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Notifications
router.post('/notifications/send-to-all', sendNotificationToAll);

// Transactions
router.get('/transactions', getAllTransactions);

module.exports = router;