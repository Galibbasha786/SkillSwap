// backend/controllers/sessionController.js

const Session = require('../models/Session');
const User = require('../models/User');
const axios = require('axios');
const { createNotification } = require('./notificationController');
// ✅ Generate valid Google Meet link (fallback)
const generateMeetLink = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  
  const part1 = Array(3).fill().map(() => chars[Math.floor(Math.random() * 26)]).join('');
  const part2 = Array(4).fill().map(() => chars[Math.floor(Math.random() * 26)]).join('');
  const part3 = Array(3).fill().map(() => chars[Math.floor(Math.random() * 26)]).join('');
  
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
};

// Helper function to generate real Meet link via API
const generateRealMeetLink = async (sessionId, title, startTime, endTime, authToken) => {
  try {
    console.log('📞 Calling Meet API to generate link for session:', sessionId);
    
    const response = await axios.post(
      'http://localhost:5001/api/meet/create',
      { title, startTime, endTime, sessionId },
      { headers: { 'Authorization': authToken } }
    );
    
    if (response.data.success && response.data.meetLink) {
      console.log('✅ Real Meet link received:', response.data.meetLink);
      return response.data.meetLink;
    }
    return null;
  } catch (error) {
    console.error('❌ Meet API error:', error.response?.data?.error || error.message);
    return null;
  }
};

// @desc    Create session
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res) => {
  try {
    const { teacherId, skillName, title, description, date, duration, hourlyRate } = req.body;
    
    // Validate
    if (!teacherId || !skillName || !title || !date || !duration || !hourlyRate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Get teacher
    const teacher = await User.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    
    // Calculate amounts
    const totalAmount = (hourlyRate * duration) / 60;
    const platformFee = totalAmount * 0.1;
    const teacherEarnings = totalAmount * 0.9;
    
    // Create session with temporary link first
    const session = await Session.create({
      teacherId,
      learnerId: req.user.id,
      skillName,
      title,
      description,
      date: new Date(date),
      duration,
      hourlyRate,
      totalAmount,
      platformFee,
      teacherEarnings,
      meetLink: generateMeetLink(), // Temporary fallback link
      meetProvider: 'google-meet',
      paymentStatus: 'pending',
      status: 'scheduled'
    });
    
    // Try to generate real Meet link (await it to ensure it completes)
    const realLink = await generateRealMeetLink(
      session._id,
      `SkillSwap: ${skillName} with ${teacher.name}`,
      new Date(date).toISOString(),
      new Date(new Date(date).getTime() + duration * 60000).toISOString(),
      req.headers.authorization
    );
    
    if (realLink) {
      session.meetLink = realLink;
      await session.save();
      console.log('✅ Real Meet link saved for session:', session._id);
    } else {
      console.log('⚠️ Using fallback Meet link for session:', session._id);
    }
    
    await session.populate('teacherId', 'name email profileImage');
    await session.populate('learnerId', 'name email profileImage');
    
    res.status(201).json(session);
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ... rest of your functions (getSessions, getSessionById, etc.) remain the same ...

// @desc    Get user's sessions
// @route   GET /api/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    const { status, role, upcoming } = req.query;
    
    let query = {};
    
    if (role === 'teaching') query.teacherId = req.user.id;
    else if (role === 'learning') query.learnerId = req.user.id;
    else query.$or = [{ teacherId: req.user.id }, { learnerId: req.user.id }];
    
    if (status) query.status = status;
    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
      query.status = { $ne: 'cancelled' };
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

// @desc    Get session by ID
// @route   GET /api/sessions/:id
// @access  Private
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('teacherId', 'name email profileImage')
      .populate('learnerId', 'name email profileImage');
    
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
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

// @desc    Update session status
// @route   PUT /api/sessions/:id/status
// @access  Private
exports.updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    if (session.teacherId.toString() !== req.user.id && 
        session.learnerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Update counts if completed
    if (status === 'completed' && session.status !== 'completed') {
      await User.findByIdAndUpdate(session.teacherId, { $inc: { totalSessions: 1 } });
      await User.updateOne(
        { _id: session.teacherId, 'skillsTeach.name': session.skillName },
        { $inc: { 'skillsTeach.$.totalSessions': 1 } }
      );
    }
    
    session.status = status;
    if (status === 'cancelled') session.cancelledAt = new Date();
    
    await session.save();
    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Cancel session with reason
// @route   POST /api/sessions/:id/cancel
// @access  Private
exports.cancelSession = async (req, res) => {
  try {
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason required' });
    }
    
    const session = await Session.findById(req.params.id)
      .populate('teacherId', 'name email')
      .populate('learnerId', 'name email');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Check authorization - only teacher can cancel
    if (session.teacherId._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the teacher can cancel this session' });
    }
    
    // Check if session is in the future
    if (new Date(session.date) < new Date()) {
      return res.status(400).json({ message: 'Cannot cancel past sessions' });
    }
    
    // Check if already cancelled
    if (session.status === 'cancelled') {
      return res.status(400).json({ message: 'Session already cancelled' });
    }
    
    // Update session
    session.status = 'cancelled';
    session.cancellationReason = reason;
    session.cancelledAt = new Date();
    await session.save();
    
    // ✅ Send notification to the student (learner)
    await createNotification(
      session.learnerId._id,
      'session_cancelled',
      `Session Cancelled: ${session.title}`,
      `Your session "${session.title}" with ${session.teacherId.name} has been cancelled. Reason: ${reason}`,
      {
        sessionId: session._id,
        skillName: session.skillName,
        teacherName: session.teacherId.name,
        reason: reason,
        cancelledBy: 'teacher'
      }
    );
    
    // ✅ Also notify the teacher (optional - confirmation)
    await createNotification(
      session.teacherId._id,
      'session_cancelled',
      `You cancelled a session: ${session.title}`,
      `You have cancelled the session with ${session.learnerId.name} for ${session.skillName}.`,
      {
        sessionId: session._id,
        skillName: session.skillName,
        studentName: session.learnerId.name,
        reason: reason
      }
    );
    
    console.log(`📢 Session ${session._id} cancelled. Student ${session.learnerId.email} notified.`);
    
    res.json({ 
      success: true, 
      message: 'Session cancelled successfully',
      session 
    });
  } catch (error) {
    console.error('Error cancelling session:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    if (session.teacherId.toString() !== req.user.id && 
        session.learnerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    if (session.status !== 'cancelled' && session.status !== 'completed') {
      return res.status(400).json({ message: 'Can only delete cancelled/completed sessions' });
    }
    
    await Session.deleteOne({ _id: req.params.id });
    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// backend/controllers/sessionController.js
// Add this function to update session status and trigger rating availability

// @desc    Complete session (mark as completed)
// @route   PUT /api/sessions/:id/complete
// @access  Private
exports.completeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Only teacher or learner can mark as completed
    if (session.teacherId.toString() !== userId.toString() && 
        session.learnerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Only can complete if status is ongoing
    if (session.status !== 'ongoing') {
      return res.status(400).json({ message: 'Session cannot be completed' });
    }
    
    session.status = 'completed';
    await session.save();
    
    // Notify both parties that session is completed and ready for rating
    await Notification.create({
      userId: session.teacherId,
      title: 'Session Completed! ⭐',
      message: `Your session "${session.title}" has been completed. Don't forget to rate the learner!`,
      type: 'session_completed',
      data: { sessionId: session._id }
    });
    
    await Notification.create({
      userId: session.learnerId,
      title: 'Session Completed! ⭐',
      message: `Your session "${session.title}" has been completed. Don't forget to rate the teacher!`,
      type: 'session_completed',
      data: { sessionId: session._id }
    });
    
    res.json({ 
      success: true, 
      message: 'Session completed successfully',
      session 
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
exports.autoCompleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Only teacher or learner can trigger auto-complete
    if (session.teacherId.toString() !== userId.toString() && 
        session.learnerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const completed = await checkAndCompleteSession(id);
    
    if (completed) {
      res.json({ 
        success: true, 
        message: 'Session automatically completed',
        session: await Session.findById(id).populate('teacherId', 'name').populate('learnerId', 'name')
      });
    } else {
      res.json({ 
        success: false, 
        message: 'Session is not yet ready to be completed',
        sessionEndTime: new Date(new Date(session.date).getTime() + session.duration * 60000)
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createSession: exports.createSession,
  getSessions: exports.getSessions,
  getSessionById: exports.getSessionById,
  updateSessionStatus: exports.updateSessionStatus,
  cancelSession: exports.cancelSession,
  deleteSession: exports.deleteSession,
  completeSession: exports.completeSession,
  autoCompleteSession: exports.autoCompleteSession
};