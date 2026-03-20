// backend/test-oauth.js

const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'config/oauth-credentials.json');

async function getAuth() {
  // First, check if we have saved token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(token);
    return oauth2Client;
  }
  
  // Otherwise, need to authenticate
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:5001/oauth2callback'
  );
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  
  console.log('Authorize this app by visiting this url:', authUrl);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oauth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        oauth2Client.setCredentials(token);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
        console.log('Token stored to', TOKEN_PATH);
        resolve(oauth2Client);
      });
    });
  });
}

async function testMeetCreation() {
  try {
    console.log('🔑 Getting authentication...');
    const auth = await getAuth();
    
    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    
    console.log(`📌 Using Calendar ID: ${calendarId}`);
    
    const now = new Date();
    const startTime = new Date(now.getTime() + 3600000).toISOString();
    const endTime = new Date(now.getTime() + 7200000).toISOString();
    
    console.log('\n📝 Creating test event with Google Meet...');
    
    const event = {
      summary: 'SkillSwap Test Meeting',
      description: 'Testing Google Meet integration',
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
          requestId: `test-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };
    
    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
      conferenceDataVersion: 1,
    });
    
    if (response.data.hangoutLink) {
      console.log('\n✅ SUCCESS! Google Meet Link Generated:');
      console.log(`🔗 ${response.data.hangoutLink}`);
      console.log(`📅 Event ID: ${response.data.id}`);
      
      // Clean up
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: response.data.id,
      });
      console.log('\n✅ Test event deleted');
    } else {
      console.log('\n⚠️ Event created but no Meet link');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Details:', error.response.data);
    }
  }
}

testMeetCreation();