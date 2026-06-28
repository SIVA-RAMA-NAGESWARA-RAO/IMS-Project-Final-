/**
 * Admin Seed Script — Bootstrap the first admin account.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=SuperSecure123 node src/seed/seedAdmin.js
 *
 * Or configure ADMIN_EMAIL / ADMIN_PASSWORD in .env and run:
 *   npm run seed:admin
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');

const seedAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'System Admin';

  if (!email || !password) {
    console.error('❌ Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this script.');
    process.exit(1);
  }

  await connectDB();

  const exists = await User.findOne({ email });
  if (exists) {
    console.log(`⚠️  User "${email}" already exists (role: ${exists.role}).`);
    if (exists.role !== 'admin') {
      exists.role = 'admin';
      exists.isVerified = true;
      exists.isActive = true;
      await exists.save();
      console.log(`✅ Role upgraded to admin.`);
    } else {
      console.log(`✅ Already an admin — no changes needed.`);
    }
  } else {
    await User.create({
      name,
      email,
      password, // Let the User model's pre-save hook handle hashing
      role: 'admin',
      isVerified: true,
      isActive: true,
    });
    console.log(`✅ Admin account created: ${email}`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
