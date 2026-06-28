const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ path: '.env' });

const seedAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ims');
    console.log('Connected to MongoDB');

    const admins = [
      {
        name: 'Super Admin One',
        email: 'admin1@ims.example.com',
        password: 'SecurePassword123!',
        role: 'admin',
        isVerified: true
      },
      {
        name: 'Super Admin Two',
        email: 'admin2@ims.example.com',
        password: 'SecurePassword123!',
        role: 'admin',
        isVerified: true
      }
    ];

    for (const admin of admins) {
      const exists = await User.findOne({ email: admin.email });
      if (!exists) {
        await User.create(admin);
        console.log(`Created admin: ${admin.email}`);
      } else {
        console.log(`Admin already exists: ${admin.email}`);
      }
    }

    console.log('Seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admins:', error);
    process.exit(1);
  }
};

seedAdmins();
