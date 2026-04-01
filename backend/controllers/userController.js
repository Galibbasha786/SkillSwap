// backend/controllers/userController.js

const User = require('../models/User');
const Session = require('../models/Session');
const { cloudinary } = require('../config/cloudinary');

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
// backend/controllers/userController.js

// backend/controllers/userController.js
// Update the updateProfile function with more logs

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // ✅ DEBUG: Log everything
    console.log('📥 UPDATE PROFILE REQUEST:');
    console.log('User ID:', userId);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    // Fields that can be updated
    const allowedUpdates = [
      'name', 'bio', 'phone', 'dateOfBirth', 'gender', 'location',
      'education', 'bankAccount', 'upiId', 'userType'
    ];
    
    // Build update object
    const updateData = {};
    
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        updateData[field] = req.body[field];
        console.log(`✅ Adding field to update: ${field} =`, req.body[field]);
      }
    }
    
    // Handle nested location object properly
    if (req.body.location) {
      updateData.location = {
        city: req.body.location.city || '',
        state: req.body.location.state || '',
        country: req.body.location.country || 'India',
        pincode: req.body.location.pincode || ''
      };
      console.log('📍 Location update:', updateData.location);
    }
    
    // Handle nested education object properly
    if (req.body.education) {
      updateData.education = {
        level: req.body.education.level || 'Other',
        institution: req.body.education.institution || '',
        degree: req.body.education.degree || '',
        fieldOfStudy: req.body.education.fieldOfStudy || '',
        graduationYear: req.body.education.graduationYear || null
      };
      console.log('🎓 Education update:', updateData.education);
    }
    
    // Handle nested bankAccount object
    if (req.body.bankAccount) {
      updateData.bankAccount = {
        accountHolderName: req.body.bankAccount.accountHolderName || '',
        bankName: req.body.bankAccount.bankName || '',
        accountNumber: req.body.bankAccount.accountNumber || '',
        ifscCode: req.body.bankAccount.ifscCode || '',
        isVerified: false
      };
      console.log('🏦 Bank update:', updateData.bankAccount);
    }
    
    // Handle upiId separately
    if (req.body.upiId !== undefined) {
      updateData.upiId = req.body.upiId || '';
    }
    
    console.log('📦 Final updateData:', JSON.stringify(updateData, null, 2));
    
    // ✅ Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      console.log('⚠️ No fields to update');
      return res.status(400).json({ message: 'No fields to update' });
    }
    
    // Update user and get the updated document
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // ✅ Log the updated user data
    console.log('✅ User after update:', {
      id: user._id,
      name: user.name,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      location: user.location,
      education: user.education
    });
    
    res.json({
      success: true,
      user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

// ✅ @desc    Get mutual matches for free skill swapping
// @route   GET /api/users/mutual-matches
// @access  Private
exports.getMutualMatches = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    // Find users who:
    // 1. Teach a skill current user wants to learn
    // 2. Want to learn a skill current user teaches
    const mutualMatches = await User.find({
      _id: { $ne: currentUser._id },
      'skillsTeach.name': { $in: currentUser.skillsLearn.map(s => s.name) },
      'skillsLearn.name': { $in: currentUser.skillsTeach.map(s => s.name) }
    }).select('name email profileImage skillsTeach skillsLearn rating bio');
    
    // Format matches with specific skill pairs
    const formattedMatches = mutualMatches.map(user => {
      const matches = [];
      
      // Find all mutual skill pairs
      for (const teachSkill of currentUser.skillsTeach) {
        for (const learnSkill of currentUser.skillsLearn) {
          // Check if user teaches what current user wants to learn
          const userTeaches = user.skillsTeach.some(s => s.name === learnSkill.name);
          // Check if user wants to learn what current user teaches
          const userWantsToLearn = user.skillsLearn.some(s => s.name === teachSkill.name);
          
          if (userTeaches && userWantsToLearn) {
            matches.push({
              myTeach: teachSkill.name,
              myLearn: learnSkill.name,
              theirTeach: learnSkill.name,
              theirLearn: teachSkill.name
            });
          }
        }
      }
      
      return {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          profileImage: user.profileImage,
          rating: user.rating,
          bio: user.bio
        },
        matches: matches,
        matchScore: matches.length * 25
      };
    });
    
    // Filter users with at least one match
    const validMatches = formattedMatches.filter(m => m.matches.length > 0);
    validMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    res.json(validMatches);
  } catch (error) {
    console.error('Error getting mutual matches:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all teachers (users with teaching skills)
// @route   GET /api/users/teachers
// @access  Private
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({
      'skillsTeach.0': { $exists: true }, // Has at least one teaching skill
      isActive: true
    })
    .select('name email profileImage skillsTeach skillsLearn rating bio totalSessions')
    .sort({ rating: -1 });
    
    res.json(teachers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload profile image
// @route   POST /api/users/upload-profile-image
// @access  Private
exports.uploadProfileImage = async (req, res) => {
  try {
    console.log('📸 Uploading profile image...');
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete old image from Cloudinary if exists
    if (user.profileImagePublicId) {
      console.log('🗑️ Deleting old image:', user.profileImagePublicId);
      await cloudinary.uploader.destroy(user.profileImagePublicId);
    }

    // Upload to Cloudinary from memory buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'skillswap-profiles',
          width: 500,
          height: 500,
          crop: 'limit',
          quality: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      // Write the buffer to the stream
      uploadStream.end(req.file.buffer);
    });

    console.log('✅ Image uploaded to Cloudinary:', result.secure_url);

    // Update user with new image
    user.profileImage = result.secure_url;
    user.profileImagePublicId = result.public_id;
    await user.save();

    res.json({
      success: true,
      profileImage: user.profileImage,
      message: 'Profile image updated successfully'
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      message: 'Failed to upload image', 
      error: error.message 
    });
  }
};

// @desc    Remove profile image
// @route   DELETE /api/users/profile-image
// @access  Private
exports.removeProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.profileImagePublicId) {
      console.log('🗑️ Deleting image:', user.profileImagePublicId);
      await cloudinary.uploader.destroy(user.profileImagePublicId);
      user.profileImage = 'https://via.placeholder.com/150';
      user.profileImagePublicId = null;
      await user.save();
    }

    res.json({
      success: true,
      profileImage: user.profileImage,
      message: 'Profile image removed'
    });
  } catch (error) {
    console.error('❌ Remove error:', error);
    res.status(500).json({ message: 'Failed to remove image' });
  }
};