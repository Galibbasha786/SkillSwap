// backend/scripts/addPasswordToAdmin.js

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const addPasswordToAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/SkillSwap');
    
    const adminEmail = 'syedsunnygalibbasha@gmail.com';
    const adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin found:', adminUser.email);
    console.log('Current role:', adminUser.role);
    console.log('Has password?', adminUser.password ? 'Yes' : 'No');
    console.log('Has Google login?', adminUser.googleId ? 'Yes' : 'No');
    
    // Set password for admin (same as email for convenience)
    const password = 'syedsunnygalibbasha@gmail.com';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    adminUser.password = hashedPassword;
    adminUser.role = 'admin'; // Ensure role is admin
    await adminUser.save();
    
    console.log('\n✅ Password added successfully!');
    console.log('📝 Login credentials:');
    console.log('   Email:', adminEmail);
    console.log('   Password:', password);
    console.log('   Role:', adminUser.role);
    console.log('\n💡 You can now login with email/password OR continue using Google login');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addPasswordToAdmin();