const Session = require('../models/Session');
const User = require('../models/User');

// @desc    Create a session (learner books a paid session)
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res) => {
  try {
    const { teacherId, skillName, title, description, date, duration } = req.body;
    
    // Get teacher details
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }
    
    // Find the teaching skill and its hourly rate
    const teachingSkill = teacher.skillsTeach.find(s => s.name === skillName);
    if (!teachingSkill) {
      return res.status(400).json({ message: 'Teacher does not offer this skill' });
    }
    
    const hourlyRate = teachingSkill.hourlyRate;
    const totalAmount = (hourlyRate * duration) / 60;
    
    // Create session
    const session = await Session.create({
      teacherId,
      learnerId: req.user.id,
      skillName,
      title,
      description,
      date,
      duration,
      hourlyRate,
      totalAmount,
      meetingLink: `https://meet.jit.si/skillswap-${Date.now()}`,
      paymentStatus: 'pending'
    });
    
    // Populate user details
    await session.populate('teacherId', 'name email profileImage');
    await session.populate('learnerId', 'name email profileImage');
    
    res.status(201).json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user's sessions (both teaching and learning)
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    const { status, role } = req.query;
    
    let query = {};
    
    if (role === 'teaching') {
      query.teacherId = req.user.id;
    } else if (role === 'learning') {
      query.learnerId = req.user.id;
    } else {
      query.$or = [
        { teacherId: req.user.id },
        { learnerId: req.user.id }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    const sessions = await Session.find(query)
      .populate('teacherId', 'name email profileImage')
      .populate('learnerId', 'name email profileImage')
      .sort({ date: -1 });
    
    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update session status
// @route   PUT /api/sessions/:id/status
// @access  Private
exports.updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check authorization
    if (session.teacherId.toString() !== req.user.id && 
        session.learnerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // If session completed, update counts
    if (status === 'completed' && session.status !== 'completed') {
      await User.findByIdAndUpdate(session.teacherId, {
        $inc: { totalSessions: 1 }
      });
      
      // Update teacher's skill session count
      await User.updateOne(
        { 
          _id: session.teacherId,
          'skillsTeach.name': session.skillName 
        },
        { 
          $inc: { 'skillsTeach.$.totalSessions': 1 } 
        }
      );
    }
    
    session.status = status;
    await session.save();
    
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Rate a session
// @route   POST /api/sessions/:id/rate
// @access  Private
exports.rateSession = async (req, res) => {
  try {
    const { rating, review } = req.body;
    
    const session = await Session.findById(req.params.id)
      .populate('teacherId')
      .populate('learnerId');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if session is completed
    if (session.status !== 'completed') {
      return res.status(400).json({ message: 'Can only rate completed sessions' });
    }
    
    // Determine rater and ratee
    if (session.learnerId._id.toString() === req.user.id) {
      // Learner rating teacher
      session.teacherRating = { rating, review, givenAt: new Date() };
      
      // Update teacher's skill rating
      await User.updateOne(
        { 
          _id: session.teacherId._id,
          'skillsTeach.name': session.skillName 
        },
        { 
          $set: { 'skillsTeach.$.rating': rating } 
        }
      );
    } else if (session.teacherId._id.toString() === req.user.id) {
      // Teacher rating learner
      session.learnerRating = { rating, review, givenAt: new Date() };
    } else {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await session.save();
    
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get session by ID
// @route   GET /api/sessions/:id
// @access  Private
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('teacherId', 'name email profileImage skillsTeach')
      .populate('learnerId', 'name email profileImage');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check if user is part of the session
    if (session.teacherId._id.toString() !== req.user.id && 
        session.learnerId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;
