// backend/middleware/captcha.js

const axios = require('axios');

/**
 * Verify reCAPTCHA token
 * @param {string} captchaToken - The CAPTCHA token from the frontend
 * @returns {Promise<boolean>} - Whether the CAPTCHA is valid
 */
const verifyCaptcha = async (captchaToken) => {
  try {
    if (!captchaToken) {
      return false;
    }

    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captchaToken
        }
      }
    );

    // reCAPTCHA v2 returns 'success' field
    // Consider a score of 0.5 and above as valid for v3, or just check success for v2
    const { success, score } = response.data;
    
    // For reCAPTCHA v2 (checkbox), just check success
    // For reCAPTCHA v3, you could add score checking: score >= 0.5
    return success === true;
  } catch (error) {
    console.error('❌ CAPTCHA verification error:', error.message);
    return false;
  }
};

/**
 * Middleware to verify CAPTCHA token
 */
const captchaMiddleware = async (req, res, next) => {
  try {
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.warn('⚠️ RECAPTCHA_SECRET_KEY not set — skipping CAPTCHA verification');
      return next();
    }

    const { captchaToken } = req.body;

    if (!captchaToken) {
      return res.status(400).json({ message: 'CAPTCHA token is required' });
    }

    const isValid = await verifyCaptcha(captchaToken);
    
    if (!isValid) {
      return res.status(400).json({ message: 'CAPTCHA verification failed' });
    }

    // Store captcha validation status in request
    req.captchaVerified = true;
    next();
  } catch (error) {
    console.error('❌ CAPTCHA middleware error:', error);
    res.status(500).json({ message: 'CAPTCHA verification error' });
  }
};

module.exports = {
  captchaMiddleware,
  verifyCaptcha
};
