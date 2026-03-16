
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
    maxlength: 500
  },
  profileImage: {
    type: String,
    default: 'https://via.placeholder.com/150'
  },
  
  // Skills they TEACH (earn money)
  skillsTeach: [{
    name: String,
    category: String,
    experience: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert', 'Master']
    },
    yearsOfExperience: Number,
    hourlyRate: {  // 💰 Price per hour for this skill
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    totalSessions: {
      type: Number,
      default: 0
    },
    rating: {
      type: Number,
      default: 0
    }
  }],
  
  // Skills they WANT TO LEARN (pay money)
  skillsLearn: [{
    name: String,
    category: String,
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High']
    },
    budget: {  // 💰 Max budget they're willing to pay per hour
      type: Number,
      min: 0
    }
  }],

  // Payment & Wallet
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    pendingWithdrawals: {
      type: Number,
      default: 0
    }
  },

  // Stripe Connect for payouts
  stripeAccountId: String,
  stripeCustomerId: String,
  
  // Bank details for withdrawals
  bankInfo: {
    accountHolder: String,
    bankName: String,
    accountNumber: String, // Encrypted
    routingNumber: String, // Encrypted
    country: String
  },

  // Stats
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Index for search
userSchema.index({ 'skillsTeach.name': 1 });
userSchema.index({ 'skillsLearn.name': 1 });
//userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
