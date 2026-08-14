// backend/socket.js

const socketIO = require('socket.io');
const Chat = require('./models/Chat');
const Exam = require('./models/Exam');

let io;
const activeCalls = new Map();
// examId -> Map(studentId -> { studentName, socketId, joinedAt })
const activeProctoring = new Map();
// examId:studentId -> { signal, studentName, timestamp }
const pendingProctorSignals = new Map();

const normalizeOrigin = (origin) => origin && origin.replace(/\/+$/, '');

const getAllowedOrigins = () => {
  return [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.CLIENT_URL,
    process.env.CLIENT_URLS
  ]
    .flatMap(value => (value || '').split(','))
    .map(value => normalizeOrigin(value.trim()))
    .filter(Boolean);
};

const createCallId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getCallKey = (userA, userB) => [String(userA), String(userB)].sort().join(':');

const addCallMessage = async ({ participants, senderId, content, call }) => {
  const participantIds = participants.map(String);
  const chat = await Chat.findOne({
    participants: { $all: participantIds }
  });

  if (!chat) return;

  chat.messages.push({
    senderId,
    content,
    type: 'call',
    read: false,
    createdAt: call.endedAt || call.startedAt || new Date(),
    call
  });
  chat.lastMessage = content;
  chat.lastMessageTime = new Date();
  chat.lastMessageSender = senderId;
  await chat.save();

  await chat.populate('messages.senderId', 'name email profileImage');
  io.to(`chat:${chat._id}`).emit('new-message', chat.messages[chat.messages.length - 1]);
};

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (getAllowedOrigins().includes(normalizeOrigin(origin))) {
          return callback(null, true);
        }

        return callback(new Error('Socket CORS not allowed for origin: ' + origin));
      },
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
      const callId = createCallId();
      const startedAt = new Date();
      activeCalls.set(getCallKey(socket.userId, to), {
        callId,
        callerId: socket.userId,
        receiverId: to,
        callType: isVideo ? 'video' : 'audio',
        startedAt
      });
      
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
            isVideo,
            callId
          });
        });
        console.log(`📞 Incoming call sent to ${to}`);
      } else {
        console.log(`❌ User ${to} not connected`);
        activeCalls.delete(getCallKey(socket.userId, to));
        addCallMessage({
          participants: [socket.userId, to],
          senderId: socket.userId,
          content: `${isVideo ? 'Video' : 'Audio'} call missed`,
          call: {
            callId,
            callType: isVideo ? 'video' : 'audio',
            status: 'missed',
            startedAt,
            endedAt: new Date(),
            durationSeconds: 0
          }
        }).catch(error => console.error('Error saving missed call:', error));
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
      const key = getCallKey(socket.userId, to);
      const call = activeCalls.get(key);
      activeCalls.delete(key);
      
      const targetSockets = [...io.sockets.sockets.values()].filter(
        s => s.userId === to
      );
      
      if (targetSockets.length > 0) {
        targetSockets.forEach(targetSocket => {
          targetSocket.emit('call-rejected', { from: socket.userId, reason });
        });
      }

      if (call) {
        addCallMessage({
          participants: [socket.userId, to],
          senderId: socket.userId,
          content: `${call.callType === 'video' ? 'Video' : 'Audio'} call declined`,
          call: {
            callId: call.callId,
            callType: call.callType,
            status: 'declined',
            startedAt: call.startedAt,
            endedAt: new Date(),
            durationSeconds: 0
          }
        }).catch(error => console.error('Error saving declined call:', error));
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
      const key = getCallKey(socket.userId, to);
      const call = activeCalls.get(key);
      activeCalls.delete(key);
      
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

      if (call) {
        const endedAt = new Date();
        const durationSeconds = Math.max(0, Math.round((endedAt - call.startedAt) / 1000));
        addCallMessage({
          participants: [socket.userId, to],
          senderId: socket.userId,
          content: `${call.callType === 'video' ? 'Video' : 'Audio'} call ended`,
          call: {
            callId: call.callId,
            callType: call.callType,
            status: 'ended',
            startedAt: call.startedAt,
            endedAt,
            durationSeconds
          }
        }).catch(error => console.error('Error saving ended call:', error));
      }
    });

    // Get user socket status (for checking if user is online)
    socket.on('check-user-status', ({ userId }) => {
      const isOnline = [...io.sockets.sockets.values()].some(s => s.userId === userId);
      socket.emit('user-status', { userId, isOnline });
    });

    // ========== EXAM LIVE PROCTORING ==========

    const getProctoringStudents = (examId) => {
      const examSessions = activeProctoring.get(String(examId));
      if (!examSessions) return [];
      return [...examSessions.entries()].map(([studentId, data]) => ({
        studentId,
        studentName: data.studentName,
        joinedAt: data.joinedAt
      }));
    };

    const removeProctoringStudent = (examId, studentId) => {
      const key = String(examId);
      const examSessions = activeProctoring.get(key);
      if (!examSessions) return;

      examSessions.delete(String(studentId));
      if (examSessions.size === 0) {
        activeProctoring.delete(key);
      }

      pendingProctorSignals.delete(`${key}:${String(studentId)}`);

      io.to(`exam-monitor:${key}`).emit('student-proctoring-ended', {
        examId: key,
        studentId: String(studentId)
      });
    };

    // Student starts live proctoring stream during exam
    socket.on('join-exam-proctoring', ({ examId, studentName }) => {
      if (!examId || !socket.userId) return;

      const key = String(examId);
      if (!activeProctoring.has(key)) {
        activeProctoring.set(key, new Map());
      }

      activeProctoring.get(key).set(String(socket.userId), {
        studentName: studentName || 'Student',
        socketId: socket.id,
        joinedAt: new Date()
      });

      socket.join(`exam-proctor:${key}`);
      socket.examProctoringId = key;

      console.log(`📹 Student ${socket.userId} joined proctoring for exam ${key}`);

      io.to(`exam-monitor:${key}`).emit('student-proctoring-started', {
        examId: key,
        studentId: String(socket.userId),
        studentName: studentName || 'Student',
        joinedAt: new Date()
      });
    });

    // Teacher joins live monitor room for an exam they own
    socket.on('join-exam-monitor', async ({ examId }) => {
      if (!examId || !socket.userId) return;

      try {
        const exam = await Exam.findById(examId).select('teacherId title proctoring');
        if (!exam) {
          socket.emit('exam-monitor-error', { message: 'Exam not found' });
          return;
        }

        if (String(exam.teacherId) !== String(socket.userId)) {
          socket.emit('exam-monitor-error', { message: 'Not authorized to monitor this exam' });
          return;
        }

        const key = String(examId);
        socket.join(`exam-monitor:${key}`);
        socket.examMonitorId = key;

        console.log(`👁️ Teacher ${socket.userId} monitoring exam ${key}`);

        socket.emit('exam-monitor-joined', {
          examId: key,
          examTitle: exam.title,
          activeStudents: getProctoringStudents(key)
        });

        // Replay any WebRTC offers sent before the teacher joined
        const examSessions = activeProctoring.get(key);
        if (examSessions) {
          examSessions.forEach((_data, studentId) => {
            const pending = pendingProctorSignals.get(`${key}:${studentId}`);
            if (pending) {
              socket.emit('exam-proctor-signal', {
                examId: key,
                signal: pending.signal,
                studentId,
                studentName: pending.studentName
              });
            }
          });
        }

        // Ask active students to resend WebRTC offers
        io.to(`exam-proctor:${key}`).emit('request-proctoring-stream', { examId: key });
      } catch (error) {
        console.error('Error joining exam monitor:', error);
        socket.emit('exam-monitor-error', { message: 'Failed to join monitor room' });
      }
    });

    socket.on('leave-exam-monitor', ({ examId }) => {
      const key = String(examId || socket.examMonitorId || '');
      if (key) {
        socket.leave(`exam-monitor:${key}`);
        socket.examMonitorId = null;
      }
    });

    socket.on('leave-exam-proctoring', ({ examId }) => {
      const key = String(examId || socket.examProctoringId || '');
      if (key && socket.userId) {
        removeProctoringStudent(key, socket.userId);
        socket.leave(`exam-proctor:${key}`);
        socket.examProctoringId = null;
      }
    });

    // WebRTC signaling for exam proctoring (student <-> teacher)
    socket.on('exam-proctor-signal', ({ examId, targetUserId, signal, studentId }) => {
      const key = String(examId);
      if (!key || !signal) return;

      if (targetUserId) {
        // Teacher -> specific student
        const targetSockets = [...io.sockets.sockets.values()].filter(
          s => String(s.userId) === String(targetUserId)
        );
        targetSockets.forEach(s => {
          s.emit('exam-proctor-signal', { examId: key, signal, from: socket.userId });
        });
      } else {
        // Student -> teacher monitor room (buffer in case teacher hasn't joined yet)
        const sid = String(studentId || socket.userId);
        const studentName = activeProctoring.get(key)?.get(sid)?.studentName;
        pendingProctorSignals.set(`${key}:${sid}`, {
          signal,
          studentName,
          timestamp: Date.now()
        });

        io.to(`exam-monitor:${key}`).emit('exam-proctor-signal', {
          examId: key,
          signal,
          studentId: sid,
          studentName
        });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.userId);

      if (socket.examProctoringId && socket.userId) {
        removeProctoringStudent(socket.examProctoringId, socket.userId);
      }
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
