// backend/controllers/swapController.js

const Session = require('../models/Session');
const User = require('../models/User');
const Match = require('../models/Match');
const Notification = require('../models/Notification');

// Generate Jitsi Meet link
const generateJitsiLink = (sessionId, title) => {
  const roomName = `skillsawp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return `https://meet.jit.si/${roomName}`;
};

// @desc    Create free skill swap session
// @route   POST /api/swaps/create
// @access  Private
exports.createFreeSwap = async (req, res) => {
  try {
    const { partnerId, myTeachSkill, myLearnSkill, date, duration } = req.body;
    const userId = req.user.id;
    
    // Get both users
    const user = await User.findById(userId);
    const partner = await User.findById(partnerId);
    
    if (!user || !partner) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify skills exist
    const userTeaches = user.skillsTeach.some(s => s.name === myTeachSkill);
    const userWantsToLearn = user.skillsLearn.some(s => s.name === myLearnSkill);
    const partnerTeaches = partner.skillsTeach.some(s => s.name === myLearnSkill);
    const partnerWantsToLearn = partner.skillsLearn.some(s => s.name === myTeachSkill);
    
    if (!userTeaches || !userWantsToLearn || !partnerTeaches || !partnerWantsToLearn) {
      return res.status(400).json({ message: 'Skills mismatch' });
    }
    
    // Generate unique meet link for both sessions (same link for both)
    const meetLink = generateJitsiLink(null, `${myTeachSkill} & ${myLearnSkill} Swap`);
    
    // Create session for User teaching Partner (free)
    const session1 = await Session.create({
      teacherId: userId,
      learnerId: partnerId,
      skillName: myTeachSkill,
      title: `Free Skill Swap: ${myTeachSkill}`,
      description: `Free skill swap session. You teach ${myTeachSkill}, ${partner.name} teaches ${myLearnSkill}`,
      date: new Date(date),
      duration: duration || 60,
      hourlyRate: 0,
      totalAmount: 0,
      platformFee: 0,
      teacherEarnings: 0,
      meetLink: meetLink,
      meetProvider: 'jitsi',
      paymentStatus: 'completed',
      status: 'scheduled',
      freeSwap: true,
      partnerContactInfo: {
        name: partner.name,
        email: partner.email,
        phone: partner.phone || '',
        location: partner.location || {}
      }
    });
    
    // Create session for Partner teaching User (free)
    const session2 = await Session.create({
      teacherId: partnerId,
      learnerId: userId,
      skillName: myLearnSkill,
      title: `Free Skill Swap: ${myLearnSkill}`,
      description: `Free skill swap session. You teach ${myLearnSkill}, ${user.name} teaches ${myTeachSkill}`,
      date: new Date(date),
      duration: duration || 60,
      hourlyRate: 0,
      totalAmount: 0,
      platformFee: 0,
      teacherEarnings: 0,
      meetLink: meetLink,
      meetProvider: 'jitsi',
      paymentStatus: 'completed',
      status: 'scheduled',
      freeSwap: true,
      partnerContactInfo: {
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        location: user.location || {}
      }
    });
    
    // Create match record
    const match = await Match.create({
      userA: userId,
      userB: partnerId,
      skillATeach: myTeachSkill,
      skillBTeach: myLearnSkill,
      skillALearn: myLearnSkill,
      skillBLearn: myTeachSkill,
      sessions: [session1._id, session2._id],
      status: 'accepted'
    });
    
    // Notify partner about swap request
    await Notification.create({
      userId: partnerId,
      type: 'swap_request',
      title: 'Free Skill Swap Request! 🤝',
      message: `${user.name} wants to swap skills with you! They'll teach you ${myTeachSkill} and learn ${myLearnSkill} from you.`,
      data: {
        matchId: match._id,
        sessionId: session1._id,
        user: { 
          _id: user._id, 
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          location: user.location || {}
        },
        myTeachSkill,
        myLearnSkill
      }
    });
    
    // Notify current user about confirmed swap
    await Notification.create({
      userId: userId,
      type: 'swap_confirmed',
      title: 'Free Skill Swap Created! 🤝',
      message: `You've scheduled a skill swap with ${partner.name}! Check your sessions.`,
      data: {
        matchId: match._id,
        sessionId: session2._id,
        partner: { 
          _id: partner._id, 
          name: partner.name,
          email: partner.email,
          phone: partner.phone || '',
          location: partner.location || {}
        },
        myTeachSkill,
        myLearnSkill
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Free skill swap created!',
      sessions: [session1, session2],
      match: match,
      meetLink: meetLink
    });
    
  } catch (error) {
    console.error('Error creating free swap:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's pending swaps
// @route   GET /api/swaps/pending
// @access  Private
exports.getPendingSwaps = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ userA: req.user.id }, { userB: req.user.id }],
      status: 'pending'
    })
    .populate('userA', 'name profileImage rating')
    .populate('userB', 'name profileImage rating')
    .sort({ createdAt: -1 });
    
    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's completed swaps
// @route   GET /api/swaps/completed
// @access  Private
exports.getCompletedSwaps = async (req, res) => {
  try {
    const matches = await Match.find({
      $or: [{ userA: req.user.id }, { userB: req.user.id }],
      status: 'completed'
    })
    .populate('userA', 'name profileImage rating')
    .populate('userB', 'name profileImage rating')
    .sort({ completedAt: -1 });
    
    res.json(matches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Accept a swap request
// @route   PUT /api/swaps/:matchId/accept
// @access  Private
exports.acceptSwap = async (req, res) => {
  try {
    const { matchId } = req.params;
    
    const match = await Match.findById(matchId)
      .populate('userA', 'name email')
      .populate('userB', 'name email');
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    if (match.status !== 'pending') {
      return res.status(400).json({ message: 'Swap already processed' });
    }
    
    match.status = 'accepted';
    await match.save();
    
    // Notify the requester that swap was accepted
    await Notification.create({
      userId: match.userA._id,
      type: 'swap_confirmed',
      title: 'Skill Swap Accepted! 🎉',
      message: `${match.userB.name} accepted your skill swap request!`,
      data: {
        matchId: match._id,
        partner: { _id: match.userB._id, name: match.userB.name }
      }
    });
    
    res.json({
      success: true,
      message: 'Swap accepted',
      match
    });
    
  } catch (error) {
    console.error('Error accepting swap:', error);
    res.status(500).json({ message: 'Server error' });
  }
};