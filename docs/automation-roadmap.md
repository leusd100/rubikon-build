# Rubikon Automation Roadmap

Documentation only, written 29.08.2026. Ranks every feature discussed in the long-term product vision
(Project Radar, Partner Network, Rubikon Intelligence, and the future-automation list) by business
impact, implementation complexity, and dependency — and sequences them into phases.

**The current frozen site roadmap (Steps 01–09, `docs/github-baseline-plan.md`,
`rubikon-lead-architecture-spec`) remains authoritative and is not touched or expanded by anything in
this document.** Every item below starts, at the absolute earliest, once the site reaches stable v1.0.
That's why the phase names below don't include "NOW" as a real bucket — nothing here is NOW.

## Phase legend

- **AFTER SITE V1** — earliest possible start; needs the site's own roadmap (Steps 01–09 + Git
  baseline + CI) finished first, nothing else.
- **AFTER PROJECT RADAR** — needs Project Radar's adapter framework, data, and/or real results to be
  worth building.
- **LATER** — genuinely speculative, high complexity, thin dependency chain, or simply lower near-term
  ROI than everything ahead of it in the queue.

## Ranked list

| Feature | Phase | Impact | Complexity | Dependency | Note |
|---|---|---|---|---|---|
| **Project Radar MVP** (single source: Rabotniki.ua) | AFTER SITE V1 | High | Medium | Site v1 stable | Recommended first module overall — see §Recommendation below. |
| Deadline monitoring | AFTER SITE V1 | Medium | Low | Project Radar | Not a separate build — it's just `opportunities.deadline_at`, already part of the Radar MVP schema. Listed separately only because the brief named it separately. |
| Daily Telegram Brief | AFTER PROJECT RADAR | Medium | Low | Radar data existing | A digest query + cron on top of data Radar already collects — cheap once Radar ships. |
| Prozorro / public procurement adapter (source #2) | AFTER PROJECT RADAR | High | Medium | Radar's adapter framework | Prioritize this over most other "AFTER PROJECT RADAR" items — official open-data API, meaningfully lower legal risk than the commercial-marketplace source, broader national coverage. |
| Partner Network MVP | AFTER PROJECT RADAR | High | Medium | No hard technical dependency on Radar, but its value is realized once there are opportunities to match candidates against | Could technically start in parallel with Radar if there's bandwidth for two adapters at once — sequenced after here for focus, not because of a blocking dependency. |
| Lead scoring/enrichment | AFTER PROJECT RADAR | Medium | Low–Medium | Step 01 `leads` data + Radar's scoring approach reused | Same transparent-heuristic scoring philosophy, applied to inbound leads instead of outbound opportunities. |
| Rubikon Intelligence linking (Opportunity→Project→Partner matching) | AFTER PROJECT RADAR | High | Medium | Both Radar and Partner Network existing with real data | See `docs/rubikon-intelligence-domain.md` — the matching function itself, not the data model (which the two MVPs already establish). |
| Opportunity-score weight refinement | AFTER PROJECT RADAR | Medium | Low | Enough real won/lost outcomes from Radar to tune against | Revisit the §Rubikon Score weights in `docs/project-radar-mvp.md` once there's real signal, not before. |
| Tender-document AI analysis | LATER | High (speculative) | High | Enough tender volume to justify an LLM pipeline; a document-parsing layer that doesn't exist yet | Only valuable once manual review is genuinely the bottleneck. |
| Bid/no-bid assistant | LATER | High (speculative) | High | Tender-document analysis + historical win/loss data | Zero historical data exists today since none of this system exists yet — naturally gated behind having *some* track record first. |
| Company / investment-signal monitoring | LATER | Medium | Medium–High | Radar's adapter pattern, but an entirely different source domain (news/investment announcements, not tender listings) | Lower near-term ROI than a second tender source; revisit after Prozorro is live. |
| Material-price monitoring | LATER | Medium | Medium | None technical — needs its own source research from scratch | A genuinely separate data domain (supplier/market pricing) from everything else here. |
| Project configurator / preliminary assessment | LATER | Medium | Medium–High | Frontend-heavy, more related to the marketing site than this intelligence system | Consider scoping this as a *site* feature (Phase 8 territory in the frozen roadmap) rather than part of Rubikon Intelligence at all. |
| Post-project case/review workflow | LATER | — | — | — | **Overlaps with the existing frozen site roadmap's own Phase 8 "Cases System."** Don't build this twice — when the time comes, check that plan first rather than treating it as new scope here. |
| Analytics/dashboard | LATER | Medium | Medium | Enough data volume across Radar + Partners + Leads to be worth visualizing | Premature before there's real history to look at. |
| CRM integration | LATER | Medium–High (long-term) | High | Already named as a future extension point in the Lead Architecture Spec — consistent placement | Third-party integration surface; typically becomes worth it once lead/opportunity volume outgrows manual tracking. |
| Client portal | LATER | High (long-term, speculative) | Very high | Everything else — needs auth, accounts, and real security work far beyond current scope | Clearly last; not worth detailed design until the rest of the pipeline has proven value. |

## Recommendation — first MVP after the site reaches stable v1.0

**Project Radar (single source, Rabotniki.ua).** Reasoning:

- Highest business impact of anything on this list that's actually buildable soon — it directly feeds
  the sales pipeline, which is the whole point of the site work currently underway.
- Lower complexity than it might look: reuses architectural patterns already proven in Step 01
  (source-tracked idempotent records, D1 storage, Telegram notification, a transparent scoring
  function) rather than inventing new ones.
- Clean dependency chain: only needs the site itself to be stable, not any other future module.
- Partner Network is a close second and could reasonably run in parallel if there's capacity for two
  adapters — but Radar alone is the safer single first bet, since its value doesn't depend on anything
  else existing yet, while Partner Network's full value is realized *once there are opportunities to
  match candidates against*.

Everything past Radar (Prozorro as source #2, Partner Network, the matching layer) has a natural,
low-risk sequence from there — each step reuses the last one's infrastructure rather than starting
fresh.
