// backend/socket.js

const socketIO = require('socket.io');

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
    // Verify token here (simplified)
    if (token) {
      socket.userId = socket.handshake.auth.userId;
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
      const { chatId, message } = data;
      
      // Save to database (implement later)
      
      // Broadcast to all in chat room
      io.to(`chat:${chatId}`).emit('new-message', {
        ...message,
        timestamp: new Date()
      });
    });

    // Typing indicator
    socket.on('typing', ({ chatId, isTyping }) => {
      socket.to(`chat:${chatId}`).emit('user-typing', {
        userId: socket.userId,
        isTyping
      });
    });

    // Video call signaling
    socket.on('call-user', ({ userId, offer }) => {
      io.to(`user:${userId}`).emit('incoming-call', {
        from: socket.userId,
        offer,
        roomName: `call-${Date.now()}`
      });
    });

    socket.on('accept-call', ({ to, answer }) => {
      io.to(`user:${to}`).emit('call-accepted', {
        from: socket.userId,
        answer
      });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      io.to(`user:${to}`).emit('ice-candidate', {
        from: socket.userId,
        candidate
      });
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