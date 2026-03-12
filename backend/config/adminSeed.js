const User = require('../models/User');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);
      
      // Create admin user
      const admin = await User.create({
        name: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        isVerified: true,
        isActive: true,
        bio: 'System Administrator'
      });
      
      console.log('✅ Admin account created successfully');
      console.log(`📧 Email: ${process.env.ADMIN_EMAIL}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD} (Change this after first login!)`);
    } else {
      console.log('👑 Admin account already exists');
    }
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  }
};

module.exports = seedAdmin;