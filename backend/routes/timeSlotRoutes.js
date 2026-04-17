// backend/routes/timeSlotRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getTeacherTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  checkAvailability,
  getAvailableSlotsForWeek
} = require('../controllers/timeSlotController');

// Public routes (viewable by anyone)
// Get all time slots for a specific teacher
router.get('/teacher/:teacherId', getTeacherTimeSlots);

// Check availability for a specific date/time
router.get('/check/:teacherId', checkAvailability);

// Get available slots for a teacher for a specific week
router.get('/week/:teacherId', getAvailableSlotsForWeek);

// Protected routes (teacher only)
// Create a new time slot
router.post('/', auth, createTimeSlot);

// Update a time slot
router.put('/:slotId', auth, updateTimeSlot);

// Delete a time slot
router.delete('/:slotId', auth, deleteTimeSlot);

module.exports = router;
