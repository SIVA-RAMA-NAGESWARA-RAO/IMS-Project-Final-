/**
 * Admin Routes — Enterprise RBAC.
 *
 * All endpoints require JWT authentication via `protect` middleware
 * and the `admin` role via `allow('admin')`. The old x-admin-secret
 * header approach has been removed.
 */
const express = require('express');
const {
  inviteHr,
  inviteInterviewer,
  listUsers,
  deactivateUser,
  activateUser,
  deleteUser,
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// All admin routes require authentication + admin role.
router.use(protect, allow('admin'));

// Invite new HR / Interviewer users (replaces public registration for privileged roles).
router.post('/invite-hr', inviteHr);
router.post('/invite-interviewer', inviteInterviewer);

// User management.
router.get('/users', listUsers);
router.patch('/users/:id/deactivate', deactivateUser);
router.patch('/users/:id/activate', activateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
