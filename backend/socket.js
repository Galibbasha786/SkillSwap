// backend/socket.js

const socketIO = require('socket.io');
const Chat = require('./models/Chat');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: ['http://localhost:5173', process.env.CLIENT_URL],
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

    // Store user info for call lookups
    socket.on('register-user', (userId) => {
      socket.userId = userId;
      socket.join(`user:${userId}`);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

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

    // Mark messages as read
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

    // ========== WEBRTC VIDEO/AUDIO CALL SIGNALING ==========

    // Initiate a call to another user
    socket.on('call-user', ({ to, signal, callerName, from, isVideo }) => {
      console.log(`📞 Call from ${callerName} (${socket.userId}) to ${to}`);
      
      // Find the target user's socket
      const targetSockets = [...io.sockets.sockets.values()].filter(
        s => s.userId === to
      );
      
      if (targetSockets.length > 0) {
        targetSockets.forEach(targetSocket => {
          targetSocket.emit('incoming-call', {
            from: socket.userId,
            callerName,
            signal,
            isVideo
          });
        });
        console.log(`📞 Incoming call sent to ${to}`);
      } else {
        console.log(`❌ User ${to} not connected`);
        socket.emit('call-error', { message: 'User not available' });
      }
    });

    // Accept an incoming call
    socket.on('accept-call', ({ to, signal, from }) => {
      console.log(`✅ Call accepted from ${socket.userId} to ${to}`);
      
      const targetSockets = [...io.sockets.sockets.values()].filter(
        s => s.userId === to
      );
      
      if (targetSockets.length > 0) {
        targetSockets.forEach(targetSocket => {
          targetSocket.emit('call-accepted', { signal, from: socket.userId });
        });
      }
    });

    // Reject an incoming call
    socket.on('reject-call', ({ to, reason }) => {
      console.log(`❌ Call rejected from ${socket.userId} to ${to}, reason: ${reason}`);
      
      const targetSockets = [...io.sockets.sockets.values()].filter(
        s => s.userId === to
      );
      
      if (targetSockets.length > 0) {
        targetSockets.forEach(targetSocket => {
          targetSocket.emit('call-rejected', { from: socket.userId, reason });
        });
      }
    });

    // Send an emoji reaction during an ongoing call
    socket.on('call-reaction', ({ to, emoji }) => {
      console.log(`✨ Call reaction from ${socket.userId} to ${to}: ${emoji}`);

      const targetSockets = [...io.sockets.sockets.values()].filter(
        s => String(s.userId) === String(to)
      );

      targetSockets.forEach(targetSocket => {
        targetSocket.emit('call-reaction', {
          from: socket.userId,
          emoji
        });
      });
    });

    // End an ongoing call
    socket.on('end-call', ({ to }) => {
      console.log(`🔴 Call ended between ${socket.userId} and ${to}`);
      
      const targetSockets = [...io.sockets.sockets.values()].filter(
        s => s.userId === to
      );
      
      if (targetSockets.length > 0) {
        targetSockets.forEach(targetSocket => {
          targetSocket.emit('call-ended', { from: socket.userId });
        });
      }
      
      // Also notify the caller
      socket.emit('call-ended', { from: to });
    });

    // Get user socket status (for checking if user is online)
    socket.on('check-user-status', ({ userId }) => {
      const isOnline = [...io.sockets.sockets.values()].some(s => s.userId === userId);
      socket.emit('user-status', { userId, isOnline });
    });

    // Disconnect
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
