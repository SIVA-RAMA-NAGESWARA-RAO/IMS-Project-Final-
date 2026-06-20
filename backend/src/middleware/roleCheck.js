// Role-Based Access Control (Module 1).
// Usage: router.post('/jobs', protect, allow('hr'), createJob)
const allow = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Forbidden — requires role: ${roles.join(' or ')}`);
  }
  next();
};

module.exports = { allow };
