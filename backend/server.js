require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

// Register the UTC plugin globally BEFORE any model is compiled.
const utcPlugin = require('./src/config/mongooseUtcPlugin');
mongoose.plugin(utcPlugin);

const connectDB = require('./src/config/db');
const dbConnect = require('./src/middleware/dbConnect');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const { sanitizeInput } = require('./src/middleware/sanitize');
const { globalLimiter } = require('./src/middleware/rateLimiters');

// ─── Route imports ──────────────────────────────────────────────────────────
const authRoutes = require('./src/routes/authRoutes');
const candidateRoutes = require('./src/routes/candidateRoutes');
const jobRoutes = require('./src/routes/jobRoutes');
const applicationRoutes = require('./src/routes/applicationRoutes');
const interviewRoutes = require('./src/routes/interviewRoutes');
const interviewerRoutes = require('./src/routes/interviewerRoutes');
const feedbackRoutes = require('./src/routes/feedbackRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const offerRoutes = require('./src/routes/offerRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Enterprise Modules — AI & Security
const agentRoutes = require('./src/routes/agentRoutes');
const aiAnalyticsRoutes = require('./src/routes/aiAnalyticsRoutes');
const copilotRoutes = require('./src/routes/copilotRoutes');

// Professional IMS Modules — Scorecards, Self-Scheduling, Templates, Dashboard
const scorecardRoutes = require('./src/routes/scorecardRoutes');
const availabilityRoutes = require('./src/routes/availabilityRoutes');
const templateRoutes = require('./src/routes/templateRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');

// ─── Serverless-safe DB connection ──────────────────────────────────────────
// connectDB() uses global caching — safe for Vercel cold/warm starts.
connectDB();

const app = express();

// Trust the first proxy hop (needed on Vercel/most PaaS for correct req.ip,
// which the auth rate limiter keys on).
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true, // required so the refresh-token cookie is sent/received
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection)
app.use(sanitizeInput); // strips script/style tags, inline handlers, javascript: URIs
app.use(morgan('dev'));
app.use('/api', globalLimiter);
app.use(dbConnect);

const path = require('path');
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));


app.get('/', (req, res) => res.json({ status: 'ok', message: 'IMS Backend API is running on Vercel' }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ims-backend' }));
app.get('/api', (req, res) => res.json({ status: 'ok', message: 'IMS API Root' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ims-backend-api' }));

// ─── Core Module Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);                 // Module 1: User Authentication + OTP
app.use('/api/candidates', candidateRoutes);       // Module 2: Candidate Management
app.use('/api/jobs', jobRoutes);                   // Module 3: Job Management
app.use('/api/applications', applicationRoutes);   // Module 4: Application Management
app.use('/api/interviews', interviewRoutes);       // Module 5: Interview Scheduling
app.use('/api/interviewers', interviewerRoutes);   // Module 6: Interviewer Management
app.use('/api/feedback', feedbackRoutes);          // Module 7: Interview Feedback Management
app.use('/api/notifications', notificationRoutes); // Module 9: Notification Management
app.use('/api/offers', offerRoutes);               // Module 11: Offer & Onboarding Management
app.use('/api/analytics', analyticsRoutes);        // Module 10: Reports & Analytics (legacy proxy)
app.use('/api/audit', auditRoutes);                // Audit log read access (HR/Admin)
app.use('/api/admin', adminRoutes);                // Enterprise Admin: invite-hr, user management

// ─── Enterprise AI Module Routes ────────────────────────────────────────────
app.use('/api/agent', agentRoutes);                // HITL Action Agent (propose + execute)
app.use('/api/ai/analytics', aiAnalyticsRoutes);   // AI-powered Analytics (NL→aggregation)
app.use('/api/ai/copilot', copilotRoutes);         // Context-Aware Navigation Copilot
app.use('/api/ai/services', require('./src/routes/aiServicesRoutes')); // AI Services (Resume, Anonymize, Questions, Rank)

// ─── Professional IMS Module Routes ─────────────────────────────────────────
app.use('/api/scorecards', scorecardRoutes);       // Structured Scorecards (Greenhouse-style)
app.use('/api/availability', availabilityRoutes); // Self-Scheduling (Calendly-style)
app.use('/api/templates', templateRoutes);         // Interview Kits (Greenhouse-style)
app.use('/api/dashboard', dashboardRoutes);        // Analytics Dashboard (Lever-style)

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`[ims-backend] listening on port ${PORT}`));
module.exports = app;
