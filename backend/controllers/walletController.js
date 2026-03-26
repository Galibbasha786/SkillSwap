// backend/controllers/walletController.js

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');

// @desc    Get wallet balance
// @route   GET /api/wallet/balance
// @access  Private
const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const transactions = await Transaction.find({
      $or: [
        { learnerId: req.user.id },
        { teacherId: req.user.id }
      ],
      status: 'completed'
    })
    .populate('learnerId', 'name')
    .populate('teacherId', 'name')
    .populate('sessionId', 'title skillName')
    .sort({ createdAt: -1 })
    .limit(20);
    
    res.json({
      success: true,
      balance: user.wallet?.balance || 0,
      totalEarnings: user.totalEarnings || 0,
      pendingWithdrawals: user.wallet?.pendingWithdrawals || 0,
      totalWithdrawn: user.wallet?.totalWithdrawn || 0,
      currency: user.wallet?.currency || 'INR',
      recentTransactions: transactions,
      userId: user._id
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({ message: 'Failed to fetch wallet balance' });
  }
};

// @desc    Transfer money to teacher (after session payment)
// @route   POST /api/wallet/transfer-to-teacher
// @access  Private
const transferToTeacher = async (req, res) => {
  try {
    const { sessionId, transactionId } = req.body;
    
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.transferStatus === 'completed') {
      return res.status(400).json({ message: 'Already transferred' });
    }
    
    const teacher = await User.findById(transaction.teacherId);
    teacher.wallet.balance += transaction.teacherEarnings;
    teacher.wallet.lastTransactionAt = new Date();
    teacher.totalEarnings += transaction.teacherEarnings;
    await teacher.save();
    
    transaction.transferStatus = 'completed';
    transaction.transferredAt = new Date();
    await transaction.save();
    
    res.json({
      success: true,
      message: `₹${transaction.teacherEarnings} transferred to teacher's wallet`,
      newBalance: teacher.wallet.balance
    });
  } catch (error) {
    console.error('Error transferring to teacher:', error);
    res.status(500).json({ message: 'Failed to transfer money' });
  }
};

// @desc    Request withdrawal (NO PAYMENT REQUIRED FROM USER)
// @route   POST /api/wallet/withdraw
// @access  Private
const requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod, bankDetails, upiId } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Validation
    if (amount < 50) {
      return res.status(400).json({ message: 'Minimum withdrawal amount is ₹50' });
    }
    
    if (amount > user.wallet.balance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Create withdrawal request (NOT a payment - platform pays the user)
    const withdrawal = await Withdrawal.create({
      userId: user._id,
      amount,
      paymentMethod,
      bankInfo: bankDetails,
      upiId,
      status: 'pending'
    });
    
    // Deduct from wallet balance (money is reserved)
    user.wallet.balance -= amount;
    user.wallet.pendingWithdrawals = (user.wallet.pendingWithdrawals || 0) + amount;
    await user.save();
    
    res.json({
      success: true,
      message: 'Withdrawal request submitted successfully. Funds will be transferred within 24-48 hours.',
      withdrawal: {
        id: withdrawal._id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        createdAt: withdrawal.createdAt
      }
    });
  } catch (error) {
    console.error('Error requesting withdrawal:', error);
    res.status(500).json({ message: 'Failed to request withdrawal' });
  }
};

// @desc    Get withdrawal history
// @route   GET /api/wallet/withdrawals
// @access  Private
const getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Failed to fetch withdrawals' });
  }
};

// @desc    Add bank account details
// @route   POST /api/wallet/add-bank-account
// @access  Private
const addBankAccount = async (req, res) => {
  try {
    const { accountHolderName, bankName, accountNumber, ifscCode, upiId } = req.body;
    
    const user = await User.findById(req.user.id);
    
    user.bankAccount = {
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      isVerified: false
    };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Bank account added successfully. It will be verified within 24 hours.',
      bankAccount: user.bankAccount
    });
  } catch (error) {
    console.error('Error adding bank account:', error);
    res.status(500).json({ message: 'Failed to add bank account' });
  }
};

// @desc    Get bank account details
// @route   GET /api/wallet/bank-account
// @access  Private
const getBankAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.bankAccount || {});
  } catch (error) {
    console.error('Error fetching bank account:', error);
    res.status(500).json({ message: 'Failed to fetch bank account' });
  }
};

// ✅ Export all functions
module.exports = {
  getWalletBalance,
  transferToTeacher,
  requestWithdrawal,
  getWithdrawals,
  addBankAccount,
  getBankAccount
};