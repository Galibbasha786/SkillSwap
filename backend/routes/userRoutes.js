// backend/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  uploadProfileImage,
  removeProfileImage,
  getProfile,
  updateProfile,
  addTeachingSkill,
  addLearningSkill,
  removeTeachingSkill,
  removeLearningSkill,
  getMatches,
  getMutualMatches,
  getAllTeachers
} = require('../controllers/userController');

// All routes are protected
router.use(auth);

// Profile routes
router.get('/profile/:id', getProfile);
router.put('/profile', updateProfile);
router.post('/upload-profile-image', upload.single('image'), uploadProfileImage);
router.delete('/profile-image', removeProfileImage);

// Teaching skills routes
router.post('/skills/teach', addTeachingSkill);
router.delete('/skills/teach/:skillName', removeTeachingSkill);

// Learning skills routes
router.post('/skills/learn', addLearningSkill);
router.delete('/skills/learn/:skillName', removeLearningSkill);

// Match routes
router.get('/matches', getMatches);
router.get('/mutual-matches', getMutualMatches);  // ✅ This is correct
router.get('/teachers', getAllTeachers);

module.exports = router;