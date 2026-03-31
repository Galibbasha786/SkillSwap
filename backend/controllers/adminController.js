// backend/controllers/adminController.js

const User = require('../models/User');
const Session = require('../models/Session');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const Exam = require('../models/Exam');
const Certificate = require('../models/Certificate');
const Notification = require('../models/Notification');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalTeachers = await User.countDocuments({ 
      'skillsTeach.0': { $exists: true } 
    });
    const totalStudents = totalUsers - totalTeachers;
    
    const totalSessions = await Session.countDocuments();
    const completedSessions = await Session.countDocuments({ status: 'completed' });
    const pendingSessions = await Session.countDocuments({ status: 'pending' });
    
    const revenueResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;
    
    const withdrawalResult = await Withdrawal.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingWithdrawals = withdrawalResult[0]?.total || 0;
    
    const totalExams = await Exam.countDocuments();
    const totalCertificates = await Certificate.countDocuments();
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTeachers,
        totalStudents,
        totalSessions,
        completedSessions,
        pendingSessions,
        totalRevenue,
        pendingWithdrawals,
        totalExams,
        totalCertificates
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch stats' 
    });
  }
};

// @desc    Get pending withdrawal requests
// @route   GET /api/admin/withdrawals/pending
// @access  Private/Admin
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ 
      status: { $in: ['pending', 'processing'] } 
    })
      .populate('userId', 'name email profileImage wallet')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      withdrawals
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch withdrawals' 
    });
  }
};

// @desc    Get withdrawal details
// @route   GET /api/admin/withdrawals/:id
// @access  Private/Admin
exports.getWithdrawalDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const withdrawal = await Withdrawal.findById(id)
      .populate('userId', 'name email profileImage wallet phoneNumber')
      .populate('processedBy', 'name email');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    res.json({
      success: true,
      withdrawal
    });
  } catch (error) {
    console.error('Error fetching withdrawal details:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch withdrawal details' 
    });
  }
};

// @desc    Approve withdrawal (move to processing)
// @route   POST /api/admin/withdrawals/:id/approve
// @access  Private/Admin
exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    
    const withdrawal = await Withdrawal.findById(id).populate('userId', 'name email');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot approve withdrawal in ${withdrawal.status} status` 
      });
    }
    
    // Update to processing
    withdrawal.status = 'processing';
    withdrawal.transferStatus = 'processing';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = adminNote || 'Approved for payment';
    
    await withdrawal.save();
    
    // Create notification for user
    await Notification.create({
      userId: withdrawal.userId._id,
      title: 'Withdrawal Request Approved',
      message: `Your withdrawal request of ₹${withdrawal.amount} has been approved and is being processed. Funds will be transferred to your ${withdrawal.paymentMethod === 'upi' ? 'UPI ID' : 'bank account'} within 24-48 hours.`,
      type: 'withdrawal_processing',
      data: {
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount,
        status: 'processing'
      }
    });
    
    res.json({
      success: true,
      message: 'Withdrawal approved and is now processing',
      withdrawal
    });
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to approve withdrawal' 
    });
  }
};

// @desc    Complete withdrawal (mark as success)
// @route   POST /api/admin/withdrawals/:id/complete
// @access  Private/Admin
exports.completeWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId, adminNote } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ 
        success: false,
        message: 'Transaction ID is required' 
      });
    }
    
    const withdrawal = await Withdrawal.findById(id).populate('userId', 'name email wallet');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    if (withdrawal.status !== 'processing') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot complete withdrawal in ${withdrawal.status} status` 
      });
    }
    
    // Update to success/completed
    withdrawal.status = 'success';
    withdrawal.transferStatus = 'completed';
    withdrawal.transactionId = transactionId;
    withdrawal.completedAt = new Date();
    if (adminNote) withdrawal.adminNote = adminNote;
    
    await withdrawal.save();
    
    // DEDUCT from user wallet (if not already deducted)
    const user = await User.findById(withdrawal.userId._id);
    if (user.wallet && user.wallet.balance >= withdrawal.amount) {
      user.wallet.balance -= withdrawal.amount;
      
      // Add to withdrawal history
      if (!user.wallet.withdrawals) {
        user.wallet.withdrawals = [];
      }
      user.wallet.withdrawals.push({
        amount: withdrawal.amount,
        status: 'completed',
        withdrawalId: withdrawal._id,
        date: new Date(),
        transactionId: transactionId
      });
      
      await user.save();
    }
    
    // Create success notification for user
    await Notification.create({
      userId: withdrawal.userId._id,
      title: '✅ Withdrawal Successful!',
      message: `Your withdrawal of ₹${withdrawal.amount} has been successfully transferred to your account.\n\nTransaction ID: ${transactionId}\n\nPlease check your ${withdrawal.paymentMethod === 'upi' ? 'UPI app' : 'bank account'} within 1-2 business days.`,
      type: 'withdrawal_completed',
      data: {
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount,
        transactionId: transactionId
      }
    });
    
    res.json({
      success: true,
      message: 'Withdrawal marked as completed',
      withdrawal
    });
  } catch (error) {
    console.error('Error completing withdrawal:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to complete withdrawal' 
    });
  }
};

// @desc    Reject withdrawal
// @route   POST /api/admin/withdrawals/:id/reject
// @access  Private/Admin
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, adminNote } = req.body;
    
    if (!reason) {
      return res.status(400).json({ 
        success: false,
        message: 'Rejection reason is required' 
      });
    }
    
    const withdrawal = await Withdrawal.findById(id).populate('userId', 'name email');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: `Cannot reject withdrawal in ${withdrawal.status} status` 
      });
    }
    
    // Update to rejected
    withdrawal.status = 'rejected';
    withdrawal.transferStatus = 'failed';
    withdrawal.rejectionReason = reason;
    withdrawal.adminNote = adminNote || `Rejected: ${reason}`;
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    
    await withdrawal.save();
    
    // Create rejection notification for user
    await Notification.create({
      userId: withdrawal.userId._id,
      title: '❌ Withdrawal Request Rejected',
      message: `Your withdrawal request of ₹${withdrawal.amount} was rejected.\n\nReason: ${reason}\n\nIf you have questions, please contact support.`,
      type: 'withdrawal_rejected',
      data: {
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount,
        reason: reason
      }
    });
    
    res.json({
      success: true,
      message: 'Withdrawal rejected',
      withdrawal
    });
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to reject withdrawal' 
    });
  }
};

// @desc    Send custom message to user about withdrawal
// @route   POST /api/admin/withdrawals/:id/message
// @access  Private/Admin
exports.sendWithdrawalMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false,
        message: 'Message content is required' 
      });
    }
    
    const withdrawal = await Withdrawal.findById(id).populate('userId', 'name email');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    // Create notification with custom message
    await Notification.create({
      userId: withdrawal.userId._id,
      title: subject || 'Update on Your Withdrawal Request',
      message: message,
      type: 'withdrawal_message',
      data: {
        withdrawalId: withdrawal._id,
        amount: withdrawal.amount
      }
    });
    
    res.json({
      success: true,
      message: 'Message sent to user'
    });
  } catch (error) {
    console.error('Error sending withdrawal message:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send message' 
    });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    if (role && role !== 'all') {
      if (role === 'teacher') {
        query = { 'skillsTeach.0': { $exists: true } };
      } else if (role === 'student') {
        query = { 'skillsTeach.0': { $exists: false } };
      } else {
        query.role = role;
      }
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch users' 
    });
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // ✅ FIXED: Use correct notification type
    await Notification.create({
      userId: user._id,
      title: isActive ? 'Account Activated' : 'Account Suspended',
      message: isActive 
        ? 'Your account has been activated. You can now use all platform features.'
        : 'Your account has been suspended. Please contact support for more information.',
      type: 'account_status',  // ✅ Now this is in the enum
      data: {
        isActive: isActive,
        updatedAt: new Date()
      }
    });
    
    res.json({ 
      success: true, 
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      user 
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update user status' 
    });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    if (user.role === 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Cannot delete admin user' 
      });
    }
    
    await User.findByIdAndDelete(id);
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete user' 
    });
  }
};

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const transactions = await Transaction.find(query)
      .populate('learnerId', 'name email')
      .populate('teacherId', 'name email')
      .populate('sessionId', 'title skillName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transactions' 
    });
  }
};

// @desc    Send notification to all users
// @route   POST /api/admin/notifications/send-to-all
// @access  Private/Admin
exports.sendNotificationToAll = async (req, res) => {
  try {
    const { title, message, type = 'announcement' } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Title and message are required' 
      });
    }
    
    // Get all active users
    const users = await User.find({ isActive: true }).select('_id');
    
    // Create notifications for all users
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      type: type === 'announcement' ? 'announcement' : 'platform_update',
      data: {
        sentByAdmin: true,
        sentAt: new Date()
      }
    }));
    
    await Notification.insertMany(notifications);
    
    res.json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      count: users.length
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send notification' 
    });
  }
};

// ✅ ONE module.exports at the end
module.exports = {
  getDashboardStats: exports.getDashboardStats,
  getPendingWithdrawals: exports.getPendingWithdrawals,
  getWithdrawalDetails: exports.getWithdrawalDetails,
  approveWithdrawal: exports.approveWithdrawal,
  completeWithdrawal: exports.completeWithdrawal,
  rejectWithdrawal: exports.rejectWithdrawal,
  sendWithdrawalMessage: exports.sendWithdrawalMessage,
  getAllUsers: exports.getAllUsers,
  updateUserStatus: exports.updateUserStatus,
  deleteUser: exports.deleteUser,
  getAllTransactions: exports.getAllTransactions,
  sendNotificationToAll: exports.sendNotificationToAll
};