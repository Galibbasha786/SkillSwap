// backend/models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
 profileImage: {
  type: String,
  default: 'https://via.placeholder.com/150'
},
profileImagePublicId: {
  type: String,
  default: null
},
  
  // Skills
  skillsTeach: [{
    name: String,
    category: String,
    experience: { type: String, enum: ['Beginner', 'Intermediate', 'Expert', 'Master'] },
    yearsOfExperience: Number,
    hourlyRate: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'USD' },
    totalSessions: { type: Number, default: 0 },
    rating: { type: Number, default: 0 }
  }],
  
  skillsLearn: [{
    name: String,
    category: String,
    priority: { type: String, enum: ['Low', 'Medium', 'High'] },
    budget: { type: Number, min: 0 }
  }],

  // Wallet
  wallet: {
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    pendingWithdrawals: { type: Number, default: 0 }
  },

  // OTP Fields
  otp: {
    code: String,
    expiresAt: Date,
    type: { type: String, enum: ['verification', 'reset'] }
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Stats
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalSessions: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },

  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, {
  timestamps: true
});

// Indexes
userSchema.index({ 'skillsTeach.name': 1 });
userSchema.index({ 'skillsLearn.name': 1 });

module.exports = mongoose.model('User', userSchema);