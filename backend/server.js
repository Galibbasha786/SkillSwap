// backend/server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeSocket } = require('./socket');
const googleMeetRoutes = require('./routes/googleMeetRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
// Load environment variables
dotenv.config();

// Log environment variables (without exposing secrets)
console.log('✅ Environment loaded:');
console.log('- PORT:', process.env.PORT || 5000);
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Using default');
console.log('- RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? '✅ Present' : '❌ Missing');
console.log('- RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '✅ Present' : '❌ Missing');

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
// Initialize express
const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

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
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
  }
};
connectDB();

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

module.exports = { app, server, io };