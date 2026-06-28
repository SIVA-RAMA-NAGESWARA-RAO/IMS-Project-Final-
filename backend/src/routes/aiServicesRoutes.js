const express = require('express');
const {
  parseResume,
  anonymizeResume,
  draftScorecard,
  generateQuestions,
  rankCandidates,
} = require('../controllers/aiServicesController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// ─── Resume Parser — any authenticated user (candidates parse their own) ────
router.post('/parse-resume', protect, parseResume);

// ─── Resume Anonymizer — HR/Admin only (for blind screening) ────────────────
router.post('/anonymize-resume', protect, allow('hr', 'admin'), anonymizeResume);

// ─── Scorecard Draft — HR/Interviewers/Admin generate drafts from their notes ────────
router.post('/draft-scorecard', protect, allow('hr', 'interviewer', 'admin'), draftScorecard);

// ─── Interview Question Generator — HR/Admin create question banks ──────────
router.post('/generate-questions', protect, allow('hr', 'admin'), generateQuestions);

// ─── Candidate Ranking — HR/Admin rank candidates for a job ─────────────────
router.post('/rank-candidates', protect, allow('hr', 'admin'), rankCandidates);

module.exports = router;
