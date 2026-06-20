const asyncHandler = require('express-async-handler');
const AuditLog = require('../models/AuditLog');

// @desc HR/Admin: paginated, filterable view of the audit trail
// @route GET /api/audit?page=&limit=&action=&userId=
const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.userId) filter.user = req.query.userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, page, limit, total, totalPages: Math.ceil(total / limit) });
});

module.exports = { listAuditLogs };
