// backend/services/upiService.js

const QRCode = require('qrcode');
const crypto = require('crypto');

// Platform UPI ID (Admin's UPI)
const PLATFORM_UPI_ID = process.env.PLATFORM_UPI_ID || 'skillswap@okhdfcbank';
const PLATFORM_NAME = 'SkillSwap';

// Generate UPI Intent Link for payment to platform
const generateUPIIntent = (amount, orderId, studentName, skillName) => {
  const upiIntent = `upi://pay?pa=${encodeURIComponent(PLATFORM_UPI_ID)}&pn=${encodeURIComponent(PLATFORM_NAME)}&am=${amount}&tn=${encodeURIComponent(`Payment for ${skillName} session`)}&cu=INR`;
  return upiIntent;
};

// Generate UPI QR Code for payment to platform
const generateUPIQR = async (amount, orderId, studentName, skillName) => {
  const upiIntent = generateUPIIntent(amount, orderId, studentName, skillName);
  const qrCode = await QRCode.toDataURL(upiIntent);
  return { upiIntent, qrCode };
};

// Generate unique order ID
const generateOrderId = () => {
  return `SKILLSWAP_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
};

// Verify UPI payment (simulate verification)
// In production, you would integrate with bank API
const verifyUPIPayment = async (transactionId, amount, upiId) => {
  console.log(`Verifying UPI payment: TXN: ${transactionId}, Amount: ₹${amount}, UPI: ${upiId}`);
  
  // Simulate verification delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // In production, you would call UPI verification API here
  // For demo, we'll consider it successful
  return { success: true, message: 'Payment verified successfully' };
};

module.exports = {
  generateUPIIntent,
  generateUPIQR,
  generateOrderId,
  verifyUPIPayment,
  PLATFORM_UPI_ID,
  PLATFORM_NAME
};