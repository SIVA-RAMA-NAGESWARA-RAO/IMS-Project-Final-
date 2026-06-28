# IMS — Interview Management System
## Setup & Run Guide

---

## Architecture

```
ims-project/
├── backend/          Node.js + Express + MongoDB REST API  (port 5000)
└── frontend_next/    Next.js 16 + Tailwind + Framer Motion  (port 3000)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| MongoDB | ≥ 6.x (local) OR Atlas connection string |

---

## 1 — Clone / extract the project

```bash
unzip ims-renewed-prjct.zip
cd ims-renewed-prjct/ims-project
```

---

## 2 — Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env
```

### Edit `.env` — minimum required values:

| Key | What to set |
|-----|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/ims` (local) or Atlas URI |
| `JWT_SECRET` | Run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `REFRESH_TOKEN_SECRET` | Same command, different value |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Gmail **App Password** (NOT your login password) |
| `CLIENT_ORIGIN` | `http://localhost:3000` |

> **Video meetings work out of the box** — Jitsi Meet is the default (no API key needed).
> Every interview auto-generates a unique Jitsi link like `https://meet.jit.si/ims-...`

### Seed the admin account:

```bash
npm run seed:admin
# Creates admin@ims.example.com / ChangeThisImmediately123! (from .env)
```

### Start the backend:

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Backend is now running at **http://localhost:5000**

---

## 3 — Frontend Setup

```bash
cd ../frontend_next

# 1. Install dependencies
npm install

# 2. Create env file
cp .env.local.example .env.local   # OR copy the .env.local already included
```

### `.env.local` values (defaults work for local dev):

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Start the frontend:

```bash
# Development
npm run dev

# Production build
npm run build && npm start
```

Frontend is now running at **http://localhost:3000**

---

## 4 — First Login

1. Open **http://localhost:3000/login**
2. Use the **Internal Staff** tab
3. Email: `admin@ims.example.com`
4. Password: `ChangeThisImmediately123!`
5. A 6-digit OTP is emailed — if SMTP isn't set up yet, **check the backend terminal** for the OTP code (it prints there)

---

## 5 — Gmail App Password Setup (for OTP emails)

1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** (required)
3. Go to https://myaccount.google.com/apppasswords
4. Create app: select "Mail" → "Other" → name it "IMS"
5. Copy the 16-character password → paste into `.env` as `SMTP_PASS`

---

## 6 — Video Meetings

**Works immediately with zero config** — Jitsi Meet.

Every scheduled interview gets a unique link like:
`https://meet.jit.si/ims-frontend-developer-round-2-a1b2c3d4`

### To use Zoom instead (optional):
1. Go to https://marketplace.zoom.us/develop/create
2. Create a **Server-to-Server OAuth** app (NOT the deprecated JWT app)
3. Add scope: `meeting:write:meeting:admin`
4. Activate the app
5. Set in `.env`:
   ```
   ZOOM_ACCOUNT_ID=your_account_id
   ZOOM_CLIENT_ID=your_client_id
   ZOOM_CLIENT_SECRET=your_client_secret
   ```

---

## 7 — All User Roles

| Role | How to create | Access |
|------|--------------|--------|
| Admin | `npm run seed:admin` | Full system |
| HR | Admin → Settings → Users → Invite HR | Manage jobs, candidates, interviews |
| Interviewer | Admin/HR → Invite Interviewer | View assigned interviews, submit scorecards |
| Candidate | Self-register at `/register` | Apply to jobs, view interviews |

---

## 8 — Key Pages

| URL | Description |
|-----|-------------|
| `/login` | Login (staff + candidate tabs) |
| `/register` | Candidate self-registration |
| `/forgot-password` | Password reset via OTP |
| `/` | Dashboard |
| `/jobs` | Job listings management |
| `/candidates` | Candidate pipeline |
| `/interviews` | Interview schedule + meeting links |
| `/scorecards` | Evaluation scorecards |
| `/availability` | Interviewer self-scheduling |
| `/templates` | Interview kit templates |
| `/agent` | AI Agent command center |
| `/settings/users` | User management (admin only) |
| `/careers` | Public job board |

---

## 9 — Common Issues

### "OTP not received"
→ Check backend terminal — it prints the OTP code when SMTP isn't configured.

### "Invalid credentials" on login
→ Make sure you seeded the admin: `npm run seed:admin`

### "Cannot connect to MongoDB"
→ Start MongoDB: `mongod --dbpath /data/db` or use Atlas URI

### Video meeting link shows "TBD"
→ Normal if the interview was scheduled before the fix was applied. New interviews auto-generate Jitsi links.

### CORS errors in browser
→ Check `CLIENT_ORIGIN` in backend `.env` matches your frontend URL exactly.

### "Token invalid or expired" after 15 minutes
→ The auth context auto-refreshes tokens. If you see this, hard-refresh the page.

---

## 10 — Production Deployment

### Backend (Railway / Render / Fly.io):
```bash
# Set env vars in your hosting platform
# The server.js exports `app` for Vercel serverless too
npm start
```

### Frontend (Vercel):
```bash
# Set env vars in Vercel dashboard:
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
BACKEND_URL=https://your-backend.railway.app

# Deploy
vercel deploy --prod
```

> Set `COOKIE_SECURE=true` in backend when running on HTTPS.
> Set `CLIENT_ORIGIN=https://your-frontend.vercel.app` in backend.
