// Update existing Google OAuth users to have isOAuth: true
const mongoose = require('mongoose');
const User = require('./models/User');

async function updateOAuthUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap');

    // Update users who don't have isOAuth set but have a random password (starting with a number or short)
    const result = await User.updateMany(
      {
        isOAuth: { $ne: true },
        password: { $regex: /^.{1,10}$/ } // Assuming random passwords are short
      },
      { $set: { isOAuth: true } }
    );

    console.log(`Updated ${result.modifiedCount} users to isOAuth: true`);

    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
}

updateOAuthUsers();