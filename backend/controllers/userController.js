
const User = require('../models/User');
const Session = require('../models/Session');

// @desc    Get user profile
// @route   GET /api/users/profile/:id
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user's sessions count
    const sessionsCount = await Session.countDocuments({
      $or: [
        { teacherId: user._id, status: 'completed' },
        { learnerId: user._id, status: 'completed' }
      ]
    });
    
    res.json({
      ...user.toObject(),
      completedSessions: sessionsCount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { bio, location, availability } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (availability) user.availability = availability;
    
    await user.save();
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ @desc    Add teaching skill
// @route   POST /api/users/skills/teach
// @access  Private
exports.addTeachingSkill = async (req, res) => {
  try {
    const { name, experience, yearsOfExperience, hourlyRate, currency } = req.body;
    
    console.log('Adding teaching skill for user:', req.user.id);
    console.log('Skill data:', req.body);
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if skill already exists
    const existingSkill = user.skillsTeach.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existingSkill) {
      return res.status(400).json({ message: 'Skill already added' });
    }
    
    user.skillsTeach.push({
      name,
      experience,
      yearsOfExperience: yearsOfExperience || 0,
      hourlyRate: hourlyRate || 0,
      currency: currency || 'USD'
    });
    
    await user.save();
    
    res.status(201).json(user.skillsTeach);
  } catch (error) {
    console.error('Error adding teaching skill:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// ✅ @desc    Add learning skill
// @route   POST /api/users/skills/learn
// @access  Private
exports.addLearningSkill = async (req, res) => {
  try {
    const { name, priority, budget, currency } = req.body;
    
    console.log('Adding learning skill for user:', req.user.id);
    console.log('Skill data:', req.body);
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if skill already exists
    const existingSkill = user.skillsLearn.find(s => s.name.toLowerCase() === name.toLowerCase());
    if (existingSkill) {
      return res.status(400).json({ message: 'Skill already added' });
    }
    
    user.skillsLearn.push({
      name,
      priority: priority || 'Medium',
      budget: budget || 0,
      currency: currency || 'USD'
    });
    
    await user.save();
    
    res.status(201).json(user.skillsLearn);
  } catch (error) {
    console.error('Error adding learning skill:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

// ✅ @desc    Remove teaching skill
// @route   DELETE /api/users/skills/teach/:skillName
// @access  Private
exports.removeTeachingSkill = async (req, res) => {
  try {
    const { skillName } = req.params;
    
    const user = await User.findById(req.user.id);
    
    user.skillsTeach = user.skillsTeach.filter(s => s.name.toLowerCase() !== skillName.toLowerCase());
    
    await user.save();
    
    res.json(user.skillsTeach);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ✅ @desc    Remove learning skill
// @route   DELETE /api/users/skills/learn/:skillName
// @access  Private
exports.removeLearningSkill = async (req, res) => {
  try {
    const { skillName } = req.params;
    
    const user = await User.findById(req.user.id);
    
    user.skillsLearn = user.skillsLearn.filter(s => s.name.toLowerCase() !== skillName.toLowerCase());
    
    await user.save();
    
    res.json(user.skillsLearn);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get skill matches
// @route   GET /api/users/matches
// @access  Private
exports.getMatches = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // Find users who teach what current user wants to learn
    const teachMatches = await User.find({
      _id: { $ne: currentUser._id },
      'skillsTeach.name': { $in: currentUser.skillsLearn.map(s => s.name) }
    }).select('name email profileImage skillsTeach skillsLearn rating bio');
    
    // Find users who want to learn what current user teaches
    const learnMatches = await User.find({
      _id: { $ne: currentUser._id },
      'skillsLearn.name': { $in: currentUser.skillsTeach.map(s => s.name) }
    }).select('name email profileImage skillsTeach skillsLearn rating bio');
    
    // Combine and calculate match scores
    const allMatches = [...new Map([...teachMatches, ...learnMatches].map(m => [m._id.toString(), m])).values()];
    
    const matchesWithScore = allMatches.map(user => {
      const userObj = user.toObject();
      
      // Skills they teach that I want to learn
      const matchingTeach = user.skillsTeach.filter(st => 
        currentUser.skillsLearn.some(sl => sl.name === st.name)
      );
      
      // Skills they want to learn that I teach
      const matchingLearn = user.skillsLearn.filter(sl => 
        currentUser.skillsTeach.some(st => st.name === sl.name)
      );
      
      // Calculate match score (0-100)
      const totalSkills = matchingTeach.length + matchingLearn.length;
      const maxPossible = Math.max(currentUser.skillsLearn.length, currentUser.skillsTeach.length);
      const matchScore = maxPossible > 0 ? Math.round((totalSkills / maxPossible) * 100) : 0;
      
      return {
        ...userObj,
        matchingTeach,
        matchingLearn,
        matchScore,
        mutual: matchingTeach.length > 0 && matchingLearn.length > 0
      };
    });
    
    // Sort by match score (highest first)
    matchesWithScore.sort((a, b) => b.matchScore - a.matchScore);
    
    res.json(matchesWithScore);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get mutual matches (two-way exchange)
// @route   GET /api/users/matches/mutual
// @access  Private
exports.getMutualMatches = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    const mutualMatches = await User.find({
      _id: { $ne: currentUser._id },
      'skillsTeach.name': { $in: currentUser.skillsLearn.map(s => s.name) },
      'skillsLearn.name': { $in: currentUser.skillsTeach.map(s => s.name) }
    }).select('name email profileImage skillsTeach skillsLearn rating bio');
    
    res.json(mutualMatches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = exports;
