// backend/utils/emailService.js

const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Initialize Resend only if API key exists and in production
let resend = null;
if (process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Resend initialized for production');
}

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Determine which email provider to use
const shouldUseResend = () => {
  return process.env.NODE_ENV === 'production' && process.env.RESEND_API_KEY;
};

// Create SMTP transporter (for localhost/development)
const createSMTPTransporter = () => {
  // Only create if SMTP credentials exist
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ SMTP credentials missing, emails will be logged to console');
    return null;
  }
  
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

// Generic email sender
const sendEmail = async (to, subject, html) => {
  const useResend = shouldUseResend();
  
  console.log(`📧 Sending email to ${to} via ${useResend ? 'Resend' : 'SMTP/Console'}`);
  
  // In development without SMTP, just log to console
  if (process.env.NODE_ENV !== 'production' && !process.env.EMAIL_USER) {
    console.log(`\n📧 [DEV MODE] Email would be sent to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML: ${html.substring(0, 200)}...\n`);
    return true;
  }
  
  if (useResend && resend) {
    // Production: Use Resend
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || 'SkillSwap <noreply@skillswap.com>',
        to: to,
        subject: subject,
        html: html,
      });
      
      if (error) throw new Error(error.message);
      console.log(`✅ Email sent via Resend: ${data?.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Resend email error:`, error.message);
      throw error;
    }
  } else {
    // Localhost: Use SMTP
    const transporter = createSMTPTransporter();
    
    if (!transporter) {
      console.log(`📧 [FALLBACK] Would send email to: ${to}`);
      return true;
    }
    
    try {
      await transporter.sendMail({
        from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html,
      });
      console.log(`✅ Email sent via SMTP to ${to}`);
      return true;
    } catch (error) {
      console.error(`❌ SMTP email error:`, error.message);
      throw error;
    }
  }
};

// Send OTP email
const sendOTPEmail = async (email, otp, type = 'verification') => {
  const subject = type === 'verification' 
    ? 'Verify Your SkillSwap Account' 
    : 'Reset Your SkillSwap Password';
  
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px; }
        .otp-code { background: #f5f5f5; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; padding-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>SkillSwap</h1>
        </div>
        <div class="content">
          <h2>${type === 'verification' ? 'Verify Your Email' : 'Password Reset'}</h2>
          <p>Your OTP code is:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr />
          <p style="color: #666; font-size: 12px;">SkillSwap - Exchange Skills, Learn Together</p>
          <p style="color: #666; font-size: 12px;">
            <a href="${clientUrl}" style="color: #667eea;">Visit our website</a>
          </p>
        </div>
        <div class="footer">
          <p>© 2024 SkillSwap. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, html);
};

// Send Session Booked Email to Teacher
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
  
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

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
          
          <a href="${clientUrl}/sessions/${session._id}" class="button">View Session Details</a>
          
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

  return await sendEmail(teacher.email, `🎉 New Session Booked: ${session.skillName} with ${learner.name}`, html);
};

// Send Session Confirmation Email to Learner
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
  
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

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
          
          <a href="${clientUrl}/sessions/${session._id}" class="button">View Session Details</a>
          
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

  return await sendEmail(learner.email, `✅ Session Confirmed: ${session.skillName} with ${teacher.name}`, html);
};

module.exports = { 
  sendOTPEmail,
  generateOTP,
  sendSessionBookedToTeacher,
  sendSessionBookedToLearner,
};