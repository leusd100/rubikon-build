# Step 01 — Lead & Conversion Architecture: Deployment Runbook

Documentation only — written before deployment, against the code in `app/api/leads/route.ts`,
`app/components/ProjectInquiryForm.tsx`, `app/components/InquirySection.tsx`,
`app/lib/attribution.ts`, and `migrations/0001_create_leads.sql` as they exist on 29.08.2026. If any
of those files change after this is written, re-check this runbook against them before relying on it.

---

## 1. Prerequisites

All four must exist **before** deploying the new code, or every lead submission will fail server-side
(the form itself will still render and validate client-side — it's the `/api/leads` call that needs
these):

| # | Requirement | Where it's configured | Binding name expected by the code |
|---|---|---|---|
| 1 | D1 database created | Cloudflare Dashboard → Workers & Pages → D1, or `wrangler d1 create rubikon-leads` | database name: `rubikon-leads` (name itself isn't read by code, only the binding is) |
| 2 | D1 bound to the Worker | Worker → Settings → Bindings → D1 Database | **`DB`** (exact, case-sensitive) |
| 3 | Rate-limit salt secret | Worker → Settings → Variables and Secrets → add Secret | **`IP_HASH_SALT`** — any random string, doesn't need to be memorable, just needs to exist and stay stable (rotating it resets everyone's rate-limit history, which is harmless) |
| 4 | Telegram bot token secret | Worker → Settings → Variables and Secrets → add Secret | **`TELEGRAM_BOT_TOKEN`** — from @BotFather |
| 5 | Telegram chat ID secret | Worker → Settings → Variables and Secrets → add Secret | **`TELEGRAM_CHAT_ID`** — from the bot's `getUpdates` response |

Binding names are **case-sensitive** and must match exactly — `app/api/leads/route.ts` reads
`env.DB`, `env.IP_HASH_SALT`, `env.TELEGRAM_BOT_TOKEN`, `env.TELEGRAM_CHAT_ID` literally. A typo'd
binding name doesn't throw a clear error at the point you'd expect — see §9.

## 2. Migration steps

Apply `migrations/0001_create_leads.sql` **once**, against the real `rubikon-leads` database (not a
local/preview one):

**Option A — Cloudflare Dashboard (no CLI needed):**
1. D1 → `rubikon-leads` → Console.
2. Paste the full contents of `migrations/0001_create_leads.sql`.
3. Run it.

**Option B — Wrangler CLI**, if authenticated against the right account:
```bash
wrangler d1 execute rubikon-leads --remote --file=migrations/0001_create_leads.sql
```
(`--remote` is required — without it, wrangler applies the migration to a local/preview D1 instance,
not the real one the deployed Worker reads from.)

**Verify it applied**, either via the Dashboard's table browser or:
```sql
SELECT name FROM sqlite_master WHERE type='table';
-- expect: leads, lead_submit_log, lead_notify_failures (plus sqlite's own internal tables)
```
The migration is written with `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so running
it twice is safe (a no-op the second time) — no need to track "did I already run this" separately.

## 3. Deployment pre-checks

Before actually shipping to production:

- [ ] `pnpm install` completes cleanly.
- [ ] `pnpm lint` passes.
- [ ] `pnpm build` succeeds locally with no errors (this repo's sandbox couldn't run this — first
      real build check happens on your machine or in the deploy pipeline).
- [ ] §1 and §2 above are both done — deploying the code before the binding/migration exist will not
      corrupt anything, but every lead submitted in that window is lost (server returns a 500, the
      form shows the error state — see `app/components/ProjectInquiryForm.tsx`'s `is-error` status —
      but nothing is recoverable from that failed attempt).
- [ ] Confirm which environment the deploy actually targets — if the Cloudflare project has separate
      preview/production environments with independently-configured bindings, double-check the
      binding was added to the **production** environment specifically, not just "the Worker" in the
      abstract.

## 4. 10-point smoke test, with expected results

Run all 10 in order on the **live production URL**, not a preview. Suggested test parameters:
`https://rubikonbuild.com/angary?utm_source=test&utm_medium=test&utm_campaign=step01-test`

| # | Step | Expected result |
|---|---|---|
| 1 | Load `/angary` with the UTM params above, open DevTools → Network tab first | Page loads normally; hero shows a "Обговорити проєкт" button |
| 2 | Click the hero CTA | Page scrolls to the `#inquiry` section on the **same page** (no navigation, no URL change beyond the hash) |
| 3 | Confirm the "Напрям робіт" select is pre-filled | Shows "Ангари та склади" already selected, not the placeholder |
| 4 | Fill the form (real-looking test name/phone), check the consent box, choose "Дзвінок", submit | Button shows "Зберігаємо…" briefly, then status message says "Заявку збережено…" |
| 5 | Check the Network tab for the `/api/leads` request | Status `200`, response body `{"ok":true,"id":<number>,"isNew":true}` |
| 6 | Re-submit the exact same in-memory form (don't reload the page) with the same values | A second `/api/leads` call fires with the **same** `submissionId` as request #5 (confirm in the request payload) — response is `{"ok":true,"id":<same id as before>,"isNew":false}` |
| 7 | Reload the page fresh, submit once more | New `submissionId` this time (different from #5/#6), new `id` in the response |
| 8 | Submit two more times in quick succession (4th distinct submission within ~10 minutes total from this session) | 4th attempt returns `429` with `{"ok":false,"error":"rate_limited"}` |
| 9 | Try each of the other 3 contact methods (Telegram/WhatsApp/Viber) on separate fresh loads | Each opens the correct app/link only **after** the "Заявку збережено" status appears — never before |
| 10 | Resize DevTools to 375px and 390px width, repeat steps 1–4 | No horizontal overflow, hero CTA and form fully usable, consent checkbox tappable |

## 5. D1 verification checklist

Run in the D1 console (Dashboard) after the smoke test above:

```sql
SELECT id, submission_id, name, phone, direction, contact_method, source_page, landing_page,
       referrer, utm_source, utm_medium, utm_campaign, consent_at, privacy_version, status
FROM leads
ORDER BY id DESC
LIMIT 5;
```

Checklist against the row(s) created by §4:

- [ ] Exactly **one** row per distinct submission (step 6's retry did **not** add a second row —
      count rows with that `submission_id`, expect exactly 1).
- [ ] `source_page` = `/angary`.
- [ ] `direction` = `Ангари та склади`.
- [ ] `utm_source` = `test`, `utm_medium` = `test`, `utm_campaign` = `step01-test`.
- [ ] `consent_at` is a populated ISO timestamp, not empty.
- [ ] `privacy_version` = `2026-08-29` (matches `company.privacyVersion` in `app/data/company.ts` —
      if that constant is ever bumped, this expected value must be updated too).
- [ ] No column anywhere in the table contains a raw IP address — the schema has no such column by
      design; this is really a check that nobody added one by hand later.

```sql
-- Confirm the rate-limit log has entries but never any personally-identifying data:
SELECT ip_hash, created_at FROM lead_submit_log ORDER BY created_at DESC LIMIT 5;
-- ip_hash should be a 64-character hex string (SHA-256), never a plain IP.
```

## 6. GA4 and Telegram manual verification

**Telegram:**
- [ ] Exactly one message arrived for the smoke-test submission in §4 step 4 — not zero, not two.
- [ ] The message contains name/phone/direction/contact method/source page, matches what was
      submitted.
- [ ] The retry in §4 step 6 (idempotent duplicate) did **not** produce a second Telegram message.

**GA4** (needs GA4 DebugView or Realtime, in the property's own dashboard):
1. On the test browser, make sure analytics consent was **granted** (accept the cookie banner) before
   running the smoke test — the event won't fire at all otherwise, which is correct behavior, not a
   bug, but easy to mistake for one if consent was denied during the test.
2. In GA4 DebugView, confirm:
   - [ ] `generate_lead` appears exactly once for the successful submission in §4 step 4.
   - [ ] It does **not** appear again after the idempotent retry in §4 step 6.
   - [ ] `inquiry_contact_attempt` also appears (fires earlier, on submit-click regardless of
         server outcome) — this one is expected to fire on every attempt, including the retry; that's
         correct, it's a different, intentionally-broader signal than `generate_lead`.

## 7. Rate-limit and idempotency test cases

Beyond the happy-path checks already in §4/§5, a few edge cases worth deliberately trying:

- **Idempotency across page reloads**: submit once, note the `id` returned. Reload the page (which
  generates a **new** `submissionId`, since it's `useState(() => crypto.randomUUID())` — one per
  mount, not persisted). Submit again with the same form values but the new session's
  `submissionId`. Expect: a genuinely **new** row in `leads` — same-looking data, different
  `submission_id`, different `id`. This is correct: idempotency protects against the same request
  being retried, not against a human submitting twice on purpose.
- **Rate-limit recovery**: after hitting `429` in §4 step 8, wait past the 10-minute window (see
  `RATE_LIMIT_WINDOW` in `app/api/leads/route.ts`) and confirm a new submission succeeds again.
- **Rate-limit is per-IP, not global**: if possible, test from a second network (phone on cellular
  data, or a VPN) — that submission should succeed even while the first IP is still rate-limited.
- **Honeypot**: using DevTools, manually set a value into the hidden `companyWebsite` input and
  submit. Expect: the client-side check already blocks this before any network call fires (see
  `ProjectInquiryForm.tsx`'s `handleSubmit`) — confirm no `/api/leads` request appears in the Network
  tab at all for this case.

## 8. Rollback procedure

This change is **additive** — no existing route, table, or page was removed, and no existing behavior
was deleted (only `siteRoutes.contact`'s target changed from `/#contact` to `#inquiry`, and the old
`PageCta` component is unused but still present in `SiteChrome.tsx`). That makes rollback low-risk in
both directions:

**Fast path — Cloudflare's own deployment rollback:**
Workers on Cloudflare keep a version history. If something is visibly broken right after deploy,
Workers & Pages → the Worker → Deployments → roll back to the previous deployment is the fastest fix,
independent of git — do this first if the site itself looks broken, then investigate calmly.

**Git-level rollback** (once Step 01 is committed per `docs/github-baseline-plan.md`'s commit
boundary — `feat: lead capture`):
```bash
git revert <step-01-commit-sha>
```
then redeploy via whatever the normal pipeline is. Since the change is additive, reverting the
frontend code is safe even if some `leads` rows already exist in D1 — nothing depends on the new
columns/tables existing for the rest of the site to keep working; the old client-side-only
`ProjectInquiryForm` behavior (redirect to messenger without a server round-trip) is restored exactly
as it was before.

**D1 data is never at risk from a rollback** — the migration only ever `CREATE`s tables, nothing
drops or alters them, and rolling back the frontend/route code doesn't touch D1 content at all. If a
rollback happens mid-incident, any leads already saved stay saved and recoverable.

## 9. Known failure modes — what to check first

| Symptom | Most likely cause | Where to look |
|---|---|---|
| `/api/leads` returns `404` | Code not actually deployed yet, or the deploy pipeline didn't pick up the new route file | Confirm the deployed Worker's build actually includes `app/api/leads/route.ts` — this was the exact symptom found on the still-old production build on 29.08.2026 |
| `/api/leads` returns `500` on every submission | `DB` binding missing or misnamed | Worker → Settings → Bindings — confirm a D1 binding literally named `DB` exists |
| Every submission returns `ok:false, error:"server"` (500), immediately, before any D1 row is written | `IP_HASH_SALT` unset — the route now fails loudly and returns 500 rather than silently hashing with an empty salt | Confirm the `IP_HASH_SALT` secret exists on the Worker at all |
| Leads accumulate in D1, but no Telegram messages ever arrive | `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` missing, wrong, or the bot was never actually messaged first (Telegram bots can't message a chat that hasn't messaged them first) | `lead_notify_failures` table — every failed notification attempt is logged there with the error text; check it before assuming the bot itself is broken |
| A lead submission returns `ok:false, error:"validation"` unexpectedly | Client and server field-length/format rules drifted (e.g. phone format, or a new value added to direction options on one side but not the other) | Compare `PHONE_PATTERN`/`DIRECTION_ALLOWLIST`/`CONTACT_METHODS` in `app/api/leads/route.ts` against the actual form inputs in `ProjectInquiryForm.tsx` and `data/directions.ts` |
| Same visitor sees "Заявку збережено" but the header "Контакти" link scrolls nowhere useful | Only expected on `/logo-variants` — a disclosed, accepted exception (noindexed internal page, not a real nav destination); anywhere else is a real regression | Confirm `id="inquiry"` exists on the current page — every real page except `/logo-variants` should have one |
| Form shows the error state ("Не вдалося зберегти запит…") even though D1 looks fine | Could be a genuine transient network issue, or a CSP/connect-src block on the `fetch('/api/leads')` call | Browser console for a CSP violation report; compare `next.config.ts`'s and `proxy.ts`'s `connect-src` directives — both currently allow `'self'`, which should cover a same-origin `/api/leads` call, but verify neither was edited in a way that narrows it |

## 10. Success criteria for declaring Step 01 green

All of the following, not a subset:

- [ ] §3 pre-checks all pass.
- [ ] §4's 10-point smoke test: all 10 rows produce the expected result, on the real production URL.
- [ ] §5's D1 checklist: every box checked against a real row from the smoke test.
- [ ] §6: exactly one Telegram message, exactly one `generate_lead` GA4 event, both tied to the
      correct submission, neither duplicated by the idempotent-retry test.
- [ ] §7's edge cases: idempotency-across-reload behaves as a new lead (correct), rate-limit both
      blocks at the 4th attempt and recovers after the window, honeypot never reaches the network.
- [ ] No item in §9's failure-mode table is currently occurring.
- [ ] Nothing outside Step 01's own file list (see `docs/github-baseline-plan.md`) was touched to get
      here — if a fix was needed, it should be a small patch to those same files, not new scope.

Once every box above is checked, Step 01 is closed and Step 02 (Cloudflare image delivery + cache
headers) can start on its own explicit go-ahead.

## 11. Known operational follow-ups (recorded, not built)

Accepted as out-of-scope for Step 01 itself — tracked here so they aren't lost, not implemented
now:

- **`lead_submit_log` pruning.** The migration's own comment says this table is kept separate from
  `leads` "so it can be pruned independently," but nothing prunes it yet — rows accumulate
  indefinitely (one row per accepted-then-reserved submission attempt, most of them within the
  10-minute rate-limit window). It's small (one `ip_hash` + one timestamp per row) and doesn't
  affect correctness, so this is a low-urgency housekeeping item, not a blocker. When picked up:
  a periodic `DELETE FROM lead_submit_log WHERE created_at < datetime('now', '-1 day')` (or similar)
  is enough — no scheduler exists in this repo today, so this would need its own explicit go-ahead
  before adding one (Cron Triggers, an external cron hitting an authenticated endpoint, or a manual
  occasional cleanup query are all options to weigh then, not now).
