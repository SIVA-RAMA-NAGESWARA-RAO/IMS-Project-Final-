const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// @desc List my notifications (Module 9)
// @route GET /api/notifications
const myNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json(notifications);
});

// @desc Mark a notification as read
// @route PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json(notification);
});

// @desc Mark all my notifications as read
// @route PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: 'All notifications marked as read.' });
});

// @desc Broadcast a system alert (HR/Admin only)
// @route POST /api/notifications/broadcast
const broadcast = asyncHandler(async (req, res) => {
  const { userIds, title, message } = req.body;
  const docs = userIds.map((id) => ({ user: id, type: 'system_alert', title, message }));
  const created = await Notification.insertMany(docs);
  res.status(201).json(created);
});

module.exports = { myNotifications, markRead, markAllRead, broadcast };
