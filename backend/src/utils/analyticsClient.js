const fetch = require('node-fetch');

// Fire-and-forget event push to the Python Reports & Analytics service.
// The core transactional write to MongoDB always completes first; this
// is best-effort and never blocks or fails the primary request.
const pushEvent = async (eventType, payload) => {
  const url = process.env.ANALYTICS_SERVICE_URL;
  if (!url) return;
  try {
    await fetch(`${url}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: eventType, payload, occurred_at: new Date().toISOString() }),
      timeout: 2000,
    });
  } catch (err) {
    console.warn(`[analytics] event push failed (${eventType}): ${err.message}`);
  }
};

module.exports = { pushEvent };
