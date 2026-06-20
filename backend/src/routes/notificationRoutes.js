const express = require('express');
const { myNotifications, markRead, markAllRead, broadcast } = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', protect, myNotifications);
router.patch('/:id/read', protect, markRead);
router.patch('/read-all', protect, markAllRead);
router.post('/broadcast', protect, allow('hr'), broadcast);

module.exports = router;
