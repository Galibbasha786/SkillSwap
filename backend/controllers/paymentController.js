// backend/controllers/paymentController.js

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Session = require('../models/Session');
const { generateUPIQR, generateOrderId, verifyUPIPayment, PLATFORM_UPI_ID } = require('../services/upiService');
const { completeSessionPayment } = require('../utils/walletHelper');

const normalizeId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const assertSessionPayable = (session, userId) => {
  const learnerId = normalizeId(session.learnerId);
  const payerId = normalizeId(userId);

  if (learnerId !== payerId) {
    return 'Only the student can pay for this session';
  }
  if (session.approvalStatus === 'pending') {
    return 'Teacher must approve this booking before payment';
  }
  if (session.approvalStatus === 'declined') {
    return 'Booking was declined by the teacher';
  }
  if (session.paymentStatus === 'completed') {
    return 'Session is already paid';
  }
  if (session.status === 'cancelled') {
    return 'Session was cancelled';
  }
  return null;
};

const recordCompletedPayment = async (session, paymentDetails) => {
  const platformFee = session.platformFee ?? session.totalAmount * 0.1;
  const teacherEarnings = session.teacherEarnings ?? session.totalAmount * 0.9;

  const transaction = await Transaction.create({
    sessionId: session._id,
    learnerId: session.learnerId,
    teacherId: session.teacherId,
    amount: session.totalAmount,
    platformFee,
    teacherEarnings,
    status: 'completed',
    transferStatus: 'completed',
    paidAt: new Date(),
    ...paymentDetails,
  });

  session.paymentStatus = 'completed';
  await session.save();

  await completeSessionPayment(session);

  return transaction;
};

exports.createUPIPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await Session.findById(sessionId)
      .populate('teacherId', 'name email')
      .populate('learnerId', 'name email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const blockReason = assertSessionPayable(session, req.user.id || req.user._id);
    if (blockReason) {
      return res.status(400).json({ success: false, message: blockReason });
    }

    console.log(`⚠️ TEST MODE: Skipping real UPI for session ${sessionId}`);

    res.json({
      success: true,
      message: '⚠️ TEST MODE - Enter any transaction ID after teacher approval to complete booking.',
      testMode: true,
      session: {
        id: session._id,
        title: session.title,
        amount: session.totalAmount,
        teacher: session.teacherId.name,
      },
    });
  } catch (error) {
    console.error('Error creating UPI payment:', error);
    res.status(500).json({ message: 'Failed to create payment', error: error.message });
  }
};

exports.verifyUPIPayment = async (req, res) => {
  try {
    const { transactionId, upiTransactionId } = req.body;

    if (!upiTransactionId || upiTransactionId.trim() === '') {
      return res.status(400).json({ message: 'Please enter a transaction ID' });
    }

    const session = await Session.findById(transactionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const blockReason = assertSessionPayable(session, req.user.id || req.user._id);
    if (blockReason) {
      return res.status(400).json({ success: false, message: blockReason });
    }

    const testTransaction = await recordCompletedPayment(session, {
      paymentMethod: 'upi_qr',
      upiTransactionId: upiTransactionId.trim(),
      testMode: true,
    });

    res.json({
      success: true,
      message: 'Payment verified and session confirmed.',
      testMode: true,
      session: {
        id: session._id,
        title: session.title,
        date: session.date,
        duration: session.duration,
      },
      transaction: testTransaction._id,
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
};

exports.testBookSession = async (req, res) => {
  try {
    const { sessionId, transactionId } = req.body;

    if (!sessionId || !transactionId || transactionId.trim() === '') {
      return res.status(400).json({ message: 'Session ID and Transaction ID are required' });
    }

    const session = await Session.findById(sessionId)
      .populate('teacherId', 'name')
      .populate('learnerId', 'name');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    const blockReason = assertSessionPayable(session, req.user.id || req.user._id);
    if (blockReason) {
      return res.status(400).json({ success: false, message: blockReason });
    }

    const testTransaction = await recordCompletedPayment(session, {
      paymentMethod: 'upi_qr',
      upiTransactionId: transactionId.trim(),
      testMode: true,
    });

    res.json({
      success: true,
      message: 'Session booked successfully. Teacher wallet has been credited.',
      testMode: true,
      session: {
        id: session._id,
        title: session.title,
        teacher: session.teacherId.name,
        date: session.date,
        duration: session.duration,
      },
      transactionId: testTransaction._id,
    });
  } catch (error) {
    console.error('Error booking session in test mode:', error);
    res.status(500).json({ message: 'Failed to book session: ' + error.message });
  }
};
