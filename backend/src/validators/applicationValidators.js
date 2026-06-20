const { body } = require('express-validator');
const { APPLICATION_STATUS } = require('../config/constants');

const applyRules = [
  body('jobId').isMongoId().withMessage('A valid jobId is required'),
  body('coverNote').optional().trim().isLength({ max: 2000 }),
];

const updateStatusRules = [
  body('status').isIn(APPLICATION_STATUS).withMessage(`status must be one of: ${APPLICATION_STATUS.join(', ')}`),
  body('note').optional().trim().isLength({ max: 1000 }),
];

module.exports = { applyRules, updateStatusRules };
