-- Lead & Conversion Architecture — initial schema.
-- This is the deployment copy of migrations/0001_create_leads.sql.

CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id   TEXT UNIQUE NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  contact_method  TEXT NOT NULL,
  direction       TEXT NOT NULL,
  details         TEXT,
  source_page     TEXT,
  landing_page    TEXT,
  referrer        TEXT,
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_term        TEXT,
  utm_content     TEXT,
  gclid           TEXT,
  gbraid          TEXT,
  wbraid          TEXT,
  consent_at      TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'new'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_submission_id ON leads(submission_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE TABLE IF NOT EXISTS lead_submit_log (
  ip_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submit_log_ip_time ON lead_submit_log(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS lead_notify_failures (
  lead_id    INTEGER NOT NULL REFERENCES leads(id),
  channel    TEXT NOT NULL,
  error      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retried_at TEXT
);
