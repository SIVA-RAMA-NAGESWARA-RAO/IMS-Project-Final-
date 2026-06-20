# Interview Management System (IMS)

A full-stack recruitment platform covering job posting, applications, interview
scheduling, feedback, offers, and reporting — built from the project's original
spec across three roles (Candidate, HR/Admin, Interviewer) and 11 modules.

## Architecture

```
┌──────────────┐      REST       ┌──────────────────┐
│   React +    │ ───────────────▶│   Node/Express    │──┐
│   Tailwind   │◀─────────────── │   + MongoDB        │  │ recruitment
│  (frontend)  │                 │   (core API)       │  │ lifecycle events
└──────────────┘                 └──────────────────┘  │
        │  GET /api/analytics/*           │            ▼
        └────────────────────────────────▶│  ┌──────────────────────┐
                                           └─▶│  Python (Flask) +    │
                                              │  PostgreSQL (SQL)    │
                                              │  Reports & Analytics │
                                              └──────────────────────┘
```

**Why this split:**
- **React** — all three role-based dashboards (Candidate / HR / Interviewer).
- **Node + MongoDB** — the transactional core: auth, candidates, jobs,
  applications, interviews, interviewer panels, feedback, notifications,
  offers/onboarding (Modules 1–9, 11). Document storage suits these —
  profiles, applications, and interviews are naturally nested objects.
- **Python + PostgreSQL (SQL)** — Reports & Analytics (Module 10). The Node
  backend pushes lifecycle events (`application_created`, `offer_released`,
  `feedback_submitted`, etc.) to this service, which runs relational SQL
  aggregations — funnel counts, average time-to-offer, interviewer
  performance — the kind of joins/group-by reporting MongoDB documents
  aren't a natural fit for.

## Design system

The product's real subject is a hiring **pipeline** — five sequential stages
(Applied → Shortlisted → Interview Scheduled → Selected → Offer Released)
plus a Rejected branch, taken directly from the spec's flowchart. That
vocabulary is the visual backbone:

- **`PipelineBar`** — HR's dashboard signature: a single horizontal bar where
  segment widths are proportional to how many candidates sit in each stage.
- **`JourneyStepper`** — the candidate's mirror of the same bar: a vertical
  stepper showing where *their* one application sits, in the same colors.

Palette: cool paper canvas (`#F5F6F8`) with ink text (`#1C2433`), signal blue
for "in motion" (`#3454D1`), amber for "awaiting decision" (`#F2A93B`), moss
green for "moving forward" (`#2E8B57`), clay for "closed out" (`#C1502E`).
Type: Fraunces (display headings) + Inter (UI/body) + IBM Plex Mono (counts,
IDs, timestamps — anything data-like).

## Module map

| # | Module | Where it lives |
|---|---|---|
| 1 | User Authentication | `backend/src/routes/authRoutes.js` — register → email OTP → verify → JWT access token + httpOnly refresh cookie. RBAC via `middleware/roleCheck.js`. |
| 2 | Candidate Management | `backend/src/routes/candidateRoutes.js` — profile, plus Cloudinary-backed resume/document upload |
| 3 | Job Management | `backend/src/routes/jobRoutes.js` |
| 4 | Application Management | `backend/src/routes/applicationRoutes.js` |
| 5 | Interview Scheduling | `backend/src/routes/interviewRoutes.js` |
| 6 | Interviewer Management | `backend/src/routes/interviewerRoutes.js` |
| 7 | Interview Feedback Management | `backend/src/routes/feedbackRoutes.js` |
| 8 | Candidate Status Tracking | `Application.status` + `PipelineBar` / `JourneyStepper` |
| 9 | Notification Management | `backend/src/routes/notificationRoutes.js` (in-app) + `backend/src/services/emailService.js` (email) |
| 10 | Reports & Analytics | `analytics-service/` (Python + PostgreSQL) |
| 11 | Offer & Onboarding Management | `backend/src/routes/offerRoutes.js` |
| — | Audit Logging | `backend/src/routes/auditRoutes.js` — HR-only, paginated |

See [`docs/AUDIT_REPORT.md`](docs/AUDIT_REPORT.md) for the full engineering audit, what was fixed, and an honest production-readiness assessment.

## Security & session model

- **OTP-gated registration**: accounts are created inert (`isVerified: false`); a 6-digit code is emailed via Nodemailer (Gmail SMTP or Resend — same code, different `.env`), expires in 5 minutes, rate-limited resend with cooldown, capped wrong-attempt count, and the raw code is never stored (SHA-256 hash only, TTL-indexed for auto-cleanup).
- **Refresh-token sessions**: short-lived (15m) JWT access token kept in memory on the client only; a 30-day refresh token lives in an `httpOnly`, `SameSite=Strict` cookie. "Logout from all devices" bumps a `tokenVersion` on the user, invalidating every outstanding refresh token without a server-side blacklist.
- **CSRF**: not handled via a separate token — the API is bearer-token authenticated (no ambient cookie auth for state-changing routes), and the one cookie that exists (`refresh`) is `SameSite=Strict`, which browsers never attach cross-site. See `docs/AUDIT_REPORT.md` for the full reasoning.
- **Hardening**: `helmet`, `express-rate-limit` (tighter on auth routes), `express-mongo-sanitize` (NoSQL injection), a custom script/handler-stripping sanitizer (XSS), `express-validator` on every mutating route, bcrypt password hashing, CORS locked to `CLIENT_ORIGIN` with credentials.
- **Audit trail**: every login, status change, job lifecycle event, and offer decision is written to the `AuditLog` collection, viewable at `/hr/audit`.

## File storage

Resumes and documents upload straight to Cloudinary as in-memory buffers (no local disk writes — required for serverless hosts like Vercel). Configure `CLOUDINARY_*` env vars; without them, uploads return a clear 503 rather than failing silently.

## Running it locally

### Option A — Docker (recommended, starts everything)
```bash
docker compose up --build
```
This starts MongoDB, PostgreSQL, the Node API (`:5000`), the Python analytics
service (`:6000`), and the React app (`:5173`).

### Option B — run each service manually

**1. MongoDB & PostgreSQL** — run locally, or just:
```bash
docker compose up mongo postgres
```

**2. Backend (Node)**
```bash
cd backend
cp .env.example .env
npm install
npm run seed   # optional: creates demo HR / interviewer / candidate accounts
npm run dev
```

**3. Analytics service (Python)**
```bash
cd analytics-service
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
psql "$DATABASE_URL" -f schema.sql   # or let app.py create the table on first run
python app.py
```

**4. Frontend (React)**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Visit `http://localhost:5173`.

### Demo accounts (after `npm run seed`)
Seeded accounts are created pre-verified (`isVerified: true`) so you can log
in immediately without running the OTP flow. Any account you register
yourself through the UI *will* require email OTP verification.

| Role | Email | Password |
|---|---|---|
| HR / Admin | hr@ims.test | password123 |
| Interviewer | interviewer@ims.test | password123 |
| Candidate | candidate@ims.test | password123 |

## API reference

See [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) for every endpoint
across the Node API and the Python analytics service.

## Repository layout

```
ims-project/
├── backend/             Node + Express + MongoDB (Mongoose)
├── analytics-service/   Python + Flask + SQLAlchemy + PostgreSQL
├── frontend/            React + Vite + Tailwind
├── docs/                Architecture & API reference
└── docker-compose.yml
```
