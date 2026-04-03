// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
// Initialize express
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const clientUrl = rawClientUrl.replace(/\/+$/, ''); // strip trailing slash

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // non-browser requests

    const allowedOrigins = [clientUrl];
    // Add more allowed origins here if you host frontend in multiple envs
    if (allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed for origin: ' + origin));
  },
  credentials: true
}));

// Support preflight requests for all routes
app.options('*', cors({ origin: clientUrl, credentials: true }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/SkillSwap');
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create admin if not exists
    try {
      const seedAdmin = require('./config/adminSeed');
      await seedAdmin();
    } catch (seedError) {
      console.log('Admin seed skipped:', seedError.message);
    }
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

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
connectDB().then(() => {
  // Start server
  const PORT = process.env.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
    console.log(`✅ CORS enabled for: http://localhost:5173`);
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