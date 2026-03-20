// backend/test-google-calendar.js

const { google } = require('googleapis');
const path = require('path');
require('dotenv').config();

async function debugGoogleMeet() {
  console.log('🔍 Debugging Google Meet API Setup\n');
  
  // 1. Check Service Account File
  const keyFilePath = path.join(__dirname, './config/google-service-account.json');
  let serviceAccount;
  try {
    serviceAccount = require(keyFilePath);
    console.log('✅ Service Account file found');
    console.log(`   Email: ${serviceAccount.client_email}`);
    console.log(`   Project: ${serviceAccount.project_id}`);
  } catch (error) {
    console.log('❌ Service Account file missing or invalid');
    console.log('   Create one at: https://console.cloud.google.com/iam-admin/serviceaccounts');
    return;
  }
  
  // 2. Initialize Auth
  const auth = new google.auth.GoogleAuth({
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  
  if (!calendarId) {
    console.log('\n❌ GOOGLE_CALENDAR_ID not set in .env');
    console.log('   Get it from: Google Calendar → Settings → Integrate calendar');
    return;
  }
  
  console.log(`\n📌 Calendar ID: ${calendarId}`);
  
  // 3. Test Calendar Access
  console.log('\n🔍 Testing calendar access...');
  try {
    const calendarInfo = await calendar.calendars.get({ calendarId });
    console.log('✅ Calendar accessible:', calendarInfo.data.summary);
  } catch (error) {
    console.log('❌ Cannot access calendar:', error.message);
    console.log(`\n📌 Share your calendar with: ${serviceAccount.client_email}`);
    console.log('   Give "Make changes to events" permission');
    console.log('   Wait 5 minutes, then try again');
    return;
  }
  
  // 4. Try to Create a Simple Event (Without Meet)
  console.log('\n🔍 Testing simple event creation...');
  const now = new Date();
  const simpleEvent = {
    summary: 'Test Event',
    start: { dateTime: new Date(now.getTime() + 3600000).toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: new Date(now.getTime() + 7200000).toISOString(), timeZone: 'Asia/Kolkata' }
  };
  
  try {
    const eventResult = await calendar.events.insert({
      calendarId,
      resource: simpleEvent,
    });
    console.log('✅ Simple event created:', eventResult.data.id);
    
    // Clean up
    await calendar.events.delete({ calendarId, eventId: eventResult.data.id });
    console.log('   Event deleted');
  } catch (error) {
    console.log('❌ Cannot create simple event:', error.message);
    return;
  }
  
  // 5. Try to Create Event with Meet (This is the key test)
  console.log('\n🔍 Testing Google Meet link generation...');
  const meetEvent = {
    summary: 'Test Meet Event',
    start: { dateTime: new Date(now.getTime() + 7200000).toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: new Date(now.getTime() + 10800000).toISOString(), timeZone: 'Asia/Kolkata' },
    conferenceData: {
      createRequest: {
        requestId: `test-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' }
      }
    }
  };
  
  try {
    const meetResult = await calendar.events.insert({
      calendarId,
      resource: meetEvent,
      conferenceDataVersion: 1,
    });
    
    if (meetResult.data.hangoutLink) {
      console.log('✅✅✅ SUCCESS! Google Meet link generated:');
      console.log(`   ${meetResult.data.hangoutLink}`);
      
      // Clean up
      await calendar.events.delete({ calendarId, eventId: meetResult.data.id });
      console.log('   Test event deleted');
    } else {
      console.log('⚠️ Event created but no Meet link generated');
    }
  } catch (error) {
    console.log('❌ Meet link generation failed:', error.message);
    if (error.response?.data?.error?.errors) {
      console.log('   Details:', error.response.data.error.errors[0].message);
    }
    
    console.log('\n🔧 Common Fixes:');
    console.log('1. Enable Google Meet API:');
    console.log('   gcloud services enable meet.googleapis.com');
    console.log('2. Add role to service account:');
    console.log('   In Google Cloud Console → IAM → Add role: "Meeting Space Creator"');
    console.log('3. Ensure Google Meet API is enabled for your project');
  }
  
  console.log('\n📋 Summary:');
  console.log('   - Service Account:', serviceAccount.client_email);
  console.log('   - Calendar ID:', calendarId);
  console.log('   - Calendar Access:', '✅');
  console.log('   - Simple Events:', '✅');
  console.log('   - Meet Links:', meetResult?.data?.hangoutLink ? '✅' : '❌');
}

debugGoogleMeet();