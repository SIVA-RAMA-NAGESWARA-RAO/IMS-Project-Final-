const express = require('express');
const {
  queryAnalytics,
  getFunnelData,
  getSkillMatch,
  getTimeToHire,
  getDepartmentSummary,
} = require('../controllers/aiAnalyticsController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// All AI analytics endpoints require HR or Admin role.
router.use(protect, allow('hr', 'admin'));

// Natural language → aggregation.
router.post('/', queryAnalytics);

// Pre-built chart data endpoints.
router.get('/funnel', getFunnelData);
router.post('/skill-match', getSkillMatch);
router.get('/time-to-hire', getTimeToHire);
router.get('/department-summary', getDepartmentSummary);

module.exports = router;
