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
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
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
  generateOTP 
};