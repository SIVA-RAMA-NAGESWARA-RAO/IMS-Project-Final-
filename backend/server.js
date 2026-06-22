require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');

const connectDB = require('./src/config/db');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const { sanitizeInput } = require('./src/middleware/sanitize');
const { globalLimiter } = require('./src/middleware/rateLimiters');

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

connectDB();

const app = express();

// Trust the first proxy hop (needed on Vercel/most PaaS for correct req.ip,
// which the auth rate limiter keys on).
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true, // required so the refresh-token cookie is sent/received
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize()); // strips $ and . operators from user input (NoSQL injection)
app.use(sanitizeInput); // strips script/style tags, inline handlers, javascript: URIs
app.use(morgan('dev'));
app.use('/api', globalLimiter);

app.get('/', (req, res) => res.json({ status: 'ok', message: 'IMS Backend API is running on Vercel' }));
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ims-backend' }));

// Module-to-route map (mirrors the project spec):
app.use('/api/auth', authRoutes);                 // Module 1: User Authentication + OTP
app.use('/api/candidates', candidateRoutes);       // Module 2: Candidate Management
app.use('/api/jobs', jobRoutes);                   // Module 3: Job Management
app.use('/api/applications', applicationRoutes);   // Module 4: Application Management
app.use('/api/interviews', interviewRoutes);       // Module 5: Interview Scheduling
app.use('/api/interviewers', interviewerRoutes);   // Module 6: Interviewer Management
app.use('/api/feedback', feedbackRoutes);          // Module 7: Interview Feedback Management
app.use('/api/notifications', notificationRoutes); // Module 9: Notification Management
app.use('/api/offers', offerRoutes);               // Module 11: Offer & Onboarding Management
app.use('/api/analytics', analyticsRoutes);        // Module 10: Reports & Analytics (proxied to Python/SQL)
app.use('/api/audit', auditRoutes);                // Audit log read access (HR/Admin)
app.use('/api/admin', adminRoutes);                // Dev admin panel (secret-protected)

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`[ims-backend] listening on port ${PORT}`));
}

module.exports = app;
