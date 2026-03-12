const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Placeholder controller functions
const getProfile = (req, res) => {
  res.json({ message: 'Get profile route working' });
};

const updateProfile = (req, res) => {
  res.json({ message: 'Update profile route working' });
};

// Routes
router.get('/profile/:id', auth, getProfile);
router.put('/profile', auth, updateProfile);

module.exports = router;