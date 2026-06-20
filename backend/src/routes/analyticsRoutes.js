const express = require('express');
const { funnelSummary, proxyReport } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

router.get('/funnel', protect, allow('hr'), funnelSummary);
router.get('/:report', protect, allow('hr'), proxyReport); // time-to-hire, interviewer-performance, etc.

module.exports = router;
