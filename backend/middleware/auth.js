// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // TODO: re-enable one device / one login after testing
      // if (req.user.activeSessionId) {
      //   if (!decoded.sid || decoded.sid !== req.user.activeSessionId) {
      //     return res.status(401).json({
      //       message: 'Your account was logged in on another device.',
      //       code: 'SESSION_REPLACED'
      //     });
      //   }
      // }

      next();
    } catch (error) {
      console.error('Auth error:', error.message);
      // Return 401 for invalid tokens
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

module.exports = { auth, adminAuth };