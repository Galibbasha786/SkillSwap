
const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  addTeachingSkill,
  addLearningSkill,
  removeTeachingSkill,
  removeLearningSkill,
  getMatches,
  getMutualMatches
} = require('../controllers/userController');

// All routes are protected
router.use(auth);

// Profile routes
router.get('/profile/:id', getProfile);
router.put('/profile', updateProfile);

// ✅ Teaching skills routes
router.post('/skills/teach', addTeachingSkill);
router.delete('/skills/teach/:skillName', removeTeachingSkill);

// ✅ Learning skills routes
router.post('/skills/learn', addLearningSkill);
router.delete('/skills/learn/:skillName', removeLearningSkill);

// Match routes
router.get('/matches', getMatches);
router.get('/matches/mutual', getMutualMatches);

module.exports = router;
