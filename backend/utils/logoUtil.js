// backend/utils/logoUtil.js

const fs = require('fs');
const path = require('path');

// Convert logo to base64
const getLogoBase64 = () => {
  try {
    // Try to read logo from frontend assets
    const logoPath = path.join(__dirname, '../../frontend-web/src/assets/skillswaplogo.jpg');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    }
    // Fallback - return null if logo not found
    console.log('⚠️ Logo not found, using text logo');
    return null;
  } catch (error) {
    console.log('⚠️ Error loading logo:', error.message);
    return null;
  }
};

module.exports = { getLogoBase64 };