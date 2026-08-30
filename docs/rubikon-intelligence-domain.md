# Rubikon Intelligence — Unified Domain Model

Documentation only, written 29.08.2026. This explores how Project Radar, Partner Network, and the
existing Step 01 lead-capture system could eventually relate — an evolution path, not a schema to build
today. Deliberately not over-engineered: no attempt to design a general-purpose CRM/ERP up front.

## The entities

**Company** — an organization Rubikon has a relationship with, on either side: a potential client, or
a subcontractor/partner. Not yet a real table anywhere — see §What exists today.

**Contact** — an individual person tied to a Company (who to actually call). Doesn't exist as its own
entity yet; both `leads` (Step 01) and `partners` currently fold contact info directly into their own
row rather than referencing a separate Contact table.

**Lead** — *inbound*: someone found Rubikon and asked to be contacted. Exists today: the `leads` table
in the `rubikon-leads` D1 database (Step 01).

**Opportunity** — *outbound*: Rubikon (via Project Radar) found a tender it could pursue, before
anyone asked. Doesn't exist yet — see `docs/project-radar-mvp.md`.

**Project** — confirmed, actually-happening work. Doesn't exist yet as a table; conceptually, a Project
is what a Lead or an Opportunity becomes once it's *won*, not before.

**Partner** — a subcontractor/crew candidate. Doesn't exist yet — see `docs/partner-network-mvp.md`.

**Crew** — a working team, generally under a Partner. Scoped to *external* (subcontractor-side) teams
for now — see §Unresolved decisions for why internal Rubikon labor is deliberately excluded from this
model.

**Source** — where a piece of information came from (a scraper source, or "inbound via site form").
Already exists conceptually in both new modules (`opportunities.source`, `partners.source`) — worth
keeping as a shared *concept*, even before it's a shared *table*.

## How they relate — the example from the brief, walked through

> Project Radar finds a warehouse opportunity → Rubikon qualifies/wins it → opportunity becomes
> project → Partner Network suggests suitable crews.

1. Project Radar's Rabotniki.ua adapter inserts a row into `opportunities` (source-tracked, scored).
2. A human reviews it, marks `status = 'pursuing'`, eventually `status = 'won'`.
3. At `won`, a `Project` record is created, referencing the originating `opportunity_id` (nullable,
   because a Project can *also* originate from a `Lead` instead — see below).
4. Partner Network's matching function (not built in either MVP — see
   `docs/automation-roadmap.md`) queries `partners` filtered by the Project's category + region,
   ranked by `partner_score`, and surfaces a shortlist.

The same `Project` entity can originate from either side of the funnel:

```
Lead (inbound, Step 01) ─┐
                          ├──► Project (won work) ──► Partner/Crew assignment (future matching)
Opportunity (outbound,   ─┘
Project Radar)
```

## What data can stay in the existing D1 architecture initially

- **The current `rubikon-leads` D1 database stays exactly as-is.** Inbound lead volume for a regional
  B2B site is realistically small (submissions per week/month, not per minute) — D1/SQLite has no
  trouble with that indefinitely. No reason to touch Step 01's database for any of this.
- **Project Radar and Partner Network each get their own tables in a separate D1 database,
  `rubikon-intelligence`** — confirmed, not `rubikon-leads`. Reasoning: different bounded context
  (external market intelligence vs. inbound sales), different access pattern (scheduled bulk writes
  from scraping jobs vs. occasional form submissions), different retention/backup considerations (raw
  scrape snapshots churn and get pruned; leads are kept indefinitely as business records). Keeping them
  apart limits blast radius if one side has a problem, and keeps the Step 01 database's simplicity
  intact.
- Project Radar and Partner Network **can share one D1 database with each other**, or even reuse the
  same instance for both — they're similar enough in shape (source-tracked, scored, periodically
  refreshed) that separating them from each other isn't clearly justified the way separating them from
  `rubikon-leads` is.

## Conditions that would justify moving off D1 later

Not "when it gets big" in the abstract — specific, checkable triggers:

- **Full-text search at real scale.** SQLite's FTS5 (available in D1) can go a long way before this is
  a real problem — treat this as a soft trigger, not an assumption that D1 will need replacing.
- **Vector/embedding search**, once "tender-document AI analysis" (a LATER roadmap item) becomes real.
  Notably, this doesn't necessarily mean leaving the Cloudflare ecosystem — **Cloudflare Vectorize**
  exists specifically for this and would be the natural next step to evaluate first, before assuming a
  move to an entirely different cloud provider is required.
- **Heavy analytical/aggregation workloads** — a real dashboard querying years of Opportunity/Partner
  history with complex aggregations is a different access pattern than D1's current use (mostly
  point-lookups and simple filtered scans). This becomes a real trigger once
  `docs/automation-roadmap.md`'s analytics/dashboard item is actually being built, not before.
- **True multi-writer concurrency** beyond what a moderate-write workload comfortably handles — D1 is
  built for read-heavy/moderate-write patterns; if Project Radar ever grows to many simultaneous source
  adapters all writing heavily at once, this is worth re-checking against D1's actual limits at that
  time, not designed around speculatively now.

## Deliberately not built into this model

Per the brief's own instruction not to over-engineer:

- **No unified polymorphic "Organization" table** merging client-side Company and Partner today, even
  though they're conceptually similar (both are "a business Rubikon relates to"). Keep them as separate
  concepts until real usage shows they need to be one table — premature unification here is exactly the
  kind of ERP-flavored over-engineering the brief warned against.
- **No dedicated Contact entity yet.** Both `leads` and `partners` embed contact info directly in their
  own row. A standalone Contact table (for "this Company has 3 people, here's who to call for what")
  becomes worth building once there's a real need — most plausibly triggered by CRM integration (a
  LATER item), not before.
- **No `Company` table at all yet**, on either side. It's named in the brief as a concept worth
  planning around, not something either MVP needs today.

## Resolved decisions (29.08.2026)

1. **Separate D1 database — confirmed.** Name: **`rubikon-intelligence`**. Project Radar and Partner
   Network both live there, kept apart from `rubikon-leads`. Binding name to provision later (not yet
   created — see the Project Radar prototype's own scope boundary): likely `DB_INTELLIGENCE`, to be
   confirmed when the real database is actually provisioned, matching the naming style already used for
   `DB` in Step 01.
2. **`Crew` conceptually supports both internal and external teams — but MVP implements external
   (subcontractor/partner) crews only.** Internal workforce management is *not* built now, and isn't
   ruled out for later, but the two are being kept deliberately separate: internal crew/resource
   management is a meaningfully different, more operationally sensitive problem (HR-adjacent, not
   market-intelligence) and shouldn't be bolted onto the Partner Network schema just because the word
   "crew" is shared. When internal crew support is eventually wanted, it should get its own explicit
   design pass, not an assumed extension of `partners`.
3. **Opportunity → Project stays manual in MVP — confirmed.** Future direction, once there's a track
   record to justify it: marking an Opportunity `WON`/`CONTRACTED` may offer an **assisted** "Create
   Project" action (pre-filling a draft Project from the Opportunity's data) — but Project creation
   itself should always require explicit human confirmation, never happen automatically as a side
   effect of a status change. This is a UX assist, not an automation of the decision.
