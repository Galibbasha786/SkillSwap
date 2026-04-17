// backend/controllers/timeSlotController.js

const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');

// @desc    Get all time slots for a teacher
// @route   GET /api/timeslots/:teacherId
// @access  Public (teacher's schedule is viewable)
const getTeacherTimeSlots = async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Verify teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const timeSlots = await TimeSlot.find({ teacherId, isAvailable: true })
      .sort({ dayOfWeek: 1, startTime: 1 });

    // Format response with day order
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sortedSlots = timeSlots.sort((a, b) => {
      return dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
    });

    res.json({
      success: true,
      teacherId,
      timeSlots: sortedSlots
    });
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new time slot (Teacher only)
// @route   POST /api/timeslots
// @access  Private
const createTimeSlot = async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, timezone, maxSessionsPerDay, notes } = req.body;
    const teacherId = req.user?.id || req.user?._id;

    // Validate required fields
    if (!dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields: dayOfWeek, startTime, endTime' });
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:MM' });
    }

    // Validate end time is after start time
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMins = startHour * 60 + startMin;
    const endMins = endHour * 60 + endMin;

    if (endMins <= startMins) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Check if teacher already has a slot for this day and time range
    const existingSlot = await TimeSlot.findOne({
      teacherId,
      dayOfWeek,
      startTime,
      endTime
    });

    if (existingSlot) {
      return res.status(400).json({ message: 'Time slot already exists for this day and time' });
    }

    const timeSlot = new TimeSlot({
      teacherId,
      dayOfWeek,
      startTime,
      endTime,
      timezone: timezone || 'Asia/Kolkata',
      maxSessionsPerDay: maxSessionsPerDay || 10,
      notes: notes || ''
    });

    await timeSlot.save();

    res.status(201).json({
      success: true,
      message: 'Time slot created successfully',
      timeSlot
    });
  } catch (error) {
    console.error('Error creating time slot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a time slot (Teacher only)
// @route   PUT /api/timeslots/:slotId
// @access  Private
const updateTimeSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const teacherId = req.user?.id || req.user?._id;
    const { dayOfWeek, startTime, endTime, isAvailable, maxSessionsPerDay, notes } = req.body;

    const timeSlot = await TimeSlot.findById(slotId);
    
    if (!timeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }

    // Verify ownership
    if (timeSlot.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this time slot' });
    }

    // Update fields
    if (dayOfWeek) timeSlot.dayOfWeek = dayOfWeek;
    if (startTime) {
      // Validate format
      if (!/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(startTime)) {
        return res.status(400).json({ message: 'Invalid start time format. Use HH:MM' });
      }
      timeSlot.startTime = startTime;
    }
    if (endTime) {
      // Validate format
      if (!/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(endTime)) {
        return res.status(400).json({ message: 'Invalid end time format. Use HH:MM' });
      }
      timeSlot.endTime = endTime;
    }
    if (isAvailable !== undefined) timeSlot.isAvailable = isAvailable;
    if (maxSessionsPerDay) timeSlot.maxSessionsPerDay = maxSessionsPerDay;
    if (notes !== undefined) timeSlot.notes = notes;

    await timeSlot.save();

    res.json({
      success: true,
      message: 'Time slot updated successfully',
      timeSlot
    });
  } catch (error) {
    console.error('Error updating time slot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a time slot (Teacher only)
// @route   DELETE /api/timeslots/:slotId
// @access  Private
const deleteTimeSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const teacherId = req.user?.id || req.user?._id;

    const timeSlot = await TimeSlot.findById(slotId);
    
    if (!timeSlot) {
      return res.status(404).json({ message: 'Time slot not found' });
    }

    // Verify ownership
    if (timeSlot.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this time slot' });
    }

    await TimeSlot.findByIdAndDelete(slotId);

    res.json({
      success: true,
      message: 'Time slot deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting time slot:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Check if a specific date/time is available for booking
// @route   GET /api/timeslots/check-availability/:teacherId
// @access  Public
const checkAvailability = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { date, startTime, endTime } = req.query;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ 
        message: 'Missing required query params: date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM)' 
      });
    }

    // Parse the date
    const bookingDate = new Date(date);
    const dayName = bookingDate.toLocaleString('en-US', { weekday: 'long' });

    // Find time slot for this day
    const timeSlot = await TimeSlot.findOne({
      teacherId,
      dayOfWeek: dayName,
      isAvailable: true
    });

    if (!timeSlot) {
      return res.json({
        available: false,
        reason: 'No available time slots for this day'
      });
    }

    // Check if requested time is within the slot
    const [slotStartHour, slotStartMin] = timeSlot.startTime.split(':').map(Number);
    const [slotEndHour, slotEndMin] = timeSlot.endTime.split(':').map(Number);
    const [bookStartHour, bookStartMin] = startTime.split(':').map(Number);
    const [bookEndHour, bookEndMin] = endTime.split(':').map(Number);

    const slotStartMins = slotStartHour * 60 + slotStartMin;
    const slotEndMins = slotEndHour * 60 + slotEndMin;
    const bookStartMins = bookStartHour * 60 + bookStartMin;
    const bookEndMins = bookEndHour * 60 + bookEndMin;

    const isWithinSlot = bookStartMins >= slotStartMins && bookEndMins <= slotEndMins;

    res.json({
      available: isWithinSlot,
      timeSlot: isWithinSlot ? timeSlot : null,
      reason: isWithinSlot ? 'Time slot is available' : 'Requested time is outside available time slot'
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get available slots for a teacher for a specific week
// @route   GET /api/timeslots/available-slots/:teacherId
// @access  Public
const getAvailableSlotsForWeek = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate } = req.query; // ISO format date

    const start = startDate ? new Date(startDate) : new Date();
    const dayOfWeek = start.getDay(); // 0-6

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    const timeSlots = await TimeSlot.find({
      teacherId,
      dayOfWeek: dayName,
      isAvailable: true
    });

    res.json({
      success: true,
      date: start.toISOString().split('T')[0],
      dayOfWeek: dayName,
      availableSlots: timeSlots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTeacherTimeSlots,
  createTimeSlot,
  updateTimeSlot,
  deleteTimeSlot,
  checkAvailability,
  getAvailableSlotsForWeek
};
