const express = require('express');
const { createJob, listJobs, getJob, updateJob, closeJob } = require('../controllers/jobController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const { createJobRules } = require('../validators/jobValidators');

const router = express.Router();

router.get('/', listJobs); // public-ish: candidates browse open jobs (auth optional in real deployment)
router.get('/:id', getJob);
router.post('/', protect, allow('hr'), createJobRules, validate, createJob);
router.put('/:id', protect, allow('hr'), createJobRules, validate, updateJob);
router.patch('/:id/close', protect, allow('hr'), closeJob);

module.exports = router;
