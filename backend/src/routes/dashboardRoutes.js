const express = require('express');
const {
  getPipelineOverview,
  getTimeToHire,
  getConversionFunnel,
  getInterviewerWorkload,
  getOfferStats,
  getJobsOverview,
  getKPISummary,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// All dashboard endpoints are HR/Admin only
router.use(protect, allow('hr', 'admin'));

router.get('/kpi', getKPISummary);
router.get('/pipeline', getPipelineOverview);
router.get('/time-to-hire', getTimeToHire);
router.get('/funnel', getConversionFunnel);
router.get('/interviewer-workload', getInterviewerWorkload);
router.get('/offer-stats', getOfferStats);
router.get('/jobs-overview', getJobsOverview);

module.exports = router;
