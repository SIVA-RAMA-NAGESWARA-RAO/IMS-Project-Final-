// src/services/videoService.js
//
// Interview meeting link generation.
//
// Strategy (priority order):
//   1. Jitsi Meet — completely free, no API key, production-grade, self-hosted option
//   2. Zoom Server-to-Server OAuth — if ZOOM_ACCOUNT_ID + ZOOM_CLIENT_ID + ZOOM_CLIENT_SECRET
//      are set (replaces the deprecated Zoom JWT app which was sunset Sep 2023)
//   3. Google Meet placeholder — if GOOGLE_MEET_BASE_URL is set in env
//
// The Jitsi path requires zero configuration and is the recommended default for
// getting a working system immediately.

const crypto = require('crypto');

// ─── Jitsi Meet (default, zero config) ───────────────────────────────────────
// Creates a unique, secure room name and returns a public meet.jit.si join URL.
// For self-hosted Jitsi, set JITSI_BASE_URL in .env (default: https://meet.jit.si).
function createJitsiMeeting(interview) {
  const base = process.env.JITSI_BASE_URL || 'https://meet.jit.si';
  // Prefix + 12 random hex chars → unique but shareable room
  const roomName = `IMS-${interview.topic || 'Interview'}-${crypto.randomBytes(6).toString('hex')}`
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  return `${base}/${roomName}`;
}

// ─── Zoom Server-to-Server OAuth (modern, non-deprecated) ────────────────────
async function createZoomMeeting(interview) {
  const accountId   = process.env.ZOOM_ACCOUNT_ID;
  const clientId    = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error('Zoom Server-to-Server OAuth credentials not configured');
  }

  // Step 1: Get an access token via Client Credentials grant
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}` },
    }
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Zoom token error: ${tokenRes.status} ${err}`);
  }

  const { access_token } = await tokenRes.json();

  // Step 2: Create the meeting
  const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      topic: interview.topic || 'Interview',
      type: 2, // scheduled
      start_time: interview.startTime,
      duration: interview.duration || 60,
      settings: {
        host_video: true,
        participant_video: true,
        waiting_room: true,
        join_before_host: false,
        mute_upon_entry: false,
        auto_recording: 'none',
      },
    }),
  });

  if (!meetingRes.ok) {
    const err = await meetingRes.text();
    throw new Error(`Zoom meeting error: ${meetingRes.status} ${err}`);
  }

  const data = await meetingRes.json();
  return { joinUrl: data.join_url, startUrl: data.start_url, meetingId: data.id };
}

// ─── Main exported function ───────────────────────────────────────────────────
/**
 * Generate a video meeting link for an interview.
 * Returns { joinUrl, startUrl?, source } where source is 'jitsi' | 'zoom' | 'google_meet'
 *
 * @param {Object} interview
 * @param {string} interview.topic      — Meeting title
 * @param {string} interview.startTime  — ISO 8601 date string
 * @param {number} interview.duration   — Duration in minutes (default 60)
 * @returns {Promise<{ joinUrl: string, startUrl?: string, source: string }>}
 */
async function createMeeting(interview) {
  // Try Zoom S2S OAuth first if credentials exist
  if (process.env.ZOOM_ACCOUNT_ID && process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET) {
    try {
      const { joinUrl, startUrl, meetingId } = await createZoomMeeting(interview);
      console.log(`[video] Zoom meeting created: ${meetingId}`);
      return { joinUrl, startUrl, source: 'zoom' };
    } catch (zoomErr) {
      console.warn('[video] Zoom failed, falling back to Jitsi:', zoomErr.message);
    }
  }

  // Google Meet placeholder (manual link — Workspace API requires billing)
  if (process.env.GOOGLE_MEET_BASE_URL) {
    const roomId = crypto.randomBytes(5).toString('hex');
    const joinUrl = `${process.env.GOOGLE_MEET_BASE_URL}/${roomId}`;
    return { joinUrl, source: 'google_meet' };
  }

  // Default: Jitsi Meet (always works, zero config)
  const joinUrl = createJitsiMeeting(interview);
  console.log(`[video] Jitsi meeting created: ${joinUrl}`);
  return { joinUrl, startUrl: joinUrl, source: 'jitsi' };
}

module.exports = { createMeeting, createZoomMeeting, createJitsiMeeting };
