const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Session = require('../models/Session');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');

// @desc    Create payment intent for session
// @route   POST /api/payments/create-payment-intent
// @access  Private
exports.createPaymentIntent = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const session = await Session.findById(sessionId)
      .populate('teacherId')
      .populate('learnerId');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(session.totalAmount * 100), // in cents
      currency: 'usd',
      metadata: {
        sessionId: session._id.toString(),
        teacherId: session.teacherId._id.toString(),
        learnerId: session.learnerId._id.toString()
      },
      receipt_email: session.learnerId.email
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: session.totalAmount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating payment' });
  }
};

// @desc    Confirm payment and create transaction
// @route   POST /api/payments/confirm
// @access  Private
exports.confirmPayment = async (req, res) => {
  try {
    const { sessionId, paymentIntentId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not successful' });
    }
    
    const session = await Session.findById(sessionId);
    
    // Create transaction record
    const transaction = await Transaction.create({
      sessionId: session._id,
      learnerId: session.learnerId,
      teacherId: session.teacherId,
      amount: session.totalAmount,
      platformFee: session.platformFee,
      teacherEarnings: session.teacherEarnings,
      status: 'completed',
      paymentMethod: 'stripe',
      stripePaymentIntentId: paymentIntentId,
      duration: session.duration / 60,
      hourlyRate: session.hourlyRate,
      paidAt: new Date()
    });
    
    // Update session payment status
    session.paymentStatus = 'completed';
    await session.save();
    
    // Update teacher's wallet
    await User.findByIdAndUpdate(session.teacherId, {
      $inc: { 
        'wallet.balance': session.teacherEarnings,
        totalEarnings: session.teacherEarnings
      }
    });
    
    // Update learner's total spent
    await User.findByIdAndUpdate(session.learnerId, {
      $inc: { totalSpent: session.totalAmount }
    });
    
    res.json({ success: true, transaction });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error confirming payment' });
  }
};

// @desc    Get teacher's earnings
// @route   GET /api/payments/earnings
// @access  Private
exports.getEarnings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const transactions = await Transaction.find({ 
      teacherId: req.user.id,
      status: 'completed'
    }).sort('-createdAt');
    
    const totalEarnings = transactions.reduce((sum, t) => sum + t.teacherEarnings, 0);
    const totalSessions = transactions.length;
    const averagePerSession = totalSessions > 0 ? totalEarnings / totalSessions : 0;
    
    // Group by month for chart
    const monthlyEarnings = transactions.reduce((acc, t) => {
      const month = t.createdAt.toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + t.teacherEarnings;
      return acc;
    }, {});
    
    res.json({
      balance: user.wallet.balance,
      totalEarnings,
      totalSessions,
      averagePerSession,
      monthlyEarnings,
      recentTransactions: transactions.slice(0, 10)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching earnings' });
  }
};

// @desc    Request withdrawal
// @route   POST /api/payments/withdraw
// @access  Private
exports.requestWithdrawal = async (req, res) => {
  try {
    const { amount, bankInfo } = req.body;
    
    const user = await User.findById(req.user.id);
    
    // Check minimum withdrawal
    if (amount < (process.env.MINIMUM_WITHDRAWAL || 20)) {
      return res.status(400).json({ 
        message: `Minimum withdrawal amount is $${process.env.MINIMUM_WITHDRAWAL || 20}` 
      });
    }
    
    // Check balance
    if (user.wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    
    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      userId: user._id,
      amount,
      bankInfo,
      status: 'pending'
    });
    
    // Update user's pending withdrawals
    user.wallet.pendingWithdrawals += amount;
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Withdrawal request submitted',
      withdrawal 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error requesting withdrawal' });
  }
};

// @desc    Get transaction history
// @route   GET /api/payments/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { learnerId: req.user.id },
        { teacherId: req.user.id }
      ]
    })
    .populate('learnerId', 'name email')
    .populate('teacherId', 'name email')
    .populate('sessionId')
    .sort('-createdAt');
    
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};
