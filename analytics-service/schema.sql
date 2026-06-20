-- Reports & Analytics store (Module 10).
-- This is a relational, append-only event log fed by the Node/MongoDB
-- backend whenever a recruitment lifecycle event happens. Keeping it
-- relational makes funnel, time-to-hire, and interviewer-performance
-- reporting simple, fast SQL rather than ad-hoc document aggregation.

CREATE TABLE IF NOT EXISTS recruitment_events (
    id              BIGSERIAL PRIMARY KEY,
    event_type      VARCHAR(64)  NOT NULL,
    application_id  VARCHAR(64),
    job_id          VARCHAR(64),
    candidate_id    VARCHAR(64),
    interview_id    VARCHAR(64),
    interviewer_id  VARCHAR(64),
    offer_id        VARCHAR(64),
    status          VARCHAR(64),
    rating          SMALLINT,
    recommendation  VARCHAR(32),
    is_backup       BOOLEAN DEFAULT FALSE,
    occurred_at     TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON recruitment_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_application ON recruitment_events (application_id);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON recruitment_events (occurred_at);
