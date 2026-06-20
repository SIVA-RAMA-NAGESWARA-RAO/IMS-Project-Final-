const asyncHandler = require('express-async-handler');
const fetch = require('node-fetch');
const Application = require('../models/Application');

const SERVICE_URL = () => process.env.ANALYTICS_SERVICE_URL;

// @desc Quick funnel counts computed directly from MongoDB (fast, always available)
// @route GET /api/analytics/funnel
const funnelSummary = asyncHandler(async (req, res) => {
  const counts = await Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
  const summary = {};
  counts.forEach((c) => (summary[c._id] = c.count));
  res.json(summary);
});

// @desc Proxy deeper relational reports to the Python/PostgreSQL analytics service (Module 10)
// @route GET /api/analytics/:report
const proxyReport = asyncHandler(async (req, res) => {
  const { report } = req.params;
  const url = `${SERVICE_URL()}/reports/${report}`;

  try {
    const response = await fetch(url, { timeout: 5000 });
    if (!response.ok) {
      res.status(response.status);
      throw new Error(`Analytics service returned ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(503);
    throw new Error(`Analytics service unavailable: ${err.message}`);
  }
});

module.exports = { funnelSummary, proxyReport };
