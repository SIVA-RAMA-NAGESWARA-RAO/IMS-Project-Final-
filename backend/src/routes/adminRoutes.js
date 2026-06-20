const express = require('express');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const CandidateProfile = require('../models/Candidate');
const Otp = require('../models/Otp');

const router = express.Router();

// Secret key to protect this admin panel — stored as env var
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'ims-admin-secret-2026';

const checkSecret = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden: invalid admin secret' });
  }
  next();
};

// GET /api/admin/users — list all users
router.get('/users', checkSecret, asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
  res.json({ count: users.length, users });
}));

// DELETE /api/admin/users/:email — delete a user by email (for testing)
router.delete('/users/:email', checkSecret, asyncHandler(async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Remove all related data
  await CandidateProfile.deleteOne({ user: user._id });
  await Otp.deleteMany({ email });
  await User.deleteOne({ _id: user._id });

  res.json({ message: `User "${email}" and all related data deleted successfully.` });
}));

// DELETE /api/admin/users — delete ALL users (nuclear option, for dev testing)
router.delete('/users', checkSecret, asyncHandler(async (req, res) => {
  const { confirm } = req.query;
  if (confirm !== 'yes') {
    return res.status(400).json({ error: 'Add ?confirm=yes to delete ALL users' });
  }
  await User.deleteMany({});
  await CandidateProfile.deleteMany({});
  await Otp.deleteMany({});
  res.json({ message: 'All users deleted.' });
}));

module.exports = router;
