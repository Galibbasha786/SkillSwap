// backend/controllers/razorpayController.js

const Razorpay = require('razorpay');
const Session = require('../models/Session');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const crypto = require('crypto');
const { completeSessionPayment } = require('../utils/walletHelper');

// Initialize Razorpay with error handling
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log('✅ Razorpay initialized successfully');
} catch (error) {
  console.error('❌ Razorpay initialization failed:', error.message);
}

// @desc    Create Razorpay order
// @route   POST /api/razorpay/create-order
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { sessionId } = req.body;
    console.log('📦 Creating Razorpay order for session:', sessionId);
    
    const session = await Session.findById(sessionId)
      .populate('teacherId')
      .populate('learnerId');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Teacher must approve this booking before payment',
      });
    }

    if (session.paymentStatus === 'completed') {
      return res.status(400).json({ success: false, message: 'Session is already paid' });
    }
    
    // Convert to paise (Razorpay uses smallest currency unit)
    const amountInPaise = Math.round(session.totalAmount * 100);
    
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${sessionId.slice(-8)}`,
      notes: {
        sessionId: sessionId,
        teacherId: session.teacherId._id.toString(),
        learnerId: session.learnerId._id.toString(),
        skillName: session.skillName
      }
    };
    
    const order = await razorpay.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);
    
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
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
    
    console.log('🔐 Verifying payment:', { razorpay_order_id, razorpay_payment_id });
    
    // Generate signature for verification
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');
    
    // Verify signature
    if (expectedSignature !== razorpay_signature) {
      console.error('❌ Invalid payment signature');
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid payment signature' 
      });
    }
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.approvalStatus === 'pending') {
      return res.status(400).json({ success: false, message: 'Teacher must approve this booking before payment' });
    }
    if (session.approvalStatus === 'declined') {
      return res.status(400).json({ success: false, message: 'Booking was declined' });
    }
    
    const transaction = await Transaction.create({
      sessionId: session._id,
      learnerId: session.learnerId,
      teacherId: session.teacherId,
      amount: session.totalAmount,
      platformFee: session.platformFee || session.totalAmount * 0.1,
      teacherEarnings: session.teacherEarnings || session.totalAmount * 0.9,
      status: 'completed',
      paymentMethod: 'razorpay',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      duration: session.duration / 60,
      hourlyRate: session.hourlyRate,
      paidAt: new Date()
    });
    
    console.log('✅ Transaction created:', transaction._id);
    
    // Update session payment status
    session.paymentStatus = 'completed';
    await session.save();

    await completeSessionPayment(session);
    
    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      transaction 
    });
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
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
    console.log('🧪 Testing Razorpay connection...');
    console.log('Key ID present:', !!process.env.RAZORPAY_KEY_ID);
    console.log('Key Secret present:', !!process.env.RAZORPAY_KEY_SECRET);
    
    const order = await razorpay.orders.create({
      amount: 10000, // ₹100
      currency: 'INR',
      receipt: 'test_receipt'
    });
    
    console.log('✅ Test order created:', order.id);
    
    res.json({ 
      success: true, 
      message: 'Razorpay is working!',
      orderId: order.id 
    });
  } catch (error) {
    console.error('❌ Razorpay test failed:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};