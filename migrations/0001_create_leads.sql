-- Lead & Conversion Architecture — initial schema.
-- Apply with: wrangler d1 execute rubikon-leads --remote --file=migrations/0001_create_leads.sql
-- (--remote is required — without it this applies to a local/preview D1 instance, not the real
-- one the deployed Worker reads from. Or apply via the Cloudflare Dashboard D1 console instead —
-- paste this file's contents and run.)

CREATE TABLE IF NOT EXISTS leads (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id   TEXT UNIQUE NOT NULL,     -- UUID, generated client-side once per form fill
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),

  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  contact_method  TEXT NOT NULL,            -- 'Дзвінок' | 'Telegram' | 'WhatsApp' | 'Viber'
  direction       TEXT NOT NULL,            -- one of inquiryDirectionOptions
  details         TEXT,                     -- JSON: {location, dimensions, cooperation, startDate, comment}

  source_page     TEXT,                     -- page the form was actually submitted from
  landing_page    TEXT,                     -- first page of the session
  referrer        TEXT,

  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_term        TEXT,
  utm_content     TEXT,
  gclid           TEXT,
  gbraid          TEXT,
  wbraid          TEXT,

  consent_at      TEXT NOT NULL,            -- ISO timestamp of the consent checkbox
  privacy_version TEXT NOT NULL,            -- privacy policy "last updated" date at consent time

  status          TEXT NOT NULL DEFAULT 'new'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_submission_id ON leads(submission_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- Rate-limiting only — kept separate from business data so it can be pruned independently.
CREATE TABLE IF NOT EXISTS lead_submit_log (
  ip_hash    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submit_log_ip_time ON lead_submit_log(ip_hash, created_at);

-- Notification failures — never blocks or duplicates a lead; for manual follow-up only.
CREATE TABLE IF NOT EXISTS lead_notify_failures (
  lead_id    INTEGER NOT NULL REFERENCES leads(id),
  channel    TEXT NOT NULL,                 -- 'telegram' | 'email' | ...
  error      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retried_at TEXT
);
