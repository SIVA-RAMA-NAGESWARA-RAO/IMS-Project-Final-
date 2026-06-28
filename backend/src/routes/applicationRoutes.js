const express = require('express');
const {
  applyToJob,
  myApplications,
  listApplications,
  getApplication,
  updateStatus,
  applyToJobPublic,
  uploadResumePublic,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { verifyOwnership } = require('../middleware/verifyOwnership');
const { validate } = require('../middleware/validate');
const { applyRules, updateStatusRules } = require('../validators/applicationValidators');
const { uploadResume } = require('../middleware/upload');

const router = express.Router();

router.post('/apply', applyToJobPublic);
router.post('/upload-resume', uploadResume, uploadResumePublic);
router.post('/', protect, allow('candidate'), applyRules, validate, applyToJob);
router.get('/mine', protect, allow('candidate'), myApplications);
router.get('/', protect, allow('hr', 'admin'), listApplications);
// IDOR protection: candidates can only view their own applications.
router.get('/:id', protect, verifyOwnership('Application', 'candidate'), getApplication);
router.patch('/:id/status', protect, allow('hr', 'admin'), updateStatusRules, validate, updateStatus);

module.exports = router;
