const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Placeholder controller functions
const getSessions = (req, res) => {
  res.json({ message: 'Get sessions route working' });
};

const createSession = (req, res) => {
  res.json({ message: 'Create session route working' });
};

// Routes
router.get('/', auth, getSessions);
router.post('/', auth, createSession);

module.exports = router;