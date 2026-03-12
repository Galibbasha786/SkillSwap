const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use local MongoDB if no connection string in .env
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap';
    
    const conn = await mongoose.connect(mongoURI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Try to seed admin (ignore if fails)
    try {
      const seedAdmin = require('./adminSeed');
      await seedAdmin();
    } catch (seedError) {
      console.log('Admin seed skipped:', seedError.message);
    }
    
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.log('⚠️  Continuing without database...');
  }
};

module.exports = connectDB;