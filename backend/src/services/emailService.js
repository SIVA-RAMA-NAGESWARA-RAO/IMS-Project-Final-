const nodemailer = require('nodemailer');

// One transport, configured entirely from env vars — works unmodified
// with Gmail SMTP (use an App Password, not your login password) or
// Resend's SMTP relay (host: smtp.resend.com, user: "resend", pass: API key).
// Swapping providers is a .env change only, never a code change.
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
  });

  return transporter;
};

const sendMail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    // No SMTP configured (e.g. local dev without credentials yet) —
    // log instead of throwing, so the rest of the app keeps working.
    console.warn(`[email] SMTP not configured — skipped email to ${to}: "${subject}"`);
    return { skipped: true };
  }

  const mailer = getTransporter();
  return mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
    text: text || html?.replace(/<[^>]+>/g, ''),
  });
};

// --- Templated senders for every event in the spec's notification list ---

const sendOtpEmail = (to, code, purpose) => {
  const action = purpose === 'password_reset' ? 'reset your password' : 'verify your account';
  return sendMail({
    to,
    subject: `Your verification code: ${code}`,
    html: `
      <p>Use this code to ${action}:</p>
      <h2 style="letter-spacing:4px;">${code}</h2>
      <p>This code expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });
};

const sendApplicationSubmittedEmail = (to, jobTitle) =>
  sendMail({
    to,
    subject: 'Application received',
    html: `<p>We've received your application for <strong>${jobTitle}</strong>. We'll update you as it progresses.</p>`,
  });

const sendStatusUpdateEmail = (to, jobTitle, status) =>
  sendMail({
    to,
    subject: `Application update: ${status}`,
    html: `<p>Your application for <strong>${jobTitle}</strong> has been updated to: <strong>${status}</strong>.</p>`,
  });

const sendInterviewScheduledEmail = (to, jobTitle, scheduledAt, isReschedule = false) =>
  sendMail({
    to,
    subject: isReschedule ? 'Interview rescheduled' : 'Interview scheduled',
    html: `<p>Your interview for <strong>${jobTitle}</strong> is ${isReschedule ? 'now' : ''} scheduled for <strong>${new Date(scheduledAt).toLocaleString()}</strong>.</p>`,
  });

const sendOfferReleasedEmail = (to, jobTitle, designation) =>
  sendMail({
    to,
    subject: 'Offer letter released 🎉',
    html: `<p>Congratulations! You've been offered the position of <strong>${designation}</strong> for <strong>${jobTitle}</strong>. Please log in to review and respond.</p>`,
  });

module.exports = {
  sendMail,
  sendOtpEmail,
  sendApplicationSubmittedEmail,
  sendStatusUpdateEmail,
  sendInterviewScheduledEmail,
  sendOfferReleasedEmail,
};
