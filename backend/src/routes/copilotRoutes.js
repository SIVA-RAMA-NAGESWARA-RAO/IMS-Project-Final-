const express = require('express');
const { chat } = require('../controllers/copilotController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All authenticated users can use the copilot.
router.post('/', protect, chat);

module.exports = router;
