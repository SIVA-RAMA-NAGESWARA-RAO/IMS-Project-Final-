const express = require('express');
const {
  getMyProfile,
  upsertMyProfile,
  uploadResume,
  addDocument,
  uploadResumeFile,
  uploadDocumentFile,
  listCandidates,
} = require('../controllers/candidateController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { uploadResume: uploadResumeMiddleware, uploadDocument: uploadDocumentMiddleware } = require('../middleware/upload');

const router = express.Router();

router.get('/me', protect, allow('candidate'), getMyProfile);
router.put('/me', protect, allow('candidate'), upsertMyProfile);

// Legacy JSON-URL endpoints (useful in dev without Cloudinary credentials set up yet)
router.post('/me/resume', protect, allow('candidate'), uploadResume);
router.post('/me/documents', protect, allow('candidate'), addDocument);

// Real file upload endpoints (Cloudinary-backed, Module 2)
router.post('/me/resume/upload', protect, allow('candidate'), uploadResumeMiddleware, uploadResumeFile);
router.post('/me/documents/upload', protect, allow('candidate'), uploadDocumentMiddleware, uploadDocumentFile);

router.get('/', protect, allow('hr'), listCandidates);

module.exports = router;
