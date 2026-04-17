// backend/models/TimeSlot.js

const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Day of week: 0-6 (0 = Sunday, 6 = Saturday) or use day name
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    // Start time in 24-hour format (e.g., "09:00")
    startTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          // Check if time format is HH:MM
          return /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(v);
        },
        message: 'Start time must be in HH:MM format'
      }
    },
    // End time in 24-hour format (e.g., "10:00")
    endTime: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          // Check if time format is HH:MM
          return /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(v);
        },
        message: 'End time must be in HH:MM format'
      }
    },
    // Timezone for accuracy
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    },
    // Whether this slot is available for booking
    isAvailable: {
      type: Boolean,
      default: true
    },
    // Maximum number of sessions per day (if needed)
    maxSessionsPerDay: {
      type: Number,
      default: 10
    },
    // Notes about this time slot
    notes: {
      type: String,
      maxlength: 200,
      default: ''
    },
    // Special dates when this slot is not available (holidays, etc)
    unavailableDates: [{
      date: Date,
      reason: String
    }],
    // Repeat pattern
    repeatWeekly: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
timeSlotSchema.index({ teacherId: 1, dayOfWeek: 1 });
timeSlotSchema.index({ teacherId: 1, isAvailable: 1 });

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
