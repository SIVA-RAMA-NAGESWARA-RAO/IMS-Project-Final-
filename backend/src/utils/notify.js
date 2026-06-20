const Notification = require('../models/Notification');

// Central helper used across controllers to raise in-app notifications
// (Module 9: Notification Management).
const notify = async ({ user, type, title, message, meta }) => {
  return Notification.create({ user, type, title, message, meta });
};

module.exports = notify;
