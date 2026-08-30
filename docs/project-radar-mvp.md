# Rubikon Project Radar — MVP Design

Documentation only, written 29.08.2026. No scraper code exists yet. This is a design for a future
module, separate from the current frozen site roadmap (Steps 01–09) — earliest realistic start is
**after** the site reaches stable v1.0 (see `docs/automation-roadmap.md`).

## What this is

An automated discovery system: find construction-relevant tenders/opportunities from public sources,
deduplicate them, score their relevance to Rubikon Build, and alert Dmytro/the team via Telegram
before a human would have found them manually.

```
Source → collect → dedupe → normalize → Rubikon Score → store (D1) → Telegram alert (if score high)
```

## Scope of v1

- **One source**: Rabotniki.ua tenders, filtered to construction-relevant categories.
- **One region focus**: Дніпропетровська область primarily, with a lower-priority national tier for
  large industrial opportunities (grain storage, hangars) that Rubikon has said it would travel for.
- **Polling, not real-time.** A scheduled job checks the source periodically — no webhook, no
  streaming, because the source almost certainly doesn't offer one.
- **A transparent, explainable score** (heuristic, not ML) — see §Rubikon Score below.
- **Telegram alert for high-score new opportunities only.** No dashboard, no web UI for v1 — the raw
  D1 table plus Telegram is the entire interface.
- Everything else discussed in the long-term vision (Prozorro, document AI, bid/no-bid assistant,
  cross-source dedup, investment-signal monitoring) is **explicitly out of scope** — see §Non-goals.

## Architecture

```
┌─────────────────┐
│  Cron Trigger    │  Cloudflare Cron (e.g. every 2–4h) — same platform the site already runs on,
│  (Workers)       │  no new hosting concept introduced.
└────────┬─────────┘
         │
┌────────▼─────────┐
│ Source Adapter    │  One small module per source. Owns: fetching, parsing, its own rate-limit
│ (Rabotniki.ua)    │  etiquette, and a documented legal/robots check (see §Privacy/legal).
└────────┬─────────┘
         │ RawItem[]
┌────────▼─────────┐
│ Dedup + Normalize │  (source, source_item_id) uniqueness check → skip known items.
│                   │  New items → normalize into the canonical Opportunity shape.
└────────┬─────────┘
         │ OpportunityDraft[]
┌────────▼─────────┐
│ Rubikon Score      │  Deterministic, inspectable scoring function (see below).
└────────┬─────────┘
         │
┌────────▼─────────┐
│ D1: rubikon-        │  Confirmed 29.08.2026 — its own database, separate from the Step 01
│ intelligence        │  `rubikon-leads` DB. See docs/rubikon-intelligence-domain.md for why.
└────────┬─────────┘
         │ score ≥ threshold AND first-seen
┌────────▼─────────┐
│ Telegram alert      │  Reuses the same Bot API pattern already built for Step 01 lead notifications
│                     │  — same bot, or a second bot/chat if Dmytro wants Radar alerts separated from
│                     │  lead alerts (see Unresolved Decisions).
└──────────────────┘
```

## Source adapter concept

A minimal, pluggable interface every source implements — the point is that adding source #2
(e.g. Prozorro) later means writing one new small module, not touching the pipeline:

```ts
interface SourceAdapter {
  id: string;                          // 'rabotniki-ua'
  fetchRaw(): Promise<RawItem[]>;      // one polling pass — listing + enough detail to normalize
  normalize(raw: RawItem): OpportunityDraft;
  legalCheckCompletedAt: string | null; // set only after the §Privacy/legal checklist is signed off
}
```

Each adapter is responsible for its own scraping mechanics (HTML parsing, pagination, whatever the
source requires) and for behaving like a good citizen: a real User-Agent identifying the bot, sensible
delays between requests, no parallel hammering of the source.

## Data flow (detailed)

1. Cron fires the poll for one adapter.
2. Adapter fetches the current listing (and enough per-item detail to normalize — may be 1 request or
   N depending on whether the source's listing page already has enough info, or a detail page must be
   fetched per item).
3. For each raw item, compute `(source, source_item_id)`. If a row with that pair already exists in
   `opportunities`, update `last_seen_at` only — no re-scoring, no re-alert.
4. For genuinely new items: normalize into the canonical shape, run the Rubikon Score function, insert
   into `opportunities`.
5. After the full poll pass: for every opportunity inserted in step 4 with `rubikon_score >= 70`, send
   one Telegram alert.
6. Record poll outcome (success/failure, item counts) in `source_health` regardless of outcome.

## Proposed database entities

```sql
CREATE TABLE opportunities (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  source           TEXT NOT NULL,             -- 'rabotniki-ua'
  source_item_id   TEXT NOT NULL,             -- source's own ID/slug for this listing
  url              TEXT NOT NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT,                      -- best-guess match to Rubikon's 5 directions, or 'other'
  region           TEXT,
  published_at     TEXT,                      -- as stated by the source, if available
  deadline_at      TEXT,                      -- as stated by the source, if available
  budget_estimate  TEXT,                      -- free text — sources rarely give a clean number
  raw_snapshot     TEXT,                      -- JSON of the raw scraped data, short retention (see §Resilience)
  first_seen_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at     TEXT NOT NULL DEFAULT (datetime('now')),
  rubikon_score    INTEGER NOT NULL,
  score_breakdown  TEXT,                      -- JSON: which factors contributed what, for auditability
  status           TEXT NOT NULL DEFAULT 'new' -- new | reviewed | pursuing | won | lost | expired | ignored
);
CREATE UNIQUE INDEX idx_opportunities_source_item ON opportunities(source, source_item_id);

CREATE TABLE source_health (
  source              TEXT PRIMARY KEY,
  last_poll_at        TEXT,
  last_success_at     TEXT,
  last_failure_at     TEXT,
  last_failure_reason TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  is_disabled         INTEGER NOT NULL DEFAULT 0   -- boolean; auto-set after too many consecutive failures
);
```

`status` is manually advanced by Dmytro (or later, semi-automatically) — the scraper never sets
anything beyond `new`. This keeps the "did we actually pursue this" judgment call human, which matters
more than automating it in v1.

## Deduplication strategy

- **Primary key for dedup**: `(source, source_item_id)`. Exactly the same idempotency pattern already
  used for `leads.submission_id` in Step 01 — deliberate consistency, not a new pattern to learn.
- **Fallback when a source has no stable ID** (some listing sites don't expose one cleanly): hash of
  `normalize(title) + region + published_at date`, used as `source_item_id` in that case. Documented
  per-adapter, not a general mechanism.
- **Cross-source dedup is explicitly out of scope for v1** — with only one source, there's nothing to
  cross-dedup against yet. Revisit once source #2 exists; it's a fuzzy-matching problem (same real
  tender listed on two platforms with different wording) that isn't worth solving before it's real.

## Polling / update strategy

- Cron interval: start at every 2–4 hours. Tune based on how often the source actually publishes new
  listings — polling hourly against a source that updates twice a day is just noise and unnecessary
  load on their server.
- Each poll only deep-processes items not already known (§Deduplication). Known items get a cheap
  `last_seen_at` bump so "is this still listed" can be inferred (an opportunity that stops appearing in
  the listing but hasn't hit its deadline yet is a signal worth surfacing later, not for v1).
- No per-item re-scoring on repeat sightings for v1 — score is computed once, at first sight.

## Rubikon Score (0–100) proposal

A transparent, additive heuristic — every point should be explainable to a human, not a black box.
Starting weights (tune after real data comes in):

| Factor | Max points | Logic |
|---|---|---|
| Category match | 35 | Exact match to one of the 5 directions (ангари/зерносховища/металоконструкції/бетон/покрівля) = 35. Adjacent/unclear = 15. No construction relevance = 0 (should have been filtered out before scoring, but scored low as a safety net). |
| Region fit | 25 | Дніпропетровська область = 25. Neighboring oblasts = 15. Elsewhere in Ukraine, only if the opportunity is large enough to be worth traveling for (see budget signal) = 5–10. |
| Deadline runway | 15 | Enough time to realistically prepare a response (>10 days) = 15. Tight but possible (3–10 days) = 8. Effectively already too late (<3 days or unclear) = 0. |
| Budget/size signal | 15 | Only scored if the source states a figure or clear scale — matches Rubikon's typical project size = 15, too small to be worth the overhead = 5, too large/uncertain fit = 8, no data = 0 (doesn't penalize, just doesn't reward). |
| Keyword strength | 10 | Title/description contains strong, specific trigger terms ("ангар", "зерносховище", "металоконструкції", "промислова будівля") vs. generic/weak ones. |

Bands: **0–39** = logged only, no alert. **40–69** = held for a (future) daily digest, no immediate
ping. **70–100** = immediate Telegram alert.

`score_breakdown` stores the per-factor points as JSON specifically so a human can see *why* something
scored the way it did and correct the weights over time — this is meant to be tuned by observation, not
frozen on day one.

## Telegram alert rules

- Fires once per opportunity, only at first insert, only if `rubikon_score >= 70`.
- Message contents: title, category, region, deadline, score, one-line reason (top scoring factor),
  and the source URL.
- No re-alerting on `last_seen_at` bumps. No alert for score 40–69 in v1 (daily digest is a named
  AFTER-v1 feature in `docs/automation-roadmap.md`, not part of this MVP).

## Retries / failure handling

- Per-request failures inside one poll: retry with backoff, cap at 3 attempts, then skip that item/page
  for this poll and log it.
- If an entire poll fails to retrieve anything usable: record in `source_health`, increment
  `consecutive_failures`.
- After **3 consecutive fully-failed polls**, auto-set `source_health.is_disabled = 1` and send one
  Telegram alert to Dmytro that the adapter needs attention — better to go quiet and say so than to
  keep silently returning nothing forever.

## Source-change resilience

Sources are almost always unstable HTML pages, not versioned APIs — they *will* change their markup
eventually and silently break the adapter. Two safeguards:

1. **A sanity check per poll**: did this poll return at least *some* plausible number of items (a
   floor, e.g. "fewer than 1 item found where normally there are dozens" is itself a failure signal,
   not just zero results specifically)? Trip the same failure-counter/alert mechanism as §Retries.
2. **Short-retention raw snapshots**: keep `raw_snapshot` (or the raw page HTML, if too large for the
   `opportunities` row) for a short window (e.g. 7 days) so a broken adapter can be debugged against
   what actually came back, instead of guessing.

## How additional sources get added later

1. Write a new module implementing `SourceAdapter`.
2. Complete the §Privacy/legal checklist below for that specific source — this is a gate, not a
   formality, and applies per-source (a green light for Rabotniki.ua says nothing about whether
   scraping a different site is fine).
3. Register it; it gets its own `source_health` row and its own dedup namespace automatically (dedup
   key already includes `source`).
4. **Prozorro is the natural second source** — see §Privacy/legal for why it sits on notably firmer
   legal ground than a private commercial listings site, and consider prioritizing it for that reason
   alone, independent of any pure data-value argument.

## Privacy / legal / robots / API considerations — required before turning on ANY source

This section is the actual gate, not boilerplate. Before writing or enabling a scraper for a given
source, check and document:

- **`robots.txt`** — does it disallow the paths this adapter would fetch? Not automatically illegal to
  ignore, but ignoring it is a real reputational/technical risk (IP bans, and it's simply bad practice)
  and should require an explicit, conscious decision, not an oversight.
- **Terms of Service** — many commercial listing/marketplace sites explicitly prohibit automated
  scraping or reuse of their data in their ToS. Violating that is primarily a *contract* issue (breach
  of terms), not automatically criminal — but it can mean a cease-and-desist, an IP ban, or a public
  dispute with a platform Rubikon may otherwise want a good relationship with. Worth weighing the
  reputational cost, not just the legal one, for a small regional company.
- **Prefer an official API over scraping HTML, if one exists** — more stable, explicitly sanctioned,
  removes the ToS ambiguity entirely.
- **Public-interest open data is meaningfully different from a private marketplace.** Prozorro
  (Ukraine's public procurement system) publishes an *official open API specifically intended for
  reuse* — this is a fundamentally stronger legal footing than scraping a commercial tender-listing
  site's HTML, and is the reason Prozorro is recommended as the priority second source in
  `docs/automation-roadmap.md`.
- **Personal data exposure.** Opportunity/tender listings are mostly about projects and companies, not
  individuals — lower personal-data risk than Partner Network. But if a listing includes an individual
  contact person's name and phone, that *is* personal data under Ukraine's data-protection law (and
  under GDPR-adjacent reasoning if any EU-linked data is ever involved) and should be collected only
  when there's a clear, legitimate business reason (contacting about that specific tender), not stored
  more broadly than needed.
- **Never scrape anything behind a login.** Using automation against content that requires
  authenticated access crosses a much sharper legal line (breach of that platform's account terms, and
  in some jurisdictions adjacent to computer-misuse law) — this should be a hard, explicit non-goal for
  every source, not just this MVP's source.

**Recommendation**: a one-page per-source checklist (robots.txt status / ToS scraping clause / official
API available? / personal-data exposure level / explicit go-or-no-go) completed and signed off *before*
any adapter for that source is enabled — matching the project's existing culture of explicit sign-off
before scope changes (the frozen site roadmap, the Lead Architecture Spec freeze).

## Explicit non-goals for MVP

- No cross-source deduplication (only one source exists).
- No AI/NLP analysis of tender documents.
- No automated bid/proposal generation or auto-submission to any platform.
- No second source at launch (Prozorro comes after, as its own adapter + legal-check pass).
- No dashboard or web UI — Telegram + direct D1 queries only.
- No automatic Opportunity → Project conversion — that stays a manual status change by a human (see
  `docs/rubikon-intelligence-domain.md`).
- No company/investment-signal monitoring (a different, later source category entirely).
