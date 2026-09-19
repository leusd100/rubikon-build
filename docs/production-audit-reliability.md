# Production audit reliability fixes — 2026-09-19

Baseline: `2c85fd0` (main / PR #111). This change requires no D1 migration, new binding,
new dependency, deployment setting, or change to the planner/configurator domain.

## Runtime contracts

- Advertising identifiers are persisted in the tab's attribution record only after Advertising
  consent. Revocation scrubs that record, including legacy pre-consent records, and propagates
  through the browser's storage event to open tabs. An ID still present on the original landing
  page can be captured on consent; navigation before consent can intentionally lose that ID.
- Google collection remains consent-gated. Tests intercept collection; the endpoint-specific
  tests fetch real gtag.js but answer collection locally. Report-only CSP events are diagnostics,
  not proof that an enforced policy blocked a request.
- A lead request has a 20-second browser deadline after Turnstile. A failed or lost response keeps
  the fields and submission ID for an unchanged retry, with a fresh Turnstile token. Editing any
  business field or attachment creates a separate inquiry with a fresh ID; further unchanged
  retries retain that new ID. The error copy explains that the earlier inquiry may already be
  saved. Attribution/consent changes alone do not create a new business inquiry. Confirmed success
  rotates the ID.
- Telegram delivery has a 5-second deadline. A saved D1 lead remains successful if delivery fails;
  the failure is recorded for operator follow-up. This is not a notification retry queue.
- Failed D1 inserts are reconciled by submission ID before refunding the rate reservation.
  Confirmed absence and a losing UNIQUE race refund it; unknown outcomes retain it. A recovered
  committed insert with a lost acknowledgement is successful and records that notification was
  not attempted. Infrastructure errors return the same generic JSON failure contract.
- `generate_lead` is queued once per acknowledged server lead ID on the mounted form, including
  `isNew: false` after a lost response. The standard dataLayer command queue works without a gtag
  function, using gtag's Arguments protocol rather than ordinary arrays. The same helper feeds
  the site's consent and navigation/contact events. An ID is marked queued only after a successful push; tracking errors cannot prevent
  saving the inquiry. Denied consent does not produce a retroactive event. This is local enqueue
  deduplication, not an exactly-once GA4 delivery guarantee: blockers, network failure or closing
  the page may prevent measurement. D1 is the source of truth for accepted inquiries. No persistent
  identifier store or personalized URL is added.
- Home/about videos resume the active clip rather than resetting a ref to clip zero. A keyboard
  accessible 44px pause toggle stops playback and the carousel. Reduced-motion/save-data still
  use the poster. Async transitions cannot restart a clip after effect cleanup.

## Visual baseline review

Exactly twelve macOS references were stale relative to main: team, inquiry, representative cost
and FAQ, each at 375/768/1440px. They were compared side by side with their old macOS references and
current Linux references. The changes reflect already-merged team composition, progressive form,
concrete-work cost fixture, and collapsed hangar FAQ. No screenshot thresholds were relaxed and no
Linux reference was regenerated on macOS. Hero pause placement was separately inspected at
1440×900 and 390×844 with actual playback.

## Initial verification (before follow-up)

- 881 unit tests, explicit typecheck, lint and production build pass.
- 95 desktop inquiry/consent/analytics/video/critical/handoff tests pass; one mobile-only test is
  intentionally excluded by that desktop run and checked in the mobile run.
- 34 mobile consent/handoff tests pass (five desktop-only cases excluded). The final four video
  regressions, including interrupted crossfade, pass; all 53 site-wide/brand visual checks pass.
- Full visual run: 73 pass, five pre-existing 3D snapshot differences (3–20 pixels). An isolated
  build of unchanged main reproduces the same five failures; its five actual PNGs are pixel-identical
  to this branch's actual PNGs. No 3D baseline or threshold is changed. Linux PR Gate remains required.
- Browser API, Telegram, and Turnstile test traffic is mocked. No production lead was submitted.
- CI classifier cases cover Worker/Vite/CSP/consent/attribution changes, standalone CSS and hangar
  composition. The visual runner fails if a selected job has no suites instead of passing empty.

## Release and rollback

Only the owner may authorize deployment. This PR neither deploys nor merges. After approval,
verify the actual deployed revision and use a controlled test inquiry only with separate approval.
Check consent revoke in two tabs, same-ID retry after a simulated lost acknowledgement, mobile
handoff, and hero pause/resume. Do not reuse the original Step 01 smoke steps: they describe a
superseded form lifecycle and automatic messenger handoff.

Rollback is code-only: revert the relevant commits and deploy the reviewed previous version only
with owner authorization. D1 rows and schema need no rollback. Reverting the privacy/consent fix
would reintroduce the advertising-storage defect, so prefer a focused forward fix there.

## Separate operational follow-up (not applied by this PR)

- Cloudflare's query-string redaction was disabled in the read-only audit. Review and enable the
  appropriate observability redaction setting with the owner; do not put personal data into URLs.
- No scheduled retention cleanup for `lead_submit_log` was configured. Agree a retention period
  and an approved cleanup mechanism before adding a cron or deleting production records. The
  ten-minute rate-limit query already excludes expired records; deletion is an operations task.
- Check `lead_notify_failures` through the authorized operator process; notification retries are
  not automatic. Lead data remains in D1 even when Telegram is unavailable.
- Old media assets remain available for cached/external references. Remove them only in a separate
  cleanup after the agreed stabilization period, not as part of reliability fixes.
- macOS verification does not replace Linux CI or real Safari smoke testing. Require PR Gate before
  merge; keep Safari coverage as a distinct compatibility task.


## Follow-up review corrections

The follow-up found that the phone link's full touch rectangle extended underneath pause despite
its text remaining visible. Mobile heroes now reserve a 76px footer in CSS before hydration when
motion is allowed; reduced-motion posters retain their previous composition. Short mobile screens
allow content height instead of clipping the footer. Regression tests check actual rectangle
intersections on home/about at 320×568, 360×640, 390×844, 430×844 and 820×900.

Additional inquiry tests cover edited retry after an already-saved/lost acknowledgement, repeated
failure of the edited request, missing gtag, and a rejecting analytics queue. The original
unchanged-retry and duplicate-acknowledgement tests remain in place. No extra visual references
are updated for this follow-up; the original twelve-reference manual review was a side-by-side
composition/content check, not a claimed 1:1 pixel inspection of every PNG.

Follow-up verification: 885 unit tests pass; typecheck, lint and production build pass.
The form/hero/site-wide visual run passed 96 checks, including all 53 site-wide/brand snapshots.
Home/about touch targets were additionally measured with touch emulation at 320/360/390/430px;
390px screenshots were manually reviewed for composition. No phone-link/pause intersections remain.
Real gtag.js is exercised with collection intercepted, including GA4 batched event payloads:
`generate_lead` must appear once in the outgoing collection commands, not merely in dataLayer.
This verifies queue compatibility, not Google's receipt or reporting guarantees.

Final desktop/mobile consent/form regression: 54 passed, one mobile analytics-only endpoint test
skipped because gtag.js could not be fetched. The real generate_lead collection test passed on
both desktop and mobile. No failed checks in that final run.
