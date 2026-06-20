const express = require('express');
const { listAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', protect, allow('hr'), listAuditLogs);

module.exports = router;
