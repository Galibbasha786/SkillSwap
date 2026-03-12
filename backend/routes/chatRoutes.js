const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Placeholder controller functions
const getChats = (req, res) => {
  res.json({ message: 'Get chats route working' });
};

const sendMessage = (req, res) => {
  res.json({ message: 'Send message route working' });
};

// Routes
router.get('/', auth, getChats);
router.post('/:id/messages', auth, sendMessage);

module.exports = router;