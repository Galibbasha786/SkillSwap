// backend/controllers/withdrawalController.js
const Withdrawal = require('../models/Withdrawal');
const User = require('../models/User');
const Notification = require('../models/Notification');

// User requests withdrawal
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod, upiId, bankInfo } = req.body;
    const userId = req.user._id;

    // Check minimum amount
    if (amount < 100) {
      return res.status(400).json({ 
        error: 'Minimum withdrawal amount is ₹100' 
      });
    }

    // Check user wallet balance
    const user = await User.findById(userId);
    if (user.wallet.balance < amount) {
      return res.status(400).json({ 
        error: 'Insufficient wallet balance' 
      });
    }

    // Create withdrawal request
    const withdrawal = new Withdrawal({
      userId,
      amount,
      paymentMethod,
      upiId: paymentMethod === 'upi' ? upiId : undefined,
      bankInfo: paymentMethod === 'bank' ? bankInfo : undefined,
      status: 'pending',
      transferStatus: 'pending'
    });

    await withdrawal.save();

    // Notify admin (create notification for admin)
    await Notification.create({
      title: 'New Withdrawal Request',
      message: `${user.name} requested withdrawal of ₹${amount}`,
      type: 'withdrawal',
      recipientRole: 'admin',
      relatedId: withdrawal._id,
      relatedModel: 'Withdrawal'
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      withdrawal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Admin approves withdrawal (moves to processing)
exports.approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const withdrawal = await Withdrawal.findById(id)
      .populate('userId', 'name email');

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        error: `Cannot approve withdrawal in ${withdrawal.status} status` 
      });
    }

    // Update to processing
    withdrawal.status = 'processing';
    withdrawal.transferStatus = 'processing';
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = req.body.adminNote || 'Approved for payment';

    await withdrawal.save();

    // Notify user that request is approved and being processed
    await Notification.create({
  userId: withdrawal.userId._id,
  title: 'Withdrawal Request Approved',
  message: `Your withdrawal request of ₹${withdrawal.amount} has been approved and is being processed. Funds will be transferred within 24-48 hours.`,
  type: 'withdrawal_processing',  // ✅ Changed from 'withdrawal' to 'withdrawal_processing'
  data: {
    withdrawalId: withdrawal._id,
    amount: withdrawal.amount,
    status: 'processing'
  }
});

    res.json({
      success: true,
      message: 'Withdrawal approved and processing',
      withdrawal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Admin marks withdrawal as completed (success)
exports.completeWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;
    const adminId = req.user._id;

    if (!transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const withdrawal = await Withdrawal.findById(id)
      .populate('userId', 'name email wallet');

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    if (withdrawal.status !== 'processing') {
      return res.status(400).json({ 
        error: `Cannot complete withdrawal in ${withdrawal.status} status` 
      });
    }

    // Update to success/completed
    withdrawal.status = 'success';
    withdrawal.transferStatus = 'completed';
    withdrawal.transactionId = transactionId;
    withdrawal.completedAt = new Date();
    withdrawal.processedBy = adminId;

    await withdrawal.save();

    // DEDUCT from user wallet (if not already deducted)
    const user = await User.findById(withdrawal.userId._id);
    if (user.wallet.balance >= withdrawal.amount) {
      user.wallet.balance -= withdrawal.amount;
      
      // Add to withdrawal history
      user.wallet.withdrawals.push({
        amount: withdrawal.amount,
        status: 'completed',
        withdrawalId: withdrawal._id,
        date: new Date()
      });
      
      await user.save();
    }

    // Send SUCCESS notification to user
    await Notification.create({
  userId: withdrawal.userId._id,
  title: '✅ Withdrawal Successful!',
  message: `Your withdrawal of ₹${withdrawal.amount} has been successfully transferred to your account. Transaction ID: ${transactionId}. Please check your bank account/UPI within 1-2 business days.`,
  type: 'withdrawal_completed',  // ✅ Changed from 'withdrawal_success' to 'withdrawal_completed'
  data: {
    withdrawalId: withdrawal._id,
    amount: withdrawal.amount,
    transactionId: transactionId,
    status: 'completed'
  }
});

    res.json({
      success: true,
      message: 'Withdrawal marked as completed',
      withdrawal
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Admin rejects withdrawal
// backend/controllers/withdrawalController.js
// Update the rejectWithdrawal function to handle status properly

exports.rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const withdrawal = await Withdrawal.findById(id)
      .populate('userId', 'name email');

    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }

    // ✅ FIX: Allow rejection for both 'pending' and 'processing' status
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return res.status(400).json({ 
        error: `Cannot reject withdrawal in ${withdrawal.status} status. Only pending or processing requests can be rejected.` 
      });
    }

    // Update to rejected
    withdrawal.status = 'rejected';
    withdrawal.transferStatus = 'failed';
    withdrawal.rejectionReason = reason;
    withdrawal.processedBy = adminId;
    withdrawal.processedAt = new Date();

    await withdrawal.save();

    // Send REJECTION notification to user
   await Notification.create({
  userId: withdrawal.userId._id,
  title: '❌ Withdrawal Request Rejected',
  message: `Your withdrawal request of ₹${withdrawal.amount} was rejected. Reason: ${reason}. If you have questions, please contact support.`,
  type: 'withdrawal_rejected',  // ✅ This matches your model
  data: {
    withdrawalId: withdrawal._id,
    amount: withdrawal.amount,
    reason: reason,
    status: 'rejected'
  }
});
    res.json({
      success: true,
      message: 'Withdrawal rejected successfully',
      withdrawal
    });

  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin sends custom message to user about withdrawal
// backend/controllers/withdrawalController.js
// Add/update the sendWithdrawalMessage function

exports.sendWithdrawalMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;
    const adminId = req.user._id;

    console.log('Sending message for withdrawal:', id);
    console.log('Message data:', { subject, message });

    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Message content is required' 
      });
    }

    // Find withdrawal with user details
    const withdrawal = await Withdrawal.findById(id)
      .populate('userId', 'name email _id');

    if (!withdrawal) {
      return res.status(404).json({ 
        success: false, 
        message: 'Withdrawal not found' 
      });
    }

    if (!withdrawal.userId) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found for this withdrawal' 
      });
    }

    // Create notification for user
   await Notification.create({
  userId: withdrawal.userId._id,
  title: subject || 'Update on Your Withdrawal Request',
  message: message,
  type: 'withdrawal_message',  // ✅ Add this to your enum
  data: {
    withdrawalId: withdrawal._id,
    amount: withdrawal.amount
  }
});

    console.log('Notification created:', notification);

    res.json({
      success: true,
      message: 'Message sent to user successfully',
      notification
    });

  } catch (error) {
    console.error('Error sending withdrawal message:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to send message'
    });
  }
};

// Get user's withdrawal history
exports.getUserWithdrawals = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const withdrawals = await Withdrawal.find({ userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      withdrawals
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Get pending withdrawals (for admin)
exports.getPendingWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find({ 
      status: { $in: ['pending', 'processing'] } 
    })
    .populate('userId', 'name email profileImage wallet')
    .sort({ createdAt: 1 });

    res.json({
      success: true,
      withdrawals
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};