// backend/controllers/ratingController.js

const Session = require('../models/Session');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper function to update user's overall rating
const updateUserRating = async (userId) => {
  try {
    // Get all sessions where user was teacher (rated by learners)
    const teacherSessions = await Session.find({
      teacherId: userId,
      status: 'completed',
      'teacherRating.rating': { $ne: null }
    }).select('teacherRating.rating');
    
    // Get all sessions where user was learner (rated by teachers)
    const learnerSessions = await Session.find({
      learnerId: userId,
      status: 'completed',
      'learnerRating.rating': { $ne: null }
    }).select('learnerRating.rating');
    
    // Combine all ratings
    const allRatings = [
      ...teacherSessions.map(s => s.teacherRating.rating),
      ...learnerSessions.map(s => s.learnerRating.rating)
    ];
    
    // Calculate average
    const avgRating = allRatings.length > 0 
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length 
      : 0;
    
    // Update user
    await User.findByIdAndUpdate(userId, {
      rating: Number(avgRating.toFixed(1)),
      totalSessions: allRatings.length
    });
    
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
};

// @desc    Rate a session (as teacher or learner)
// @route   POST /api/ratings/session/:sessionId
// @access  Private
exports.rateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { 
      rating, 
      review, 
      categories, 
      role  // 'teacher' or 'learner'
    } = req.body;
    
    const userId = req.user._id;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rating must be between 1 and 5' 
      });
    }
    
    // Find session
    const session = await Session.findById(sessionId)
      .populate('teacherId', 'name email profileImage')
      .populate('learnerId', 'name email profileImage');
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }
    
    // Check if session is completed
    if (session.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'You can only rate completed sessions' 
      });
    }
    
    // Initialize ratingStatus if it doesn't exist
    if (!session.ratingStatus) {
      session.ratingStatus = {
        teacherRated: false,
        learnerRated: false
      };
    }
    
    let targetUser;
    let ratingData;
    
    if (role === 'teacher') {
      // Teacher rating the learner
      if (session.teacherId._id.toString() !== userId.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only the teacher can rate the learner' 
        });
      }
      if (session.ratingStatus.learnerRated) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already rated this session' 
        });
      }
      
      targetUser = session.learnerId;
      
      // ✅ Set category values - use provided values or default to overall rating
      ratingData = {
    rating: rating,
    review: review || '',
    categories: {
      engagement: categories?.engagement || rating,
      respectfulness: categories?.respectfulness || rating,
      preparation: categories?.preparation || rating
    },
    givenBy: userId,
    givenAt: new Date(),
    isPublic: true
  };
      
      // Update session
      session.learnerRating = ratingData;
      session.ratingStatus.learnerRated = true;
      
    } else if (role === 'learner') {
      // Learner rating the teacher
      if (session.learnerId._id.toString() !== userId.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only the learner can rate the teacher' 
        });
      }
      if (session.ratingStatus.teacherRated) {
        return res.status(400).json({ 
          success: false, 
          message: 'You have already rated this session' 
        });
      }
      
      targetUser = session.teacherId;
      
      // ✅ Set category values - use provided values or default to overall rating
      ratingData = {
    rating: rating,
    review: review || '',
    categories: {
      communication: categories?.communication || rating,
      expertise: categories?.expertise || rating,
      punctuality: categories?.punctuality || rating,
      teachingStyle: categories?.teachingStyle || rating
    },
    givenBy: userId,
    givenAt: new Date(),
    isPublic: true
  };
      
      // Update session
      session.teacherRating = ratingData;
      session.ratingStatus.teacherRated = true;
    } else {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be "teacher" or "learner"' 
      });
    }
    
    await session.save();
    
    // Update user's overall rating
    await updateUserRating(targetUser._id);
    
    // Create notification for the rated user
    const ratedBy = role === 'teacher' ? session.teacherId.name : session.learnerId.name;
    await Notification.create({
      userId: targetUser._id,
      title: 'New Rating Received! ⭐',
      message: `${ratedBy} rated you ${rating}⭐ for the session "${session.title}"`,
      type: 'rating_received',
      data: {
        sessionId: session._id,
        rating,
        role: role === 'teacher' ? 'learner' : 'teacher'
      }
    });
    
    res.json({
      success: true,
      message: 'Rating submitted successfully',
      rating: ratingData
    });
    
  } catch (error) {
    console.error('Error rating session:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get ratings for a user
// @route   GET /api/ratings/user/:userId
// @access  Public
exports.getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Find sessions where user was teacher (rated by learners)
    const teacherRatings = await Session.find({
      teacherId: userId,
      status: 'completed',
      'teacherRating.rating': { $ne: null }
    })
    .populate('learnerId', 'name profileImage')
    .sort({ 'teacherRating.givenAt': -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
    
    // Find sessions where user was learner (rated by teachers)
    const learnerRatings = await Session.find({
      learnerId: userId,
      status: 'completed',
      'learnerRating.rating': { $ne: null }
    })
    .populate('teacherId', 'name profileImage')
    .sort({ 'learnerRating.givenAt': -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
    
    // Format ratings
    const formattedRatings = [
      ...teacherRatings.map(session => ({
        id: session._id,
        sessionTitle: session.title,
        skillName: session.skillName,
        rating: session.teacherRating.rating,
        review: session.teacherRating.review || '',
        categories: session.teacherRating.categories || {},
        givenBy: session.learnerId,
        givenAt: session.teacherRating.givenAt,
        role: 'teacher'
      })),
      ...learnerRatings.map(session => ({
        id: session._id,
        sessionTitle: session.title,
        skillName: session.skillName,
        rating: session.learnerRating.rating,
        review: session.learnerRating.review || '',
        categories: session.learnerRating.categories || {},
        givenBy: session.teacherId,
        givenAt: session.learnerRating.givenAt,
        role: 'learner'
      }))
    ];
    
    // Sort by date
    formattedRatings.sort((a, b) => new Date(b.givenAt) - new Date(a.givenAt));
    
    // Calculate rating stats
    const allRatings = formattedRatings.map(r => r.rating);
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length 
      : 0;
    
    const ratingDistribution = {
      5: allRatings.filter(r => r === 5).length,
      4: allRatings.filter(r => r === 4).length,
      3: allRatings.filter(r => r === 3).length,
      2: allRatings.filter(r => r === 2).length,
      1: allRatings.filter(r => r === 1).length
    };
    
    res.json({
      success: true,
      stats: {
        totalRatings: allRatings.length,
        averageRating: Number(averageRating.toFixed(1)),
        distribution: ratingDistribution
      },
      ratings: formattedRatings
    });
    
  } catch (error) {
    console.error('Error getting user ratings:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Check if user can rate a session
// @route   GET /api/ratings/session/:sessionId/can-rate
// @access  Private
exports.canRateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }
    
    // Initialize ratingStatus if it doesn't exist
    if (!session.ratingStatus) {
      session.ratingStatus = {
        teacherRated: false,
        learnerRated: false
      };
    }
    
    // Check if session is completed
    const canRate = session.status === 'completed';
    
    // Check if user has already rated
    let alreadyRated = false;
    let role = null;
    
    if (session.teacherId.toString() === userId.toString()) {
      role = 'teacher';
      alreadyRated = session.ratingStatus.learnerRated;
    } else if (session.learnerId.toString() === userId.toString()) {
      role = 'learner';
      alreadyRated = session.ratingStatus.teacherRated;
    }
    
    res.json({
      success: true,
      canRate: canRate && !alreadyRated,
      alreadyRated,
      role,
      sessionStatus: session.status
    });
    
  } catch (error) {
    console.error('Error checking rating eligibility:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};