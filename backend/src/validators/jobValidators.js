const { body } = require('express-validator');

const createJobRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 150 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('department').optional().trim().isLength({ max: 100 }),
  body('location').optional().trim().isLength({ max: 150 }),
  body('employmentType').optional().isIn(['full-time', 'part-time', 'contract', 'internship']),
  body('skillsRequired').optional().isArray(),
];

module.exports = { createJobRules };
