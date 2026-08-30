# Rubikon Partner Network — MVP Design

Documentation only, written 29.08.2026. No scraper or matching code exists yet. Same status as
Project Radar — a future module, not part of the current frozen site roadmap.

## What this is

A structured record of potential subcontractors, crews, and specialists Rubikon could work with —
built from publicly available professional information, kept deliberately minimal on the personal-data
side, so that when a matching project comes up (see `docs/rubikon-intelligence-domain.md`), there's
already a searchable shortlist instead of starting from zero.

## Scope note on "Crew" (resolved 29.08.2026)

`Crew` is confirmed as a concept that should eventually support both external (subcontractor) and
internal (Rubikon's own) teams — but this MVP implements **external crews only**, folded into the
`partners` table as a `crew_size_estimate` attribute rather than a first-class `Crew` entity. Internal
workforce management is explicitly not built here and gets its own design pass later if wanted — it's a
different, more operationally sensitive problem than market intelligence about outside partners, and
shouldn't be assumed as a natural extension of this schema.

## Candidate data model

```sql
CREATE TABLE partners (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name            TEXT NOT NULL,        -- business/FOP name, or crew name as publicly listed
  specialization           TEXT,                 -- category tags: one or more of Rubikon's 5 directions
                                                   -- + general categories (electrics, plumbing, etc.)
  region                   TEXT,
  mobility                 TEXT,                 -- 'local' | 'regional' | 'national' — see §Availability
  crew_size_estimate       TEXT,                 -- free text, self-reported by the source ("2-3 people", "бригада 8")
  equipment_notes          TEXT,                 -- free text/tags, only what the entity itself advertises
  experience_notes         TEXT,                 -- self-reported, from their own listing
  public_business_contact  TEXT,                 -- phone/email offered *for the purpose of being contacted for work*
  source                   TEXT NOT NULL,
  source_url               TEXT NOT NULL,
  first_seen_at            TEXT NOT NULL DEFAULT (datetime('now')),
  last_verified_at         TEXT,                 -- set only when a human actually re-checked this record
  internal_status          TEXT NOT NULL DEFAULT 'candidate', -- see §Internal statuses
  partner_score            INTEGER,
  rubikon_internal_notes   TEXT                  -- human-written only, never scraped
);
CREATE INDEX idx_partners_specialization ON partners(specialization);
CREATE INDEX idx_partners_region ON partners(region);
```

## Professional / public data that is useful

Only information the entity has itself made public **for the purpose of being found and contacted for
work** — this is the guiding line, not "anything technically scrapeable":

- Business/FOP name as publicly registered or listed.
- Stated specialization / category of work.
- Region of operation.
- A public business contact channel (phone/email offered specifically to solicit work — meaningfully
  different from a private individual's personal phone number).
- Self-reported years active / experience.
- Equipment or vehicle capability, if the entity advertises it themselves (e.g. "маємо кран,
  самоскид").
- Portfolio or reference-project mentions, if publicly listed by the entity itself.

## Data that should NOT be collected

Explicit non-goals, not just omissions:

- Personal ID numbers (ІПН, паспортні дані).
- Home address (as distinct from a stated operating region).
- A personal phone number that was **not** offered as a business contact channel.
- Financial or banking details.
- Anything scraped from a personal social-media profile that wasn't posted as a business
  solicitation (e.g. pulling photos or posts from someone's personal Facebook).
- Family or personal-life details of any kind.
- **Anything behind a login.** Same hard line as Project Radar — only publicly accessible listings,
  never authenticated access, regardless of how useful the data behind it might be.

## Partner Score idea

Same transparent-heuristic philosophy as the Rubikon Score in Project Radar — not ML, inspectable:

| Factor | Signal |
|---|---|
| Category fit | Matches a direction Rubikon actively needs subcontractors for |
| Region fit | Distance/overlap with where Rubikon actually operates |
| Verification boost | A candidate someone at Rubikon has actually spoken to and vetted scores meaningfully higher than a pure-scrape candidate that's never been contacted — this is the single biggest factor, and should dominate the score once it exists |
| Equipment/capability match | Advertises equipment relevant to common project needs |
| Freshness | Recently active listing vs. one that looks stale/abandoned |

The verification boost matters most: a scraped-but-never-contacted record and a manually-vetted
relationship should never look equally trustworthy in the score, even if their raw attributes look
similar on paper.

## Internal statuses

```
candidate → contacted → vetted → active → inactive/dormant
                                       ↘ rejected  (with a required reason field — "no-show",
                                                     "quality issue", etc. — for institutional memory)
```

All transitions except the initial `candidate` insert are set by a human, not automation — matching the
same principle used for `opportunities.status` in Project Radar.

## Source tracking

Every record carries `source` + `source_url` + `first_seen_at` + `last_verified_at`, so provenance is
always traceable and a stale scraped listing never silently gets treated as equivalent to a
recently-confirmed one. `last_verified_at` staying null or old is itself a useful signal — it means
"nobody has actually checked whether this is still accurate."

## Availability / mobility model

- `mobility`: a simple `local` / `regional` / `national` tag for v1, not a precise radius — third-party
  listings essentially never state a usable numeric service radius, so pretending otherwise would be
  false precision.
- **Real-time availability is not something to try to scrape or infer.** Third-party listings almost
  never reflect whether a crew is actually free right now. For MVP, availability is a manually-updated
  field — Rubikon calls and asks when it matters — not an automation target. Trying to automate this
  before there's a real signal source would just produce confidently-wrong data.

## Future project-to-partner matching concept

Once both `opportunities`/`projects` (Project Radar) and `partners` (this module) exist, a matching
function could rank candidate partners for a given project by: category fit + region fit +
`partner_score` + any past-performance history from prior projects together. This is explicitly a
later step (see `docs/rubikon-intelligence-domain.md` and `docs/automation-roadmap.md`) — the MVP's
job is just to have a clean enough data model that this matching becomes possible later without a
schema rewrite, not to build the matcher now.
