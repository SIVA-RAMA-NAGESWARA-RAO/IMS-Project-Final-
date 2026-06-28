/**
 * IDOR (Insecure Direct Object Reference) Protection Middleware.
 *
 * Prevents users from accessing or mutating resources they don't own.
 * HR and Admin roles bypass the check (they have cross-account access).
 *
 * Usage in routes:
 *   const { verifyOwnership } = require('../middleware/verifyOwnership');
 *
 *   // Candidate can only view their own application:
 *   router.get('/:id', protect, verifyOwnership('Application', 'candidate'), getApplication);
 *
 *   // Interviewer can only modify interviews they're assigned to:
 *   router.patch('/:id/complete', protect, verifyOwnership('Interview', 'interviewers'), completeInterview);
 */
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

/**
 * @param {string} modelName     — Mongoose model name (e.g. 'Application', 'Interview')
 * @param {string} ownerField    — Field on the document linking to the owner's User ID
 *                                  (e.g. 'candidate', 'scheduledBy', 'interviewers')
 * @param {object} opts
 * @param {boolean} opts.hrBypass    — If true (default), HR role skips the check.
 * @param {boolean} opts.adminBypass — If true (default), Admin role skips the check.
 * @param {boolean} opts.isArray     — If true, ownerField is an array (e.g. 'interviewers').
 * @param {string}  opts.paramKey    — req.params key to read the resource ID from (default: 'id').
 */
const verifyOwnership = (modelName, ownerField, opts = {}) => {
  const {
    hrBypass = true,
    adminBypass = true,
    isArray = false,
    paramKey = 'id',
  } = opts;

  return asyncHandler(async (req, res, next) => {
    const userRole = req.user?.role;

    // Privileged roles bypass ownership checks.
    if ((hrBypass && userRole === 'hr') || (adminBypass && userRole === 'admin')) {
      return next();
    }

    const resourceId = req.params[paramKey];

    // Validate the ObjectId to avoid Mongoose CastErrors.
    if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
      res.status(400);
      throw new Error('Invalid resource ID');
    }

    const Model = mongoose.model(modelName);
    const resource = await Model.findById(resourceId).lean();

    if (!resource) {
      res.status(404);
      throw new Error(`${modelName} not found`);
    }

    const userId = req.user._id.toString();

    // Check ownership — supports both single-ref and array-ref fields.
    let isOwner = false;
    if (isArray) {
      const owners = resource[ownerField] || [];
      isOwner = owners.some((id) => id.toString() === userId);
    } else {
      const ownerId = resource[ownerField];
      isOwner = ownerId && ownerId.toString() === userId;
    }

    if (!isOwner) {
      res.status(403);
      throw new Error('Forbidden — you do not have access to this resource');
    }

    // Attach the loaded resource so the controller can skip a second DB read.
    req.resource = resource;
    next();
  });
};

module.exports = { verifyOwnership };
