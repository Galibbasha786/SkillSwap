// backend/socket.js

const socketIO = require('socket.io');
const Chat = require('./models/Chat');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: 'http://localhost:5173',
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const userId = socket.handshake.auth.userId;
    
    if (token && userId) {
      socket.userId = userId;
      next();
    } else {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.userId);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Join chat room
    socket.on('join-chat', (chatId) => {
      socket.join(`chat:${chatId}`);
      console.log(`User ${socket.userId} joined chat ${chatId}`);
    });

    // Send message
    socket.on('send-message', async (data) => {
      try {
        const { chatId, message } = data;
        
        console.log('Received message for chat:', chatId, message);
        
        // Save message to database
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          console.error('Chat not found:', chatId);
          return;
        }
        
        // Create message object
        const newMessage = {
          senderId: socket.userId,
          content: message.content,
          type: 'text',
          read: false,
          createdAt: new Date()
        };
        
        // Add to chat
        chat.messages.push(newMessage);
        chat.lastMessage = message.content;
        chat.lastMessageTime = new Date();
        chat.lastMessageSender = socket.userId;
        
        await chat.save();
        
        console.log('Message saved to database:', newMessage);
        
        // Get the populated message
        await chat.populate('messages.senderId', 'name email profileImage');
        const savedMessage = chat.messages[chat.messages.length - 1];
        
        // Broadcast to all in chat room (including sender)
        io.to(`chat:${chatId}`).emit('new-message', savedMessage);
        
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    // Typing indicator
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit('user-typing', {
        userId: socket.userId,
        isTyping
      });
    });

    // ✅ FIXED: Mark messages as read - Now properly inside socket.on
    socket.on('mark-read', async ({ chatId, messageIds }) => {
      try {
        console.log('Marking messages as read:', { chatId, messageIds });
        
        const chat = await Chat.findById(chatId);
        
        if (!chat) return;
        
        // Update messages as read
        let updated = false;
        chat.messages.forEach(msg => {
          if (messageIds.includes(msg._id.toString()) && 
              msg.senderId.toString() !== socket.userId) {
            msg.read = true;
            msg.readAt = new Date();
            updated = true;
          }
        });
        
        if (updated) {
          await chat.save();
          
          // Notify others that messages were read
          socket.to(`chat:${chatId}`).emit('messages-read', {
            messageIds,
            readerId: socket.userId,
            readAt: new Date()
          });
          
          console.log('Messages marked as read:', messageIds);
        }
        
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };