const express = require('express');
const { proposeAction, executeAction, chatWithAgent } = require('../controllers/agentController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

// ─── AI Super-Agent — Automate EVERYTHING via natural language ───────────────
// Only authorized roles can use the AI agent.
router.post('/propose', protect, allow('candidate', 'hr', 'interviewer', 'admin'), proposeAction);
router.post('/execute', protect, allow('candidate', 'hr', 'interviewer', 'admin'), executeAction);

// ─── Conversational Chat — General Q&A with multi-turn context ──────────────
router.post('/chat', protect, allow('candidate', 'hr', 'interviewer', 'admin'), chatWithAgent);

module.exports = router;
