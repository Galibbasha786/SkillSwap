// backend/controllers/paymentController.js - Add UPI payment functions

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Session = require('../models/Session');
const { generateUPIQR, generateOrderId, verifyUPIPayment, PLATFORM_UPI_ID } = require('../services/upiService');

// @desc    Create UPI payment for session booking (Student pays to Platform)
// @route   POST /api/payments/create-upi-payment
// @access  Private
exports.createUPIPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const session = await Session.findById(sessionId)
      .populate('teacherId', 'name email')
      .populate('learnerId', 'name email');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const orderId = generateOrderId();
    const amount = session.totalAmount;
    
    // Generate UPI QR Code and Intent Link for platform's UPI
    const { upiIntent, qrCode } = await generateUPIQR(
      amount,
      orderId,
      session.learnerId.name,
      session.skillName
    );
    
    // Create transaction record with pending status
    const transaction = await Transaction.create({
      sessionId: session._id,
      learnerId: session.learnerId._id,
      teacherId: session.teacherId._id,
      amount: session.totalAmount,
      platformFee: session.platformFee,
      teacherEarnings: session.teacherEarnings,
      status: 'pending',
      paymentMethod: 'upi_qr',
      upiId: PLATFORM_UPI_ID,
      upiQRCode: qrCode,
      upiIntentLink: upiIntent,
      upiExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes expiry
      duration: session.duration / 60,
      hourlyRate: session.hourlyRate,
      skillName: session.skillName,
      transferStatus: 'pending'
    });
    
    console.log(`💳 UPI payment created for session ${sessionId}: ₹${amount}`);
    
    res.json({
      success: true,
      transaction: {
        id: transaction._id,
        amount: transaction.amount,
        upiId: PLATFORM_UPI_ID,
        upiQRCode: qrCode,
        upiIntentLink: upiIntent,
        expiresAt: transaction.upiExpiresAt
      }
    });
  } catch (error) {
    console.error('Error creating UPI payment:', error);
    res.status(500).json({ message: 'Failed to create payment', error: error.message });
  }
};

// @desc    Verify UPI payment after student pays
// @route   POST /api/payments/verify-upi-payment
// @access  Private
exports.verifyUPIPayment = async (req, res) => {
  try {
    const { transactionId, upiTransactionId } = req.body;
    
    const transaction = await Transaction.findById(transactionId)
      .populate('sessionId');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.status === 'completed') {
      return res.status(400).json({ message: 'Payment already verified' });
    }
    
    if (transaction.upiExpiresAt < new Date()) {
      transaction.status = 'failed';
      await transaction.save();
      return res.status(400).json({ message: 'Payment link expired. Please try again.' });
    }
    
    // Verify payment with UPI (simulate)
    const verification = await verifyUPIPayment(
      upiTransactionId,
      transaction.amount,
      transaction.upiId
    );
    
    if (verification.success) {
      transaction.status = 'completed';
      transaction.upiTransactionId = upiTransactionId;
      transaction.paidAt = new Date();
      await transaction.save();
      
      // Update session payment status
      await Session.findByIdAndUpdate(transaction.sessionId._id, {
        paymentStatus: 'completed'
      });
      
      // Update teacher's wallet (teacher gets 90%)
      const teacher = await User.findById(transaction.teacherId);
      teacher.wallet.balance += transaction.teacherEarnings;
      teacher.totalEarnings += transaction.teacherEarnings;
      teacher.wallet.lastTransactionAt = new Date();
      await teacher.save();
      
      // Update student's total spent
      await User.findByIdAndUpdate(transaction.learnerId, {
        $inc: { totalSpent: transaction.amount }
      });
      
      console.log(`✅ UPI payment verified: ₹${transaction.amount} added to teacher's wallet`);
      
      res.json({
        success: true,
        message: 'Payment verified successfully! Session confirmed.',
        transaction
      });
    } else {
      transaction.status = 'failed';
      await transaction.save();
      res.status(400).json({ message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Error verifying UPI payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
};