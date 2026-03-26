// backend/services/upiIntentService.js

// Generate UPI Intent Link for Withdrawals
const generateUPIIntent = (withdrawal, teacher, amount) => {
  // Standard UPI Intent URL format
  const upiUrl = new URL('upi://pay');
  
  // Payment parameters
  const params = {
    pa: process.env.MERCHANT_UPI_ID || 'merchant@okhdfcbank', // Your merchant UPI ID
    pn: 'SkillSwap', // Payee name
    am: amount, // Amount
    tn: `Withdrawal #${withdrawal._id.toString().slice(-8)}`, // Transaction note
    cu: 'INR', // Currency
    mc: '0000', // Merchant code (optional)
    mode: '0', // 0 = UPI Intent
    orgid: 'SkillSwap' // Organization ID
  };
  
  // Build UPI URL
  Object.keys(params).forEach(key => {
    upiUrl.searchParams.append(key, params[key]);
  });
  
  return upiUrl.toString();
};

// Generate QR Code for UPI (alternative)
const generateUPIQR = async (withdrawal, teacher, amount) => {
  const QRCode = require('qrcode');
  const upiLink = generateUPIIntent(withdrawal, teacher, amount);
  const qrCode = await QRCode.toDataURL(upiLink);
  return { upiLink, qrCode };
};

module.exports = { generateUPIIntent, generateUPIQR };