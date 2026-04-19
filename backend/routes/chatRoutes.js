// backend/routes/chatRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getConversations,
  getMessages,
  sendMessage,
  createChat,
  markAsRead,
  getParticipantDetails
} = require('../controllers/chatController');

// All routes require authentication
router.get('/', auth, getConversations);
router.post('/', auth, createChat);
router.get('/:chatId/messages', auth, getMessages);
router.post('/:chatId/messages', auth, sendMessage);
router.put('/:chatId/read', auth, markAsRead);
router.get('/participant/:userId', auth, getParticipantDetails);

module.exports = router;