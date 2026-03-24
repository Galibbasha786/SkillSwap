// backend/jobs/cleanupNotifications.js

const Notification = require('../models/Notification');

// Delete notifications older than 1 day
const cleanupOldNotifications = async () => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await Notification.deleteMany({
      createdAt: { $lt: oneDayAgo }
    });
    
    if (result.deletedCount > 0) {
      console.log(`🗑️ Cleaned up ${result.deletedCount} old notifications`);
    }
  } catch (error) {
    console.error('Error cleaning up notifications:', error);
  }
};

// Run cleanup every hour
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupOldNotifications, 60 * 60 * 1000); // Every hour
  console.log('🔄 Notification cleanup job scheduled (runs every hour)');
}

module.exports = { cleanupOldNotifications };