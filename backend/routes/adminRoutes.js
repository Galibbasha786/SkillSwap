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
  getAllTransactions,
  sendNotificationToAll  // Add this to the import
} = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(auth, adminAuth);

// Dashboard
router.get('/stats', getDashboardStats);

// Withdrawals
router.get('/withdrawals/pending', getPendingWithdrawals);
router.post('/withdrawals/:id/approve', approveWithdrawal);
router.post('/withdrawals/:id/complete', completeWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/status', updateUserStatus);

// Notifications - ✅ FIXED
// backend/routes/adminRoutes.js

router.post('/notifications/send-to-all', auth, adminAuth, sendNotificationToAll);

// Transactions
router.get('/transactions', getAllTransactions);

module.exports = router;