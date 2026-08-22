// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { initializeSocket } = require('./socket');
const googleMeetRoutes = require('./routes/googleMeetRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { startAutoCompleteService } = require('./services/sessionAutoComplete');

// Load environment variables
dotenv.config();

// Log environment variables (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log('✅ Environment loaded:');
  console.log('- PORT:', process.env.PORT || 5000);
  console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Using default');
  console.log('- RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✅ Present' : '❌ Missing');
  console.log('- RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✅ Present' : '❌ Missing');
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const skillRoutes = require('./routes/skillRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const adminRoutes = require('./routes/adminRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const razorpayRoutes = require('./routes/razorpayRoutes');
const examRoutes = require('./routes/examRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const walletRoutes = require('./routes/walletRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const swapRoutes = require('./routes/swapRoutes');
const rewardsRoutes = require('./routes/rewardsRoutes');
const timeSlotRoutes = require('./routes/timeSlotRoutes');
const compilerRoutes = require('./routes/compilerRoutes');
const postRoutes = require('./routes/postRoutes');
// Initialize express
const app = express();

// Trust proxy (required for production when behind reverse proxy like Render, AWS ALB, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration
const normalizeOrigin = (origin) => origin && origin.replace(/\/+$/, '');

const isLocalDevOrigin = (origin) => {
  if (!origin) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/i.test(
    normalizeOrigin(origin)
  );
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
  process.env.CLIENT_URLS,
  process.env.ALLOWED_ORIGINS
]
  .flatMap(value => (value || '').split(','))
  .map(value => normalizeOrigin(value.trim()))
  .filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // non-browser requests

    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed for origin: ' + origin));
  },
  credentials: true
}));

// Support preflight requests for all routes
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed for origin: ' + origin));
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const { connectDB } = require('./config/database');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/meet', googleMeetRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/swaps', swapRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/timeslots', timeSlotRoutes);
app.use('/api/compiler', compilerRoutes);
app.use('/api/posts', postRoutes);
// Base route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to SkillSwap API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    message: 'Server is healthy',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ✅ FIX: Connect to DB ONCE, then start server and auto-complete service
connectDB().then(async () => {
  try {
    const Exam = require('./models/Exam');
    const result = await Exam.updateMany(
      { examType: 'manual', $or: [{ 'proctoring.enabled': false }, { proctoring: { $exists: false } }] },
      {
        $set: {
          'proctoring.enabled': true,
          'proctoring.faceDetection': true,
          'proctoring.tabSwitchDetection': true,
          'proctoring.screenshotDetection': true
        }
      }
    );
    if (result.modifiedCount > 0) {
      console.log(`✅ Re-enabled proctoring on ${result.modifiedCount} manual exam(s)`);
    }
  } catch (migrationError) {
    console.warn('⚠️ Manual exam proctoring migration skipped:', migrationError.message);
  }

  try {
    const Session = require('./models/Session');
    const legacyApproved = await Session.updateMany(
      { approvalStatus: { $exists: false }, paymentStatus: 'completed' },
      { $set: { approvalStatus: 'approved' } }
    );
    const legacyPending = await Session.updateMany(
      { approvalStatus: { $exists: false }, paymentStatus: { $ne: 'completed' }, isFreeReward: { $ne: true } },
      { $set: { approvalStatus: 'approved' } }
    );
    const migrated = (legacyApproved.modifiedCount || 0) + (legacyPending.modifiedCount || 0);
    if (migrated > 0) {
      console.log(`✅ Migrated approvalStatus on ${migrated} legacy session(s)`);
    }
  } catch (migrationError) {
    console.warn('⚠️ Session approval migration skipped:', migrationError.message);
  }

  // Start server
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
  });

  // Initialize Socket.io
  const io = initializeSocket(server);
  console.log('🔌 Socket.io initialized');

  // ✅ Start auto-complete service AFTER database is connected
  startAutoCompleteService();
  console.log('🔄 Session auto-complete service started');

  module.exports = { app, server, io };
}).catch(err => {
  console.error('❌ Failed to connect to database:', err);
  process.exit(1);
});
