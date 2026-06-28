// src/services/reminderService.js
// Automated Interview Reminder Engine — inspired by Lever & Greenhouse.
// Sends email/notification reminders to candidates and interviewers
// 24 hours and 1 hour before their scheduled interviews.
//
// Usage: Call `processUpcomingReminders()` from a cron job or scheduled task.

const Interview = require('../models/Interview');
const User = require('../models/User');
const notify = require('../utils/notify');
const { sendMail } = require('./emailService');

/**
 * Send reminders for interviews happening within the given window.
 * @param {number} hoursAhead - How many hours ahead to look (e.g. 24 or 1)
 * @param {string} reminderType - 'reminder_24h' or 'reminder_1h'
 */
async function sendRemindersForWindow(hoursAhead, reminderType) {
  const now = new Date();
  const windowStart = new Date(now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000);

  const interviews = await Interview.find({
    status: 'scheduled',
    scheduledAt: { $gte: windowStart, $lte: windowEnd },
  })
    .populate({
      path: 'application',
      populate: [
        { path: 'candidate', select: 'name email' },
        { path: 'job', select: 'title' },
      ],
    })
    .populate('interviewers', 'name email');

  let remindersSent = 0;

  for (const interview of interviews) {
    const jobTitle = interview.application?.job?.title || 'Interview';
    const dateStr = new Date(interview.scheduledAt).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
    const meetingInfo = interview.meetingLink
      ? `<br><strong>Meeting Link:</strong> <a href="${interview.meetingLink}">${interview.meetingLink}</a>`
      : '';

    // 1. Remind the candidate
    if (interview.application?.candidate?.email) {
      const candidateEmail = interview.application.candidate.email;
      const candidateName = interview.application.candidate.name || 'Candidate';

      await sendMail({
        to: candidateEmail,
        subject: `⏰ Interview Reminder: ${jobTitle} — ${hoursAhead === 24 ? 'Tomorrow' : 'In 1 Hour'}`,
        html: `
          <p>Hi <strong>${candidateName}</strong>,</p>
          <p>This is a friendly reminder that your interview for <strong>${jobTitle}</strong> is scheduled for:</p>
          <h3 style="color: #6366f1;">${dateStr}</h3>
          <p><strong>Round:</strong> ${interview.round}<br>
          <strong>Mode:</strong> ${interview.mode}${meetingInfo}</p>
          <p>Please be prepared and join on time. Good luck! 🍀</p>
          <p style="color: #888; font-size: 12px;">— IMS Recruitment Team</p>
        `,
      });

      await notify({
        user: interview.application.candidate._id,
        type: 'interview_reminder',
        title: `Interview ${hoursAhead === 24 ? 'tomorrow' : 'in 1 hour'}`,
        message: `Your interview for ${jobTitle} is ${hoursAhead === 24 ? 'tomorrow' : 'in 1 hour'} at ${dateStr}.`,
        meta: { interviewId: interview._id },
      });

      remindersSent++;
    }

    // 2. Remind each interviewer
    for (const interviewer of interview.interviewers || []) {
      if (interviewer.email) {
        await sendMail({
          to: interviewer.email,
          subject: `⏰ Interview Assignment Reminder: ${jobTitle} — ${hoursAhead === 24 ? 'Tomorrow' : 'In 1 Hour'}`,
          html: `
            <p>Hi <strong>${interviewer.name || 'Interviewer'}</strong>,</p>
            <p>Reminder: You have an interview for <strong>${jobTitle}</strong> scheduled for:</p>
            <h3 style="color: #6366f1;">${dateStr}</h3>
            <p><strong>Round:</strong> ${interview.round}<br>
            <strong>Candidate:</strong> ${interview.application?.candidate?.name || 'N/A'}${meetingInfo}</p>
            <p>Please prepare your evaluation criteria and join on time.</p>
            <p style="color: #888; font-size: 12px;">— IMS Recruitment Team</p>
          `,
        });

        await notify({
          user: interviewer._id,
          type: 'interview_reminder',
          title: `Interview assignment ${hoursAhead === 24 ? 'tomorrow' : 'in 1 hour'}`,
          message: `Your interview for ${jobTitle} is ${hoursAhead === 24 ? 'tomorrow' : 'in 1 hour'}.`,
          meta: { interviewId: interview._id },
        });

        remindersSent++;
      }
    }
  }

  return { reminderType, interviewsProcessed: interviews.length, remindersSent };
}

/**
 * Process all upcoming reminders (24h + 1h windows).
 * Call this from a cron scheduler.
 */
async function processUpcomingReminders() {
  const results = [];

  try {
    const r24 = await sendRemindersForWindow(24, 'reminder_24h');
    results.push(r24);
  } catch (err) {
    console.error('[Reminders] 24h window error:', err);
    results.push({ reminderType: 'reminder_24h', error: err.message });
  }

  try {
    const r1 = await sendRemindersForWindow(1, 'reminder_1h');
    results.push(r1);
  } catch (err) {
    console.error('[Reminders] 1h window error:', err);
    results.push({ reminderType: 'reminder_1h', error: err.message });
  }

  console.log('[Reminders] processed:', JSON.stringify(results));
  return results;
}

module.exports = { processUpcomingReminders, sendRemindersForWindow };
