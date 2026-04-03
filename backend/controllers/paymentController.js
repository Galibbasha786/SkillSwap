// backend/controllers/paymentController.js - Add UPI payment functions

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Session = require('../models/Session');
const { generateUPIQR, generateOrderId, verifyUPIPayment, PLATFORM_UPI_ID } = require('../services/upiService');

// @desc    Create UPI payment for session booking (Test Mode - No Real Payment)
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

    // ⚠️ TEST MODE: Skip real payment, just return test message
    console.log(`⚠️ TEST MODE: Skipping real payment for session ${sessionId}`);
    
    res.json({
      success: true,
      message: '⚠️ TEST MODE - Real-time payment is not active yet. Please enter any transaction ID to proceed.',
      testMode: true,
      session: {
        id: session._id,
        title: session.title,
        amount: session.totalAmount,
        teacher: session.teacherId.name
      }
    });
  } catch (error) {
    console.error('Error creating UPI payment:', error);
    res.status(500).json({ message: 'Failed to create payment', error: error.message });
  }
};

// @desc    Verify payment (Test Mode - Accept Any Transaction ID)
// @route   POST /api/payments/verify-upi-payment
// @access  Private
exports.verifyUPIPayment = async (req, res) => {
  try {
    const { transactionId, upiTransactionId } = req.body;
    
    // ⚠️ TEST MODE: Accept any transaction ID without verification
    if (!upiTransactionId || upiTransactionId.trim() === '') {
      return res.status(400).json({ message: 'Please enter a transaction ID' });
    }

    // Find the session from transactionId or just validate format
    let session = null;
    try {
      session = await Session.findById(transactionId);
    } catch (e) {
      // If not a valid session ID, create a dummy transaction record for testing
    }
    
    if (!session && transactionId) {
      // For test mode, accept any transaction ID
      session = await Session.findOne({ _id: { $exists: true } }).limit(1);
    }

    if (!session) {
      return res.status(404).json({ message: 'No session found' });
    }

    // ⚠️ TEST MODE: Skip wallet updates, just confirm the booking
    console.log(`⚠️ TEST MODE: Confirming session ${session._id} with test transaction ID: ${upiTransactionId}`);
    
    // Update session payment status (for testing only)
    await Session.findByIdAndUpdate(session._id, {
      paymentStatus: 'completed'
    });

    // Create test transaction record (NO WALLET UPDATES)
    const testTransaction = await Transaction.create({
      sessionId: session._id,
      learnerId: session.learnerId,
      teacherId: session.teacherId,
      amount: session.totalAmount || 0,
      status: 'completed',
      upiTransactionId: upiTransactionId,
      paidAt: new Date(),
      testMode: true,
      transferStatus: 'pending_real_payment' // Mark as pending until real payment is enabled
    });

    res.json({
      success: true,
      message: '✅ SESSION BOOKED IN TEST MODE! Real-time payment will be enabled soon. You will be notified.',
      testMode: true,
      session: {
        id: session._id,
        title: session.title,
        date: session.date,
        duration: session.duration
      },
      transaction: testTransaction._id
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
};

// @desc    Book session in test mode (just enter transaction ID, no real payment)
// @route   POST /api/payments/test-book-session
// @access  Private
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

    // ⚠️ TEST MODE: Confirm booking without real payment or wallet updates
    console.log(`⚠️ TEST MODE: Booking session ${sessionId} with test transaction ID: ${transactionId}`);

    await Session.findByIdAndUpdate(sessionId, {
      paymentStatus: 'completed',
      status: 'scheduled'
    });

    // Create test transaction record (NO WALLET UPDATES)
    const testTransaction = await Transaction.create({
      sessionId: session._id,
      learnerId: session.learnerId._id,
      teacherId: session.teacherId._id,
      amount: session.totalAmount || 0,
      status: 'completed',
      upiTransactionId: transactionId,
      paidAt: new Date(),
      testMode: true,
      transferStatus: 'pending_real_payment'
    });

    res.json({
      success: true,
      message: '✅ SESSION BOOKED SUCCESSFULLY IN TEST MODE!\n⚠️ This is a test booking. Real-time payment is not active yet.\n📢 You will be notified when live payments are enabled.',
      testMode: true,
      session: {
        id: session._id,
        title: session.title,
        teacher: session.teacherId.name,
        date: session.date,
        duration: session.duration
      },
      transactionId: testTransaction._id
    });
  } catch (error) {
    console.error('Error booking session in test mode:', error);
    res.status(500).json({ message: 'Failed to book session' });
  }
};