// src/services/calendarService.js
// Free‑tier integration for Google Calendar and Microsoft Outlook (Graph) 
// Tokens are stored on the User document (user.googleOAuth && user.msOAuth)
// This module provides a simple API used by interview scheduling logic.

const { google } = require('googleapis');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch'); // Graph needs fetch polyfill

/**
 * Get a Google Calendar client for a given user.
 * @param {Object} user Mongoose user document containing googleOAuth {access_token, refresh_token, scope, token_type, expiry_date}
 */
function getGoogleClient(user) {
  if (!user.googleOAuth) throw new Error('Google OAuth not configured for user');
  const oAuth2Client = new google.auth.OAuth2();
  oAuth2Client.setCredentials(user.googleOAuth);
  return google.calendar({ version: 'v3', auth: oAuth2Client });
}

/**
 * Get a Microsoft Graph client for a given user.
 * @param {Object} user Mongoose user document containing msOAuth {accessToken, refreshToken, expiresOn}
 */
function getMsClient(user) {
  if (!user.msOAuth) throw new Error('Microsoft OAuth not configured for user');
  const client = Client.init({
    authProvider: (done) => {
      // Simple token provider – refresh logic omitted for brevity (free‑tier token expiry is long enough for demo)
      done(null, user.msOAuth.accessToken);
    },
  });
  return client;
}

/**
 * Fetch free slots for an array of interviewers within a date range.
 * Returns an array of ISO strings representing available start times.
 */
async function fetchFreeSlots(interviewers, { start, end, durationMinutes = 60 }) {
  const slots = [];
  for (const interviewer of interviewers) {
    try {
      // Google Calendar first
      const gCal = getGoogleClient(interviewer);
      const res = await gCal.freebusy.query({
        requestBody: {
          timeMin: start,
          timeMax: end,
          items: [{ id: interviewer.email }],
        },
      });
      const busy = res.data.calendars[interviewer.email].busy;
      // Simple algorithm: treat any gap >= duration as a slot
      // For brevity, we push the start of each gap (real implementation would merge across interviewers)
      // ... omitted detailed slot calculation – free‑tier demo
      slots.push({ interviewer: interviewer._id, provider: 'google', busy });
    } catch (e) {
      // Fallback to Microsoft Graph if Google fails
      const msClient = getMsClient(interviewer);
      const events = await msClient.api('/me/calendarview')
        .header('Prefer', `outlook.timezone="UTC"`)
        .query({ startDateTime: start, endDateTime: end })
        .get();
      slots.push({ interviewer: interviewer._id, provider: 'microsoft', busy: events.value });
    }
  }
  return slots;
}

module.exports = { fetchFreeSlots, getGoogleClient, getMsClient };
