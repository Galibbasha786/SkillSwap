const Session = require('../models/Session');

const ACTIVE_STATUSES = ['scheduled', 'ongoing'];

const getSessionEnd = (start, durationMinutes) =>
  new Date(new Date(start).getTime() + Number(durationMinutes) * 60000);

const sessionsOverlap = (startA, durationA, startB, durationB) => {
  const aStart = new Date(startA).getTime();
  const aEnd = getSessionEnd(startA, durationA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = getSessionEnd(startB, durationB).getTime();
  return aStart < bEnd && bStart < aEnd;
};

const hasTeacherBookingConflict = async (teacherId, date, duration, excludeSessionId = null) => {
  const start = new Date(date);
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  const query = {
    teacherId,
    status: { $in: ACTIVE_STATUSES },
    date: { $gte: dayStart, $lte: dayEnd }
  };

  if (excludeSessionId) {
    query._id = { $ne: excludeSessionId };
  }

  const existingSessions = await Session.find(query).select('date duration');

  return existingSessions.some((session) =>
    sessionsOverlap(start, duration, session.date, session.duration)
  );
};

const getBookedSessionsForDate = async (teacherId, date) => {
  const start = new Date(date);
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setHours(23, 59, 59, 999);

  return Session.find({
    teacherId,
    status: { $in: ACTIVE_STATUSES },
    date: { $gte: dayStart, $lte: dayEnd }
  }).select('date duration');
};

module.exports = {
  ACTIVE_STATUSES,
  getSessionEnd,
  sessionsOverlap,
  hasTeacherBookingConflict,
  getBookedSessionsForDate
};
