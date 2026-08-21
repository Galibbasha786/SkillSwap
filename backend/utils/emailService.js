// backend/utils/emailService.js

const nodemailer = require('nodemailer');
const User = require('../models/User');

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const createSMTPTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  });
};

const sendEmail = async (to, subject, html) => {
  const transporter = createSMTPTransporter();

  if (!transporter) {
    console.log(`📧 [SKIPPED] Email to ${to}: ${subject}`);
    return true;
  }

  try {
    await transporter.sendMail({
      from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`✅ Email sent via SMTP to ${to}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Email failed (non-blocking) to ${to}: ${error.message}`);
    return false;
  }
};

const sendOTPEmail = async (email, otp, type = 'verification') => {
  const subject =
    type === 'verification' ? 'Verify Your SkillSwap Account' : 'Reset Your SkillSwap Password';

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
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>SkillSwap</h1></div>
        <div class="content">
          <h2>${type === 'verification' ? 'Verify Your Email' : 'Password Reset'}</h2>
          <p>Your OTP code is:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
          <p><a href="${clientUrl}">Visit SkillSwap</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, subject, html);
};

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
    <body style="font-family: Arial, sans-serif; color: #333;">
      <h2>New session booked</h2>
      <p>Hello ${teacher.name},</p>
      <p><strong>${learner.name}</strong> booked <strong>${session.skillName}</strong>.</p>
      <p>Date: ${formattedDate} at ${formattedTime}</p>
      <p>Duration: ${session.duration} minutes</p>
      <p>Total: ₹${session.totalAmount}</p>
      <p><a href="${clientUrl}/sessions/${session._id}">View session</a></p>
    </body>
    </html>
  `;

  return sendEmail(
    teacher.email,
    `New session booked: ${session.skillName} with ${learner.name}`,
    html
  );
};

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
    <body style="font-family: Arial, sans-serif; color: #333;">
      <h2>Session confirmed</h2>
      <p>Hello ${learner.name},</p>
      <p>Your session with <strong>${teacher.name}</strong> is confirmed.</p>
      <p>Skill: ${session.skillName}</p>
      <p>Date: ${formattedDate} at ${formattedTime}</p>
      <p>Duration: ${session.duration} minutes</p>
      ${session.meetLink ? `<p><a href="${session.meetLink}">Join meeting</a></p>` : ''}
      <p><a href="${clientUrl}/sessions/${session._id}">View session</a></p>
    </body>
    </html>
  `;

  return sendEmail(
    learner.email,
    `Session confirmed: ${session.skillName} with ${teacher.name}`,
    html
  );
};

const sendSessionConfirmationEmails = async (session) => {
  const teacher =
    session.teacherId?.email ? session.teacherId : await User.findById(session.teacherId);
  const learner =
    session.learnerId?.email ? session.learnerId : await User.findById(session.learnerId);

  if (!teacher || !learner) {
    console.warn('⚠️ Skipping session emails: teacher or learner not found');
    return;
  }

  await Promise.all([
    sendSessionBookedToTeacher(session, teacher, learner),
    sendSessionBookedToLearner(session, teacher, learner)
  ]);
};

module.exports = {
  sendOTPEmail,
  generateOTP,
  sendSessionBookedToTeacher,
  sendSessionBookedToLearner,
  sendSessionConfirmationEmails
};
