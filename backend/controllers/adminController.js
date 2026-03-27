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
    const withdrawals = await Withdrawal.find({ status: 'pending' })
      .populate('userId', 'name email profileImage')
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch withdrawals' 
    });
  }
};

// @desc    Approve withdrawal
// @route   POST /api/admin/withdrawals/:id/approve
// @access  Private/Admin
exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    
    const withdrawal = await Withdrawal.findById(id).populate('userId');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Withdrawal already processed' 
      });
    }
    
    withdrawal.status = 'processing';
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save();
    
    res.json({
      success: true,
      message: 'Withdrawal approved and processing',
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

// @desc    Complete withdrawal
// @route   POST /api/admin/withdrawals/:id/complete
// @access  Private/Admin
exports.completeWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;
    
    const withdrawal = await Withdrawal.findById(id).populate('userId');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    withdrawal.status = 'completed';
    withdrawal.completedAt = new Date();
    withdrawal.transactionId = transactionId;
    await withdrawal.save();
    
    await User.findByIdAndUpdate(withdrawal.userId._id, {
      $inc: { 'wallet.totalWithdrawn': withdrawal.amount }
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
    const { reason } = req.body;
    
    const withdrawal = await Withdrawal.findById(id).populate('userId');
    
    if (!withdrawal) {
      return res.status(404).json({ 
        success: false,
        message: 'Withdrawal not found' 
      });
    }
    
    withdrawal.status = 'failed';
    withdrawal.failureReason = reason;
    withdrawal.processedBy = req.user._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save();
    
    await User.findByIdAndUpdate(withdrawal.userId._id, {
      $inc: { 
        'wallet.balance': withdrawal.amount,
        'wallet.pendingWithdrawals': -withdrawal.amount
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

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    
    let query = {};
    
    if (role) {
      if (role === 'teacher') {
        query = { 'skillsTeach.0': { $exists: true } };
      } else if (role === 'student') {
        query = { 'skillsTeach.0': { $exists: false } };
      } else if (role !== 'all') {
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

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
exports.getAllTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const transactions = await Transaction.find()
      .populate('learnerId', 'name email')
      .populate('teacherId', 'name email')
      .populate('sessionId', 'title skillName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Transaction.countDocuments();
    
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
    
    const users = await User.find({ isActive: true });
    
    const { createNotification } = require('./notificationController');
    
    await Promise.all(
      users.map(async (user) => {
        return await createNotification(
          user._id,
          type === 'announcement' ? 'announcement' : 'platform_update',
          title,
          message,
          { type: 'admin_notification', sentBy: req.user.id }
        );
      })
    );
    
    res.json({
      success: true,
      message: `Notification sent to ${users.length} users`,
      count: users.length
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Failed to send notification' });
  }
};

// @desc    Delete user (admin only)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
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

// ✅ ONLY ONE module.exports at the very end
module.exports = {
  getDashboardStats: exports.getDashboardStats,
  getPendingWithdrawals: exports.getPendingWithdrawals,
  approveWithdrawal: exports.approveWithdrawal,
  completeWithdrawal: exports.completeWithdrawal,
  rejectWithdrawal: exports.rejectWithdrawal,
  getAllUsers: exports.getAllUsers,
  updateUserStatus: exports.updateUserStatus,
  getAllTransactions: exports.getAllTransactions,
  deleteUser: exports.deleteUser,
  sendNotificationToAll: exports.sendNotificationToAll
};