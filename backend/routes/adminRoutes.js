const express = require('express');
const router = express.Router();
const { auth, adminAuth } = require('../middleware/auth');

// Placeholder controller functions
const getUsers = (req, res) => {
  res.json({ message: 'Get users route working' });
};

const getStats = (req, res) => {
  res.json({ message: 'Get stats route working' });
};

// Routes (all protected by admin auth)
router.get('/users', auth, adminAuth, getUsers);
router.get('/stats', auth, adminAuth, getStats);

module.exports = router;