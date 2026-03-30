// backend/models/Session.js

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  learnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  },
  skillName: {
    type: String,
    required: true
  },
  
  // Session details
  title: {
    type: String,
    required: true
  },
  description: String,
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 30,
    max: 240
  },
  
  // Payment details
  hourlyRate: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    default: function() {
      return this.totalAmount * 0.1;
    }
  },
  teacherEarnings: {
    type: Number,
    default: function() {
      return this.totalAmount * 0.9;
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  
  // Google Meet Link
  meetLink: {
    type: String,
    required: true
  },
 meetProvider: {
  type: String,
  enum: ['google-meet', 'jitsi'],
  default: 'jitsi'  // ✅ Changed from 'google-meet' to 'jitsi'
},
  
  // Status
  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled'
  },
  
  // ✅ ENHANCED RATING SYSTEM - FIXED
  teacherRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    review: {
      type: String,
      maxlength: 500,
      default: ''
    },
    categories: {
      communication: {
        type: Number,
        min: 1,  // ✅ Keep as 1, but will be set to rating value
        max: 5,
        default: null  // ✅ Change default to null
      },
      expertise: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      punctuality: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      teachingStyle: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      }
    },
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    givenAt: {
      type: Date,
      default: null
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  
  learnerRating: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    review: {
      type: String,
      maxlength: 500,
      default: ''
    },
    categories: {
      engagement: {
        type: Number,
        min: 1,  // ✅ Change from 0 to 1
        max: 5,
        default: null  // ✅ Change default to null
      },
      respectfulness: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      },
      preparation: {
        type: Number,
        min: 1,
        max: 5,
        default: null
      }
    },
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    givenAt: {
      type: Date,
      default: null
    },
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  
  // Track if ratings have been given
  ratingStatus: {
    teacherRated: {
      type: Boolean,
      default: false
    },
    learnerRated: {
      type: Boolean,
      default: false
    }
  },
  
  // Cancellation
  cancellationReason: String,
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ teacherId: 1, date: -1 });
sessionSchema.index({ learnerId: 1, date: -1 });
sessionSchema.index({ paymentStatus: 1 });
sessionSchema.index({ 'ratingStatus.teacherRated': 1, 'ratingStatus.learnerRated': 1 });

module.exports = mongoose.model('Session', sessionSchema);