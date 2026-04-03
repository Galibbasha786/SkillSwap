// backend/controllers/authController.js

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { sendOTPEmail, generateOTP } = require('../utils/emailService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// @desc    Register user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await User.create({
      name,
      email,
      password: hashedPassword,
      isEmailVerified: false,
      otp: { code: otp, expiresAt, type: 'verification' }
    });

    // Send OTP email asynchronously (don't block registration if email fails)
    sendOTPEmail(email, otp, 'verification').catch(err => {
      console.error(`⚠️ Email send failed for ${email}:`, err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please verify your email.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: false
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send OTP
exports.sendOTP = async (req, res) => {
  try {
    const { email, type = 'verification' } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = { code: otp, expiresAt, type };
    await user.save();

    // Send OTP email asynchronously (don't block if email fails)
    sendOTPEmail(email, otp, type).catch(err => {
      console.error(`⚠️ Email send failed for ${email}:`, err.message);
    });

    res.json({ success: true, message: `OTP sent to ${email}` });
  } catch (error) {
    console.error('❌ Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// @desc    Verify OTP
// backend/controllers/authController.js

// @desc    Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp, type = 'verification' } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check OTP
    if (!user.otp || user.otp.code !== otp || user.otp.type !== type) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check expiration
    if (user.otp.expiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    // ✅ For verification type, clear OTP after verification
    // ✅ For reset type, keep OTP for password reset step
    if (type === 'verification') {
      user.otp = undefined;
      user.isEmailVerified = true;
    }
    // For reset type, we DON'T clear OTP here - keep it for the next step
    
    await user.save();

    res.json({ 
      success: true, 
      message: type === 'verification' ? 'Email verified successfully' : 'OTP verified'
    });
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

// @desc    Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({ 
        message: 'Email not verified. Please verify your email.',
        error: 'Email not verified'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { name, email, picture } = payload;
    
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({
        name,
        email,
        profileImage: picture,
        password: Math.random().toString(36),
        isEmailVerified: true
      });
    }
    
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
};

// @desc    Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
// backend/controllers/authController.js - Add this function

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
// backend/controllers/authController.js

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    console.log('🔐 Reset password attempt for:', email);

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ Verify OTP exists and matches
    if (!user.otp || user.otp.code !== otp || user.otp.type !== 'reset') {
      console.log('❌ Invalid OTP:', { 
        stored: user.otp?.code, 
        received: otp,
        type: user.otp?.type 
      });
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check expiration
    if (user.otp.expiresAt < new Date()) {
      console.log('❌ OTP expired at:', user.otp.expiresAt);
      return res.status(400).json({ message: 'OTP expired' });
    }

    // ✅ Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // ✅ Clear OTP only after successful password change
    user.otp = undefined;
    await user.save();

    console.log('✅ Password reset successful for:', email);

    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
// backend/controllers/authController.js
// Add this function

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Server error' });
  }
};