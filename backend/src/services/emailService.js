const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Verify connection immediately so we fail fast on bad config
    connectionTimeout: 10_000,
  });
  return transporter;
};

// ─── Base HTML wrapper ────────────────────────────────────────────────────────
const emailWrapper = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IMS Notification</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0c;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#141416;border:1px solid #27272a;border-radius:16px;overflow:hidden;max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#5e6ad2,#00e5ff);padding:24px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;text-align:center;vertical-align:middle;font-size:18px;">⚡</td>
                  <td style="padding-left:12px;color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">IMS<span style="opacity:0.7;">.ai</span></td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;color:#f8f9fa;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #27272a;color:#a1a1aa;font-size:12px;text-align:center;">
              This email was sent by the IMS Recruitment Platform. If you didn't expect it, you can safely ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const btn = (text, href) =>
  `<a href="${href}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#5e6ad2,#00e5ff);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;margin:16px 0;">${text}</a>`;

// ─── sendMail core ────────────────────────────────────────────────────────────
const sendMail = async ({ to, subject, html, text }) => {
  const smtpUser = process.env.SMTP_USER || '';
  const smtpHost = process.env.SMTP_HOST || '';

  // Detect unconfigured or placeholder SMTP credentials
  if (
    !smtpHost ||
    !smtpUser ||
    smtpUser === 'your_gmail@gmail.com' ||
    smtpUser.includes('your_') ||
    (process.env.SMTP_PASS || '').includes('your_')
  ) {
    console.warn(`[email] SMTP not configured — skipped: "${subject}" → ${to}`);
    return { skipped: true };
  }

  const mailer = getTransporter();
  const textContent = text || html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n[EMAIL] To: ${to} | Subject: "${subject}"`);
    console.log(`[EMAIL] Preview: ${textContent?.substring(0, 120)}...\n`);
  }

  try {
    return await mailer.sendMail({
      from: process.env.EMAIL_FROM || `"IMS Recruitment" <${smtpUser}>`,
      to,
      subject,
      html,
      text: textContent,
    });
  } catch (err) {
    // Log SMTP failure but don't crash the request — the OTP is still printed
    // to the console for development/testing purposes.
    console.error(`[email] SMTP send failed for "${subject}" → ${to}:`, err.message);
    return { skipped: true, error: err.message };
  }
};

// ─── OTP ─────────────────────────────────────────────────────────────────────
const sendOtpEmail = (to, code, purpose) => {
  const action =
    purpose === 'password_reset' ? 'reset your password'
    : purpose === 'login' ? 'complete your login'
    : 'verify your email address';

  return sendMail({
    to,
    subject: `Your IMS verification code: ${code}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Verification Code</h2>
      <p style="color:#a1a1aa;margin:0 0 24px;">Use this code to ${action}:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="font-size:40px;font-weight:800;letter-spacing:0.3em;color:#5e6ad2;background:#1c1c1f;padding:16px 24px;border-radius:12px;border:1px solid #27272a;">${code}</span>
      </div>
      <p style="color:#a1a1aa;font-size:13px;margin-top:24px;">
        ⏱ This code expires in <strong style="color:#fff;">${process.env.OTP_EXPIRY_MINUTES || 5} minutes</strong>.<br>
        If you didn't request this, you can safely ignore this email.
      </p>
    `),
  });
};

// ─── Application submitted ────────────────────────────────────────────────────
const sendApplicationSubmittedEmail = (to, jobTitle) =>
  sendMail({
    to,
    subject: `Application received — ${jobTitle}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Application Received ✅</h2>
      <p style="color:#a1a1aa;">We've received your application for <strong style="color:#fff;">${jobTitle}</strong>.</p>
      <p style="color:#a1a1aa;">Our team will review it and update you on each stage of the process. Keep an eye on your inbox!</p>
    `),
  });

// ─── Status update ────────────────────────────────────────────────────────────
const sendStatusUpdateEmail = (to, jobTitle, status) =>
  sendMail({
    to,
    subject: `Application update: ${status} — ${jobTitle}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Application Update</h2>
      <p style="color:#a1a1aa;">Your application for <strong style="color:#fff;">${jobTitle}</strong> has been updated.</p>
      <div style="margin:24px 0;padding:16px;background:#1c1c1f;border-radius:12px;border:1px solid #27272a;">
        <span style="font-size:13px;text-transform:uppercase;letter-spacing:0.05em;color:#a1a1aa;">New status</span>
        <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#5e6ad2;">${status}</p>
      </div>
      <p style="color:#a1a1aa;font-size:13px;">Log in to view more details and next steps.</p>
    `),
  });

// ─── Interview scheduled ──────────────────────────────────────────────────────
const sendInterviewScheduledEmail = (to, jobTitle, scheduledAt, isReschedule = false, meetingLink = null) => {
  const dateStr = new Date(scheduledAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  return sendMail({
    to,
    subject: `${isReschedule ? '🔄 Interview rescheduled' : '📅 Interview scheduled'} — ${jobTitle}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">
        ${isReschedule ? 'Interview Rescheduled' : 'Interview Scheduled'} 🎉
      </h2>
      <p style="color:#a1a1aa;">Your interview for <strong style="color:#fff;">${jobTitle}</strong> is confirmed.</p>
      <div style="margin:24px 0;padding:20px;background:#1c1c1f;border-radius:12px;border:1px solid #27272a;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:20px;">📅</span>
          <div>
            <span style="font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;">Date & Time</span>
            <p style="margin:2px 0;font-weight:600;color:#fff;">${dateStr}</p>
          </div>
        </div>
        ${meetingLink ? `
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">🎥</span>
          <div>
            <span style="font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.05em;">Meeting Link</span>
            <p style="margin:2px 0;">${btn('Join Meeting', meetingLink)}</p>
          </div>
        </div>` : ''}
      </div>
      <p style="color:#a1a1aa;font-size:13px;">
        Please join 5 minutes early. Ensure your camera and microphone are working.<br>
        If you need to reschedule, contact HR as soon as possible.
      </p>
    `),
  });
};

// ─── Offer released ───────────────────────────────────────────────────────────
const sendOfferReleasedEmail = (to, jobTitle, designation) =>
  sendMail({
    to,
    subject: `🎉 Offer letter released — ${designation}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Congratulations! 🎉</h2>
      <p style="color:#a1a1aa;">
        You've been offered the position of <strong style="color:#fff;">${designation}</strong> 
        for <strong style="color:#fff;">${jobTitle}</strong>.
      </p>
      <p style="color:#a1a1aa;">Please log in to the candidate portal to review your offer letter and respond.</p>
    `),
  });

// ─── Staff invite ─────────────────────────────────────────────────────────────
const sendInviteEmail = (to, name, tempPassword, roleName) => {
  const clientUrl = process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:3000';
  return sendMail({
    to,
    subject: `You've been invited to IMS as ${roleName}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Welcome to IMS, ${name}! 👋</h2>
      <p style="color:#a1a1aa;">An admin has created your <strong style="color:#fff;">${roleName}</strong> account on the Interview Management System.</p>
      <div style="margin:24px 0;padding:20px;background:#1c1c1f;border-radius:12px;border:1px solid #27272a;">
        <p style="margin:0 0 8px;color:#a1a1aa;font-size:13px;">Your temporary login credentials:</p>
        <p style="margin:4px 0;color:#fff;"><strong>Email:</strong> ${to}</p>
        <p style="margin:4px 0;color:#fff;"><strong>Password:</strong> <code style="background:#0a0a0c;padding:2px 8px;border-radius:4px;font-family:monospace;">${tempPassword}</code></p>
      </div>
      <p style="color:#a1a1aa;font-size:13px;color:#ef4444;">⚠️ Please change your password immediately after first login.</p>
      ${btn('Login to IMS', `${clientUrl}/login`)}
    `),
  });
};

// ─── Magic link ───────────────────────────────────────────────────────────────
const sendMagicLinkEmail = (to, token) => {
  // ✅ FIXED: use CLIENT_ORIGIN env var instead of hardcoded localhost:5173
  const clientUrl = process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:3000';
  const magicLink = `${clientUrl}/verify-magic-link?token=${token}`;

  return sendMail({
    to,
    subject: 'Your secure login link for IMS',
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Sign In Securely 🔐</h2>
      <p style="color:#a1a1aa;">Click the button below to sign into your candidate portal. No password needed.</p>
      ${btn('Sign in to IMS', magicLink)}
      <p style="color:#a1a1aa;font-size:13px;margin-top:16px;">
        ⏱ This link expires in <strong style="color:#fff;">48 hours</strong>.<br>
        If you didn't request this link, you can safely ignore this email.
      </p>
    `),
  });
};

// ─── Interview reminder ───────────────────────────────────────────────────────
const sendInterviewReminderEmail = (to, candidateName, jobTitle, scheduledAt, meetingLink) => {
  const dateStr = new Date(scheduledAt).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  return sendMail({
    to,
    subject: `⏰ Interview reminder tomorrow — ${jobTitle}`,
    html: emailWrapper(`
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Interview Tomorrow! ⏰</h2>
      <p style="color:#a1a1aa;">Hi <strong style="color:#fff;">${candidateName}</strong>,</p>
      <p style="color:#a1a1aa;">This is a reminder that your interview for <strong style="color:#fff;">${jobTitle}</strong> is tomorrow.</p>
      <div style="margin:20px 0;padding:16px;background:#1c1c1f;border-radius:12px;border:1px solid #27272a;">
        <p style="margin:0;color:#fff;font-weight:600;">📅 ${dateStr}</p>
        ${meetingLink ? `<p style="margin:8px 0 0;">${btn('Join Meeting', meetingLink)}</p>` : ''}
      </div>
      <p style="color:#a1a1aa;font-size:13px;">
        💡 Tips: Test your camera & mic beforehand, find a quiet space, and join 5 minutes early.
      </p>
    `),
  });
};

module.exports = {
  sendMail,
  sendOtpEmail,
  sendApplicationSubmittedEmail,
  sendStatusUpdateEmail,
  sendInterviewScheduledEmail,
  sendInterviewReminderEmail,
  sendOfferReleasedEmail,
  sendInviteEmail,
  sendMagicLinkEmail,
};
