// backend/controllers/razorpayController.js

const Razorpay = require('razorpay');
const Session = require('../models/Session');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const crypto = require('crypto');
const { completeSessionPayment } = require('../utils/walletHelper');

const normalizeId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const assertSessionPayable = (session, userId) => {
  if (normalizeId(session.learnerId) !== normalizeId(userId)) {
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

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} catch (error) {
  console.error('Razorpay initialization failed:', error.message);
}

// @desc    Create Razorpay order
// @route   POST /api/razorpay/create-order
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const blockReason = assertSessionPayable(session, req.user.id || req.user._id);
    if (blockReason) {
      return res.status(400).json({ success: false, message: blockReason });
    }

    if (!razorpay) {
      return res.status(503).json({
        success: false,
        message: 'Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend .env',
      });
    }

    if (!process.env.RAZORPAY_KEY_ID) {
      return res.status(503).json({
        success: false,
        message: 'RAZORPAY_KEY_ID is missing in server configuration',
      });
    }
    
    const amountInPaise = Math.round(Number(session.totalAmount) * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise < 100) {
      return res.status(400).json({
        success: false,
        message: `Invalid session amount (₹${session.totalAmount}). Minimum payment is ₹1.`,
      });
    }
    
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${sessionId.slice(-8)}`,
      notes: {
        sessionId: sessionId.toString(),
        teacherId: session.teacherId.toString(),
        learnerId: session.learnerId.toString(),
        skillName: session.skillName
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating payment order',
      error: error.message 
    });
  }
};

// @desc    Verify and confirm payment
// @route   POST /api/razorpay/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      sessionId 
    } = req.body;
    
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    // Verify signature
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment signature' 
      });
    }
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const existingTxn = await Transaction.findOne({
      razorpayOrderId: razorpay_order_id,
      status: 'completed',
    });
    if (existingTxn || session.paymentStatus === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already verified',
        transaction: existingTxn,
      });
    }

    const blockReason = assertSessionPayable(session, req.user.id || req.user._id);
    if (blockReason) {
      return res.status(400).json({ success: false, message: blockReason });
    }
    
    const transaction = await Transaction.create({
      sessionId: session._id,
      learnerId: session.learnerId,
      teacherId: session.teacherId,
      amount: session.totalAmount,
      platformFee: session.platformFee || session.totalAmount * 0.1,
      teacherEarnings: session.teacherEarnings || session.totalAmount * 0.9,
      status: 'completed',
      transferStatus: 'completed',
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      duration: session.duration / 60,
      hourlyRate: session.hourlyRate,
      paidAt: new Date()
    });
    
    session.paymentStatus = 'completed';
    await session.save();

    await completeSessionPayment(session);
    
    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      transaction 
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error verifying payment',
      error: error.message 
    });
  }
};

// @desc    Test Razorpay connection
// @route   POST /api/razorpay/test
// @access  Private
exports.testRazorpay = async (req, res) => {
  try {
    const order = await razorpay.orders.create({
      amount: 10000, // ₹100
      currency: 'INR',
      receipt: 'test_receipt'
    });
    
    res.json({ 
      success: true, 
      message: 'Razorpay is working!',
      orderId: order.id 
    });
  } catch (error) {
    console.error('Razorpay test failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};