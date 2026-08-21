const mongoose = require('mongoose');

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/SkillSwap';

const maskMongoUri = (uri) =>
  String(uri || '').replace(/\/\/([^:@/]+):([^@/]+)@/, '//***:***@');

const getMongoCandidates = () => {
  const candidates = [
    process.env.MONGODB_URI,
    process.env.MONGO_URI,
    process.env.MONGODB_URI_LOCAL
  ];

  if (process.env.NODE_ENV !== 'production') {
    candidates.push(LOCAL_MONGO_URI);
  }

  return [...new Set(candidates.filter(Boolean))];
};

const connectDB = async () => {
  const candidates = getMongoCandidates();
  const failures = [];

  if (!candidates.length) {
    throw new Error('No MongoDB URI configured. Set MONGODB_URI in backend/.env');
  }

  for (const uri of candidates) {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }

      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 8000,
        family: 4
      });

      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      if (uri !== candidates[0]) {
        console.log(`ℹ️  Using fallback database: ${maskMongoUri(uri)}`);
      }

      try {
        const seedAdmin = require('./adminSeed');
        await seedAdmin();
      } catch (seedError) {
        console.log('Admin seed skipped:', seedError.message);
      }

      return conn;
    } catch (error) {
      failures.push(`${maskMongoUri(uri)} → ${error.message}`);
      console.warn(`⚠️  MongoDB unavailable (${maskMongoUri(uri)}): ${error.message}`);
    }
  }

  console.error('❌ Could not connect to any MongoDB instance.');
  failures.forEach((entry) => console.error(`   - ${entry}`));

  if (process.env.NODE_ENV !== 'production') {
    console.error('\nLocal dev checklist:');
    console.error('  • Start MongoDB: brew services start mongodb-community@7.0');
    console.error('  • Or set MONGODB_URI_LOCAL=mongodb://127.0.0.1:27017/SkillSwap');
    console.error('  • For Atlas: whitelist your IP in MongoDB Atlas → Network Access');
  }

  throw new Error('MongoDB connection failed');
};

module.exports = { connectDB, LOCAL_MONGO_URI };
