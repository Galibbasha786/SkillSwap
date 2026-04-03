// backend/models/User.js
// Add these fields to your schema
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
  
  // ✅ ADD THESE MISSING FIELDS:
  phone: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        return v === '' || /^[0-9]{10}$/.test(v);
      },
      message: 'Please enter a valid 10-digit phone number'
    }
  },
  
  dateOfBirth: {
    type: Date,
    default: null
  },
  
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    default: 'Prefer not to say'
  },
  
  location: {
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: 'India' },
    pincode: { type: String, default: '' }
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
  
  // Bank Account
  bankAccount: {
    accountHolderName: { type: String, default: '' },
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    upiId: { type: String, default: '' },
    isVerified: { type: Boolean, default: false }
  },
  
  upiId: {
    type: String,
    default: ''
  },
  
  // Wallet
  wallet: {
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    pendingWithdrawals: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    lastTransactionAt: Date
  },
  
  // Education
  education: {
    level: {
      type: String,
      enum: ['High School', 'Bachelor\'s', 'Master\'s', 'PhD', 'Diploma', 'Other'],
      default: 'Other'
    },
    institution: { type: String, default: '' },
    degree: { type: String, default: '' },
    fieldOfStudy: { type: String, default: '' },
    graduationYear: { type: Number, min: 1950, max: 2030, default: null }
  },
  rewards: {
  balance: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalRedeemed: { type: Number, default: 0 },
  transactions: [{
    type: { type: String, enum: ['earned', 'redeemed', 'teacher_bonus'] },
    amount: Number,
    description: String,
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
    date: { type: Date, default: Date.now }
  }]
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