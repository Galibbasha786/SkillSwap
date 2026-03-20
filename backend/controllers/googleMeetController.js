// backend/controllers/googleMeetController.js

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

// Initialize the Calendar API with service account
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../config/google-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const calendar = google.calendar({ version: 'v3', auth });

/**
 * Creates a REAL Google Meet link using Google Calendar API
 */
exports.createMeetLink = async (req, res) => {
  try {
    const { title, startTime, endTime, sessionId } = req.body;

    console.log('📅 Creating Google Meet link for session:', sessionId);
    console.log('📌 Using Calendar ID:', process.env.GOOGLE_CALENDAR_ID);

    // Create calendar event with Meet link
    const event = {
      summary: title || 'SkillSwap Session',
      description: 'One-on-one skill exchange session',
      start: { 
        dateTime: startTime, 
        timeZone: 'Asia/Kolkata' 
      },
      end: { 
        dateTime: endTime, 
        timeZone: 'Asia/Kolkata' 
      },
      conferenceData: {
        createRequest: {
          requestId: `skillswap-${sessionId}-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      resource: event,
      conferenceDataVersion: 1,
    });

    const meetLink = response.data.hangoutLink;
    const eventId = response.data.id;

    console.log('✅ Google Meet link created:', meetLink);
    console.log('📅 Calendar event ID:', eventId);

    res.json({
      success: true,
      meetLink,
      eventId
    });

  } catch (error) {
    console.error('❌ Error creating Google Meet link:', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};