const { body } = require('express-validator');
const { RECOMMENDATION } = require('../config/constants');

const submitFeedbackRules = [
  body('interviewId').isMongoId().withMessage('A valid interviewId is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('recommendation').isIn(RECOMMENDATION).withMessage(`recommendation must be one of: ${RECOMMENDATION.join(', ')}`),
  body('strengths').optional().trim().isLength({ max: 2000 }),
  body('concerns').optional().trim().isLength({ max: 2000 }),
  body('comments').optional().trim().isLength({ max: 2000 }),
];

module.exports = { submitFeedbackRules };
