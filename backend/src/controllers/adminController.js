/**
 * Admin Controller — Enterprise RBAC.
 *
 * Only users with role === 'admin' can access these endpoints.
 * Replaces the old x-admin-secret header approach with proper JWT auth.
 */
const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const User = require('../models/User');
const CandidateProfile = require('../models/Candidate');
const Otp = require('../models/Otp');
const { sendInviteEmail } = require('../services/emailService');
const { logAction } = require('../utils/audit');

/**
 * @desc  Invite a new HR user. Generates a random password and emails credentials.
 * @route POST /api/admin/invite-hr
 */
const inviteHr = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    res.status(400);
    throw new Error('name and email are required');
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  // Generate a secure random password the invitee will change on first login.
  const tempPassword = crypto.randomBytes(12).toString('base64url');

  const user = await User.create({
    name,
    email,
    password: tempPassword,
    role: 'hr',
    phone,
    isVerified: true, // Admin-provisioned — skip OTP.
    isActive: true,
  });

  // Email the temporary credentials.
  try {
    await sendInviteEmail(email, name, tempPassword, 'HR Manager');
  } catch (emailErr) {
    console.warn(`[admin] Invite email failed for ${email}: ${emailErr.message}`);
    // Account is still created — admin can share creds manually.
  }

  await logAction({
    req,
    action: 'hr_invited',
    entityType: 'User',
    entityId: user._id,
    metadata: { invitedBy: req.user._id, role: 'hr' },
  });

  res.status(201).json({
    message: `HR account created for ${email}. Temporary credentials emailed.`,
    user: user.toSafeObject(),
    tempPassword, // Also returned to admin in case email fails.
  });
});

/**
 * @desc  Invite a new Interviewer user.
 * @route POST /api/admin/invite-interviewer
 */
const inviteInterviewer = asyncHandler(async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email) {
    res.status(400);
    throw new Error('name and email are required');
  }

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const tempPassword = crypto.randomBytes(12).toString('base64url');

  const user = await User.create({
    name,
    email,
    password: tempPassword,
    role: 'interviewer',
    phone,
    isVerified: true,
    isActive: true,
  });

  try {
    await sendInviteEmail(email, name, tempPassword, 'Interviewer');
  } catch (emailErr) {
    console.warn(`[admin] Invite email failed for ${email}: ${emailErr.message}`);
  }

  await logAction({
    req,
    action: 'interviewer_invited',
    entityType: 'User',
    entityId: user._id,
    metadata: { invitedBy: req.user._id, role: 'interviewer' },
  });

  res.status(201).json({
    message: `Interviewer account created for ${email}. Temporary credentials emailed.`,
    user: user.toSafeObject(),
    tempPassword,
  });
});

/**
 * @desc  List all users (with pagination and optional role filter).
 * @route GET /api/admin/users?role=&page=&limit=
 */
const listUsers = asyncHandler(async (req, res) => {
  const { role } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 20, 100);

  const filter = {};
  if (role) filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  res.json({ users, page, limit, total, totalPages: Math.ceil(total / limit) });
});

/**
 * @desc  Deactivate (soft-delete) a user account.
 * @route PATCH /api/admin/users/:id/deactivate
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Prevent admins from deactivating themselves.
  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot deactivate your own account');
  }

  user.isActive = false;
  user.tokenVersion += 1; // Invalidate all sessions.
  await user.save();

  await logAction({
    req,
    action: 'user_deactivated',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({ message: `User ${user.email} deactivated.` });
});

/**
 * @desc  Re-activate a previously deactivated user.
 * @route PATCH /api/admin/users/:id/activate
 */
const activateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.isActive = true;
  await user.save();

  await logAction({
    req,
    action: 'user_activated',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({ message: `User ${user.email} re-activated.` });
});

/**
 * @desc  Delete a user by ID (hard delete — use sparingly).
 * @route DELETE /api/admin/users/:id
 */
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot delete your own account');
  }

  await CandidateProfile.deleteOne({ user: user._id });
  await Otp.deleteMany({ email: user.email });
  await User.deleteOne({ _id: user._id });

  await logAction({
    req,
    action: 'user_deleted',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({ message: `User ${user.email} deleted.` });
});

module.exports = {
  inviteHr,
  inviteInterviewer,
  listUsers,
  deactivateUser,
  activateUser,
  deleteUser,
};
