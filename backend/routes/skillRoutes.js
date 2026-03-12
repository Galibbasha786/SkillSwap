const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Placeholder controller functions
const getSkills = (req, res) => {
  res.json({ message: 'Get skills route working' });
};

const searchSkills = (req, res) => {
  res.json({ message: 'Search skills route working' });
};

// Routes
router.get('/', getSkills);
router.get('/search', searchSkills);

module.exports = router;