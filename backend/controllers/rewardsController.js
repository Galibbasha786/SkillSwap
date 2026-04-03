// backend/controllers/rewardsController.js

const User = require('../models/User');
const Session = require('../models/Session');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

// @desc    Get user rewards balance
// @route   GET /api/rewards/balance
// @access  Private
exports.getRewardsBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('rewards');
    
    res.json({
      success: true,
      balance: user.rewards?.balance || 0,
      totalEarned: user.rewards?.totalEarned || 0,
      totalRedeemed: user.rewards?.totalRedeemed || 0,
      canRedeemFreeSession: (user.rewards?.balance || 0) >= 20
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ message: 'Failed to fetch rewards' });
  }
};

// @desc    Get rewards history
// @route   GET /api/rewards/history
// @access  Private
exports.getRewardsHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('rewards.transactions')
      .populate('rewards.transactions.sessionId', 'title skillName date');
    
    const transactions = user.rewards?.transactions || [];
    transactions.sort((a, b) => b.date - a.date);
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Error fetching rewards history:', error);
    res.status(500).json({ message: 'Failed to fetch rewards history' });
  }
};

// @desc    Add reward to learner (after completed session)
// @route   POST /api/rewards/add
// @access  Private (Called internally)
exports.addRewardToLearner = async (userId, sessionId, description) => {
  try {
    const user = await User.findById(userId);
    
    if (!user.rewards) {
      user.rewards = { balance: 0, totalEarned: 0, totalRedeemed: 0, transactions: [] };
    }
    
    user.rewards.balance += 1;
    user.rewards.totalEarned += 1;
    user.rewards.transactions.push({
      type: 'earned',
      amount: 1,
      description: description || 'Reward earned for completing a session',
      sessionId: sessionId,
      date: new Date()
    });
    
    await user.save();
    
    // Create notification
    await Notification.create({
      userId: userId,
      title: '🎉 Reward Earned!',
      message: `You earned 1 reward point for completing your session. ${user.rewards.balance}/20 points to get a free session!`,
      type: 'reward_earned',
      data: { balance: user.rewards.balance, sessionId }
    });
    
    return { success: true, balance: user.rewards.balance };
  } catch (error) {
    console.error('Error adding reward:', error);
    return { success: false, error: error.message };
  }
};

// @desc    Redeem rewards for free session
// @route   POST /api/rewards/redeem-free-session
// @access  Private
exports.redeemFreeSession = async (req, res) => {
  try {
    const { teacherId, skillId, skillName, title, description, date, duration } = req.body;
    const learnerId = req.user.id;
    
    const learner = await User.findById(learnerId);
    
    // Check if user has enough rewards
    if (!learner.rewards || learner.rewards.balance < 20) {
      return res.status(400).json({ 
        message: `Insufficient rewards. Need 20 rewards, you have ${learner.rewards?.balance || 0}` 
      });
    }
    
    // Get teacher
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Create free session (no payment required)
    const session = await Session.create({
      teacherId,
      learnerId,
      skillId,
      skillName,
      title,
      description,
      date: new Date(date),
      duration: duration || 60,
      hourlyRate: 0,
      totalAmount: 0,
      platformFee: 0,
      teacherEarnings: 0,
      meetLink: `https://meet.jit.si/skillswap-free-${Date.now()}`,
      meetProvider: 'jitsi',
      paymentStatus: 'completed', // Free, no payment needed
      status: 'scheduled',
      isFreeReward: true  // Add this field to track
    });
    
    // Deduct 20 rewards from learner
    learner.rewards.balance -= 20;
    learner.rewards.totalRedeemed += 20;
    learner.rewards.transactions.push({
      type: 'redeemed',
      amount: 20,
      description: `Redeemed 20 rewards for free session: ${title}`,
      sessionId: session._id,
      date: new Date()
    });
    await learner.save();
    
    // Add 10 rewards to teacher as bonus
    if (!teacher.rewards) {
      teacher.rewards = { balance: 0, totalEarned: 0, totalRedeemed: 0, transactions: [] };
    }
    teacher.rewards.balance += 10;
    teacher.rewards.totalEarned += 10;
    teacher.rewards.transactions.push({
      type: 'teacher_bonus',
      amount: 10,
      description: `Bonus rewards for free session booked by ${learner.name}`,
      sessionId: session._id,
      date: new Date()
    });
    await teacher.save();
    
    // Create notifications
    await Notification.create({
      userId: learnerId,
      title: '🎉 Free Session Booked!',
      message: `You successfully redeemed 20 rewards for a free session with ${teacher.name}!`,
      type: 'reward_redeemed',
      data: { sessionId: session._id, rewardsLeft: learner.rewards.balance }
    });
    
    await Notification.create({
      userId: teacherId,
      title: '💰 Bonus Rewards Received!',
      message: `${learner.name} booked a free session using rewards. You received 10 bonus rewards!`,
      type: 'reward_bonus',
      data: { sessionId: session._id, studentName: learner.name }
    });
    
    res.status(201).json({
      success: true,
      message: 'Free session booked successfully!',
      session,
      rewardsLeft: learner.rewards.balance
    });
    
  } catch (error) {
    console.error('Error redeeming free session:', error);
    res.status(500).json({ message: 'Failed to redeem free session' });
  }
};