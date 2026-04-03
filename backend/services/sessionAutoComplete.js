// backend/services/sessionAutoComplete.js

const cron = require('node-cron');
const Session = require('../models/Session');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { addRewardToLearner } = require('../controllers/rewardsController');

// Run every 15 minutes to check for sessions that should be completed
const startAutoCompleteService = () => {
  console.log('🔄 Starting session auto-complete service...');
  
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔍 Checking for sessions to auto-complete...');
    await autoCompleteSessions();
  });
  
  // Also run once on startup
  setTimeout(async () => {
    await autoCompleteSessions();
  }, 5000);
};

const autoCompleteSessions = async () => {
  try {
    const now = new Date();
    
    // Find sessions that:
    // 1. Are not completed or cancelled
    // 2. Have end time (date + duration) that has passed
    // 3. Are not already completed
    const sessionsToComplete = await Session.find({
      status: { $in: ['scheduled', 'ongoing'] },
      date: { $lt: now } // Session date has passed
    }).populate('teacherId', 'name email')
      .populate('learnerId', 'name email');
    
    // Filter for sessions that have actually ended (date + duration)
    const endedSessions = sessionsToComplete.filter(session => {
      const sessionEndTime = new Date(session.date);
      sessionEndTime.setMinutes(sessionEndTime.getMinutes() + session.duration);
      return sessionEndTime <= now;
    });
    
    if (endedSessions.length === 0) {
      console.log('✅ No sessions to auto-complete');
      return;
    }
    
    console.log(`📝 Found ${endedSessions.length} sessions to auto-complete`);
    
    for (const session of endedSessions) {
      // Only mark as completed if not already completed
      if (session.status !== 'completed' && session.status !== 'cancelled') {
        session.status = 'completed';
        await session.save();
        
        console.log(`✅ Auto-completed session: ${session.title} (${session._id})`);
        
        // Update user stats
        await User.findByIdAndUpdate(session.teacherId._id, { 
          $inc: { totalSessions: 1 } 
        });
        
        // Update teacher's skill session count
        await User.updateOne(
          { 
            _id: session.teacherId._id, 
            'skillsTeach.name': session.skillName 
          },
          { $inc: { 'skillsTeach.$.totalSessions': 1 } }
        );

        // ✅ Add reward to learner for completing session
        if (!session.isFreeReward) { // Only reward paid sessions, not free reward sessions
          await addRewardToLearner(
            session.learnerId._id, 
            session._id, 
            `Reward earned for completing session: ${session.title}`
          );
        }
        
        // Send notification to teacher
        await Notification.create({
          userId: session.teacherId._id,
          title: 'Session Auto-Completed ⭐',
          message: `Your session "${session.title}" with ${session.learnerId.name} has been automatically completed. You can now rate the student.`,
          type: 'session_completed',
          data: {
            sessionId: session._id,
            skillName: session.skillName,
            learnerName: session.learnerId.name
          }
        });
        
        // Send notification to learner
        await Notification.create({
          userId: session.learnerId._id,
          title: 'Session Auto-Completed ⭐',
          message: `Your session "${session.title}" with ${session.teacherId.name} has been automatically completed. You can now rate the teacher.`,
          type: 'session_completed',
          data: {
            sessionId: session._id,
            skillName: session.skillName,
            teacherName: session.teacherId.name
          }
        });
      }
    }
    
    console.log(`✅ Auto-completed ${endedSessions.length} sessions`);
    
  } catch (error) {
    console.error('❌ Error auto-completing sessions:', error);
  }
};

// Also provide a manual function to check a specific session
const checkAndCompleteSession = async (sessionId) => {
  try {
    const session = await Session.findById(sessionId);
    if (!session) return false;
    
    if (session.status === 'completed' || session.status === 'cancelled') {
      return false;
    }
    
    const now = new Date();
    const sessionEndTime = new Date(session.date);
    sessionEndTime.setMinutes(sessionEndTime.getMinutes() + session.duration);
    
    if (sessionEndTime <= now) {
      session.status = 'completed';
      await session.save();
      console.log(`✅ Manually completed session: ${session.title}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
};

module.exports = {
  startAutoCompleteService,
  autoCompleteSessions,
  checkAndCompleteSession
};