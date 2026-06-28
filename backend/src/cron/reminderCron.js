// src/cron/reminderCron.js
// Standalone cron runner for interview reminders.
// Run with: node src/cron/reminderCron.js
// Or call from a Vercel/Render cron job every 30 minutes.

require('dotenv').config();
const connectDB = require('../config/db');
const { processUpcomingReminders } = require('../services/reminderService');

async function run() {
  console.log('[Cron] Starting reminder processing at', new Date().toISOString());

  try {
    await connectDB();
    const results = await processUpcomingReminders();
    console.log('[Cron] Reminder results:', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('[Cron] Fatal error:', err);
    process.exit(1);
  }

  // Exit cleanly for one-shot cron execution
  process.exit(0);
}

run();
