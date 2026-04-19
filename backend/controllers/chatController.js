// backend/controllers/chatController.js

const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');
// @desc    Get all conversations for current user
// @route   GET /api/chats
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    console.log('Fetching conversations for user:', req.user.id);
    
    const chats = await Chat.find({
      participants: req.user.id
    })
    .populate('participants', 'name email profileImage phone')
    .populate('lastMessageSender', 'name')
    .sort({ lastMessageTime: -1 });
    
    console.log(`Found ${chats.length} conversations`);
    res.json(chats);
  } catch (error) {
    console.error('❌ Error in getConversations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new chat
// @route   POST /api/chats
// @access  Private
 // @desc    Create a new chat
// @route   POST /api/chats
// @access  Private
exports.createChat = async (req, res) => {
  try {
    const { participantId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }
    
    console.log('Creating chat between', req.user.id, 'and', participantId);
    
    // Check if users exist
    const [currentUser, participant] = await Promise.all([
      User.findById(req.user.id),
      User.findById(participantId)
    ]);
    
    if (!currentUser) {
      return res.status(404).json({ message: 'Current user not found' });
    }
    
    if (!participant) {
      return res.status(404).json({ message: 'Participant not found' });
    }
    
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [req.user.id, participantId] }
    }).populate('participants', 'name email profileImage phone');
    
    if (existingChat) {
      console.log('Chat already exists:', existingChat._id);
      return res.json(existingChat);
    }
    
    // Create new chat - DON'T use mongoose.Types.ObjectId(), just pass the strings directly
    const chat = new Chat({
      participants: [req.user.id, participantId], // Just pass the IDs as strings
      messages: [],
      lastMessageTime: new Date()
    });
    
    await chat.save();
    console.log('New chat created:', chat._id);
    
    await chat.populate('participants', 'name email profileImage phone');
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('❌ Error in createChat:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get messages for a chat
// @route   GET /api/chats/:chatId/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('messages.senderId', 'name email profileImage');
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.json(chat.messages);
  } catch (error) {
    console.error('❌ Error in getMessages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send a message
// @route   POST /api/chats/:chatId/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    
    const chat = await Chat.findById(req.params.chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const message = {
      senderId: req.user.id,
      content: content.trim(),
      type: 'text',
      read: false,
      createdAt: new Date()
    };
    
    chat.messages.push(message);
    chat.lastMessage = content.trim();
    chat.lastMessageTime = new Date();
    chat.lastMessageSender = req.user.id;
    
    await chat.save();
    
    // Populate sender info
    await chat.populate('messages.senderId', 'name email profileImage');
    
    res.status(201).json(message);
  } catch (error) {
    console.error('❌ Error in sendMessage:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chats/:chatId/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Mark all messages from others as read
    let updated = false;
    chat.messages.forEach(msg => {
      if (msg.senderId.toString() !== req.user.id && !msg.read) {
        msg.read = true;
        msg.readAt = new Date();
        updated = true;
      }
    });
    
    if (updated) {
      await chat.save();
    }
    
    res.json({ success: true, updated });
  } catch (error) {
    console.error('❌ Error in markAsRead:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get participant details (including phone number for WhatsApp)
// @route   GET /api/chats/participant/:userId
// @access  Private
exports.getParticipantDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const user = await User.findById(userId).select('name email profileImage phone');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      phone: user.phone || null
    });
  } catch (error) {
    console.error('❌ Error in getParticipantDetails:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};