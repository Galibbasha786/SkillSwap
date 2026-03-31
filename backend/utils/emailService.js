// backend/utils/emailService.js

const nodemailer = require('nodemailer');

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create transporter with retry logic
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send OTP email with retry
const sendOTPEmail = async (email, otp, type = 'verification') => {
  const subject = type === 'verification' 
    ? 'Verify Your SkillSwap Account' 
    : 'Reset Your SkillSwap Password';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">SkillSwap</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none;">
        <h2>${type === 'verification' ? 'Email Verification' : 'Password Reset'}</h2>
        <p>Your OTP code is:</p>
        <div style="background: #f5f5f5; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 8px;">
          ${otp}
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">SkillSwap - Exchange Skills, Learn Together</p>
      </div>
    </div>
  `;

  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
        to: email,
        subject,
        html,
      });
      console.log(`✅ Email sent to ${email}`);
      return true;
    } catch (error) {
      lastError = error;
      console.log(`❌ Email attempt ${i + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError || new Error('Failed to send email after 3 attempts');
};

// ✅ NEW: Send Session Booked Email to Teacher
const sendSessionBookedToTeacher = async (session, teacher, learner) => {
  const sessionDate = new Date(session.date);
  const formattedDate = sessionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
        .skill-badge { background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 20px; display: inline-block; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 New Session Booked!</h1>
          <p>You have a new student waiting to learn from you</p>
        </div>
        <div class="content">
          <h2>Hello ${teacher.name},</h2>
          <p>Great news! <strong>${learner.name}</strong> has booked a session with you.</p>
          
          <div class="session-details">
            <h3>📋 Session Details</h3>
            <p><strong>📚 Skill:</strong> <span class="skill-badge">${session.skillName}</span></p>
            <p><strong>📅 Date:</strong> ${formattedDate}</p>
            <p><strong>⏰ Time:</strong> ${formattedTime}</p>
            <p><strong>⏱️ Duration:</strong> ${session.duration} minutes</p>
            <p><strong>💰 Rate:</strong> ₹${session.hourlyRate}/hour</p>
            <p><strong>💵 Total Amount:</strong> ₹${session.totalAmount}</p>
            <p><strong>🏦 Your Earnings:</strong> ₹${session.teacherEarnings}</p>
          </div>
          
          <p><strong>👤 About the Student:</strong></p>
          <ul>
            <li>Name: ${learner.name}</li>
            <li>Email: ${learner.email}</li>
            <li>Rating: ${learner.rating || 'New'} ⭐</li>
          </ul>
          
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/sessions/${session._id}" class="button">View Session Details</a>
          
          <p style="margin-top: 20px;"><strong>📌 Important:</strong></p>
          <ul>
            <li>Please join the meeting at the scheduled time</li>
            <li>You can start the session by clicking "Start Session" in your dashboard</li>
            <li>After the session, mark it as completed to receive payment</li>
          </ul>
          
          <p>Happy Teaching! 🎓<br>Team SkillSwap</p>
        </div>
        <div class="footer">
          <p>© 2024 SkillSwap. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
        to: teacher.email,
        subject: `🎉 New Session Booked: ${session.skillName} with ${learner.name}`,
        html,
      });
      console.log(`✅ Session email sent to teacher: ${teacher.email}`);
      return true;
    } catch (error) {
      lastError = error;
      console.log(`❌ Email attempt ${i + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError || new Error('Failed to send email after 3 attempts');
};

// ✅ NEW: Send Session Confirmation Email to Learner
const sendSessionBookedToLearner = async (session, teacher, learner) => {
  const sessionDate = new Date(session.date);
  const formattedDate = sessionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .session-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
        .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
        .meet-link { background: #f0fdf4; padding: 12px; border-radius: 8px; border: 1px solid #86efac; margin: 15px 0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Session Confirmed!</h1>
          <p>Your learning journey begins soon</p>
        </div>
        <div class="content">
          <h2>Hello ${learner.name},</h2>
          <p>Your session with <strong>${teacher.name}</strong> has been confirmed!</p>
          
          <div class="session-details">
            <h3>📋 Session Details</h3>
            <p><strong>📚 Skill:</strong> ${session.skillName}</p>
            <p><strong>📅 Date:</strong> ${formattedDate}</p>
            <p><strong>⏰ Time:</strong> ${formattedTime}</p>
            <p><strong>⏱️ Duration:</strong> ${session.duration} minutes</p>
            <p><strong>💰 Rate:</strong> ₹${session.hourlyRate}/hour</p>
            <p><strong>💵 Total Amount:</strong> ₹${session.totalAmount}</p>
          </div>
          
          ${session.meetLink ? `
            <div class="meet-link">
              <strong>🔗 Meeting Link:</strong><br/>
              <a href="${session.meetLink}" target="_blank">${session.meetLink}</a>
              <p style="font-size: 12px; margin-top: 5px;">Click the link to join at the scheduled time</p>
            </div>
          ` : ''}
          
          <p><strong>👤 About Your Teacher:</strong></p>
          <ul>
            <li>Name: ${teacher.name}</li>
            <li>Email: ${teacher.email}</li>
            <li>Rating: ${teacher.rating || 'New'} ⭐</li>
            <li>Total Sessions: ${teacher.totalSessions || 0}</li>
          </ul>
          
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/sessions/${session._id}" class="button">View Session Details</a>
          
          <p style="margin-top: 20px;"><strong>📌 Tips for a Great Session:</strong></p>
          <ul>
            <li>Join the meeting 5 minutes early</li>
            <li>Prepare your questions in advance</li>
            <li>Ensure your mic and camera are working</li>
            <li>Take notes during the session</li>
          </ul>
          
          <p>After the session, don't forget to rate your teacher!</p>
          
          <p>Happy Learning! 📚<br>Team SkillSwap</p>
        </div>
        <div class="footer">
          <p>© 2024 SkillSwap. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
        to: learner.email,
        subject: `✅ Session Confirmed: ${session.skillName} with ${teacher.name}`,
        html,
      });
      console.log(`✅ Session confirmation email sent to learner: ${learner.email}`);
      return true;
    } catch (error) {
      lastError = error;
      console.log(`❌ Email attempt ${i + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw lastError || new Error('Failed to send email after 3 attempts');
};

// For development - log OTP to console instead of sending email
const sendOTPEmailDev = async (email, otp, type = 'verification') => {
  console.log(`\n📧 [DEV MODE] OTP for ${email}: ${otp}\n`);
  return true;
};

module.exports = { 
  sendOTPEmail: process.env.NODE_ENV === 'production' ? sendOTPEmail : sendOTPEmailDev,
  generateOTP,
  sendSessionBookedToTeacher,
  sendSessionBookedToLearner
};