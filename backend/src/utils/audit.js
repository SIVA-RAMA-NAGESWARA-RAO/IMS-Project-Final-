const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit trail write. Never throws into the caller's
 * request lifecycle — a logging failure should not break a workflow.
 */
const logAction = async ({ req, user, action, entityType, entityId, metadata }) => {
  try {
    await AuditLog.create({
      user: user || req?.user?._id,
      action,
      entityType,
      entityId,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      metadata,
    });
  } catch (err) {
    console.warn(`[audit] failed to record "${action}": ${err.message}`);
  }
};

module.exports = { logAction };
