# API Reference

Base URL (Node API): `http://localhost:5000/api`
Base URL (Analytics service): `http://localhost:6000`

All Node endpoints except `GET /jobs`, `GET /jobs/:id`, and `/auth/*` require
`Authorization: Bearer <token>`. Role restrictions are noted per route.

## Auth (Module 1)
Access tokens are short-lived (15m) and returned in the JSON body — keep
them in memory, not localStorage. The refresh token is set automatically
as an `httpOnly` cookie; the browser handles it, you never read/write it
from JS. All requests must be made with `credentials: include` (axios:
`withCredentials: true`) for the cookie to flow.

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | any | Create an inert account + email a 6-digit OTP |
| POST | `/auth/verify-otp` | any | `{ email, code }` → activates account, returns access token + sets refresh cookie |
| POST | `/auth/resend-otp` | any | `{ email, purpose: "registration"\|"password_reset" }`, cooldown-limited |
| POST | `/auth/login` | any | Blocked with 403 until the account is OTP-verified |
| POST | `/auth/refresh` | any (cookie) | Reads the refresh cookie → new access token + rotated cookie |
| POST | `/auth/logout` | authenticated | Clears the refresh cookie for this device only |
| POST | `/auth/logout-all` | authenticated | Bumps `tokenVersion` — invalidates every device's refresh token |
| GET | `/auth/me` | authenticated | Current user |
| POST | `/auth/forgot-password` | any | `{ email }` → emails a password-reset OTP (never reveals if the email exists) |
| POST | `/auth/reset-password` | any | `{ email, code, newPassword }` |

All of the above except `/refresh`, `/logout`, and `/me` are rate-limited
(`AUTH_RATE_LIMIT_MAX` per `AUTH_RATE_LIMIT_WINDOW_MINUTES`, keyed by email).

## Candidates (Module 2)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/candidates/me` | candidate | My profile |
| PUT | `/candidates/me` | candidate | Create/update profile |
| POST | `/candidates/me/resume` | candidate | Attach resume URL (JSON — for dev without Cloudinary configured) |
| POST | `/candidates/me/documents` | candidate | Add a document by URL (JSON) |
| POST | `/candidates/me/resume/upload` | candidate | multipart/form-data, field `resume` (PDF, ≤5MB) → uploads to Cloudinary |
| POST | `/candidates/me/documents/upload` | candidate | multipart/form-data, field `document` (PDF/PNG/JPG, ≤5MB) → Cloudinary |
| GET | `/candidates?skill=&location=&page=&limit=` | hr | Paginated candidate search |

## Jobs (Module 3)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/jobs?status=open\|closed\|all&q=&department=&page=&limit=` | public | Paginated job list |
| GET | `/jobs/:id` | public | Job details |
| POST | `/jobs` | hr | Create job (validated) |
| PUT | `/jobs/:id` | hr | Edit job (validated) |
| PATCH | `/jobs/:id/close` | hr | Close job |

## Applications (Module 4, 8)
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/applications` | candidate | Apply to a job — emails an application-received confirmation |
| GET | `/applications/mine` | candidate | My applications |
| GET | `/applications?jobId=&status=&page=&limit=` | hr | Paginated list/filter |
| GET | `/applications/:id` | authenticated | Full detail + status history |
| PATCH | `/applications/:id/status` | hr | Shortlist / reject / move stage — emails the candidate on every change |

## Interviews (Module 5)
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/interviews` | hr | Schedule interview — emails the candidate (and in-app notifies interviewers) |
| GET | `/interviews` | authenticated | List (scoped to candidate/interviewer) |
| PATCH | `/interviews/:id/reschedule` | hr | Reschedule — emails the candidate |
| PATCH | `/interviews/:id/cancel` | hr | Cancel |
| PATCH | `/interviews/:id/complete` | hr, interviewer | Mark completed |

## Interviewers (Module 6)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/interviewers` | hr | List interviewer accounts |
| PATCH | `/interviewers/assign/:interviewId` | hr | Assign to an interview |
| GET | `/interviewers/:id/assignments` | authenticated | Track an interviewer's load |

## Feedback (Module 7)
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/feedback` | interviewer | Submit evaluation |
| GET | `/feedback/interview/:interviewId` | authenticated | Feedback for one interview |
| GET | `/feedback/application/:applicationId` | hr | All feedback across rounds |

## Notifications (Module 9)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/notifications` | authenticated | My notifications |
| PATCH | `/notifications/:id/read` | authenticated | Mark one read |
| PATCH | `/notifications/read-all` | authenticated | Mark all read |
| POST | `/notifications/broadcast` | hr | System alert to multiple users |

## Offers & Onboarding (Module 11)
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/offers` | hr | Release offer letter — emails the candidate |
| GET | `/offers` | hr | List/filter offers |
| PATCH | `/offers/:id/respond` | candidate | Accept / reject |
| PATCH | `/offers/:id/onboard` | hr | Initiate onboarding |

## Analytics (Module 10)
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/analytics/funnel` | hr | Fast funnel counts (direct MongoDB aggregation) |
| GET | `/analytics/time-to-hire` | hr | Proxies to analytics service → SQL |
| GET | `/analytics/interviewer-performance` | hr | Proxies to analytics service → SQL |
| GET | `/analytics/offer-acceptance` | hr | Proxies to analytics service → SQL |

## Audit log
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/audit?page=&limit=&action=&userId=` | hr | Paginated, filterable trail of sensitive actions (logins, status changes, job/offer events) |

### Analytics service (direct, optional)
| Method | Path | Description |
|---|---|---|
| POST | `/events` | Ingest a lifecycle event (called internally by the Node backend) |
| GET | `/reports/funnel` | Funnel by status, from the SQL event log |
| GET | `/reports/time-to-hire` | Avg. days from application to offer, per job |
| GET | `/reports/interviewer-performance` | Avg. rating & recommendation mix per interviewer |
| GET | `/reports/offer-acceptance` | Offer outcomes, including backup-candidate offers |
