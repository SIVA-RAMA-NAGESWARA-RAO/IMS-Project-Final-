const express = require('express');
const {
  applyToJob,
  myApplications,
  listApplications,
  getApplication,
  updateStatus,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const { applyRules, updateStatusRules } = require('../validators/applicationValidators');

const router = express.Router();

router.post('/', protect, allow('candidate'), applyRules, validate, applyToJob);
router.get('/mine', protect, allow('candidate'), myApplications);
router.get('/', protect, allow('hr'), listApplications);
router.get('/:id', protect, getApplication);
router.patch('/:id/status', protect, allow('hr'), updateStatusRules, validate, updateStatus);

module.exports = router;
