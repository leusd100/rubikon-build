# Project Radar — Business-Rule Calibration

Written 29.08.2026. **No scoring weights were changed for this pass** — `DEFAULT_SCORE_CONFIG` in
`radar-prototype/src/score.ts` is untouched. This document exists to surface where the current
additive model produces results worth a second look, and to propose (not implement) hard
gates/caps — implementation waits for Dmytro's business classification of the fixtures below.

> ⚠ **All 18 fixtures and URLs are synthetic test data** (`radar-prototype/src/fixtures.ts`, all
> URLs on the reserved `.invalid` TLD, enforced by a test in `radar-prototype/test/pipeline.test.ts`).
> Nothing here is a real tender, a real company, or a real listing.

## Compact scoring table

`Категорія (впевненість)` shows what `categorize()` actually detected, including confidence — this
matters more than it might look, since several of the flagged cases below score high *despite* only
weak category confidence, which the total alone doesn't make obvious.

| # | Проєкт (стисло) | Категорія (впевненість) | Регіон | Бюджет | Дедлайн | Score | Клас | Breakdown (cat/reg/dl/bud/kw) | Ваш вердикт |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Промисловий ангар під логістичний центр | angary (strong) | Дніпропетровська обл. | 1.2 млн грн | 2026-09-19 (20д) | **100** | HIGH_PRIORITY | 35/25/15/15/10 | |
| F2 | Зерносховище на 5000 т, без дедлайну/бюджету | zernoskhovyshcha (strong) | Запорізька обл. (сусідня) | — | — | **60** | REVIEW | 35/15/0/0/10 | |
| F3 | Металоконструкції для промислового цеху | metalokonstruktsii (strong) | Дніпропетровська обл. | 8 млн грн | 2026-09-29 (30д) | **93** | HIGH_PRIORITY | 35/25/15/8/10 | |
| F4 | "Виробниче приміщення" — категорія не розпізналась | other (none) | Дніпропетровська обл. | 900 тис грн | 2026-09-14 (15д) | **60** | REVIEW | 0/25/15/15/5 | |
| F5 | Бетонні роботи: фундамент, без бюджету | betonni-roboty (strong) | Дніпропетровська обл. | — | 2026-09-11 (12д) | **80** | HIGH_PRIORITY | 35/25/15/0/5 | |
| F6 | Ремонт покрівлі, малий обсяг | pokrivelni-roboty (weak) | Львівська обл. (далеко) | 95 тис грн | 2026-09-01 (2д) | **19** | IGNORE | 14/0/0/5/0 | |
| F7 | Ремонт офісу — не будівельний напрям | other (none) | м. Київ | 250 тис грн | 2026-09-24 (25д) | **20** | IGNORE | 0/0/15/5/0 | |
| F8 | Ангар для с/г техніки, дедлайн завтра | angary (weak) | Дніпропетровська обл. | 1.5 млн грн | 2026-08-31 (1д) | **64** | REVIEW | 14/25/0/15/10 | |
| F9 | Зерносховище, без stable ID (fallback dedup) | zernoskhovyshcha (strong) | Полтавська обл. (сусідня) | 1.8 млн грн | 2026-09-17 (18д) | **90** | HIGH_PRIORITY | 35/15/15/15/10 | |
| F10 | Зерносховище, далекий регіон, дуже великий бюджет | zernoskhovyshcha (strong) | Волинська обл. (далеко) | 12 млн грн | 2026-09-21 (22д) | **76** | HIGH_PRIORITY | 35/8/15/8/10 | |
| **F11** ⚠ | **Оренда** ангару під меблі — НЕ будівельний тендер | angary (weak) | Дніпропетровська обл. | 600 тис грн | 2026-09-14 (15д) | **74** | HIGH_PRIORITY | 14/25/15/15/5 | |
| F12 | Багатопрофільний тендер: бетон + покрівля разом | betonni-roboty (strong) — *друга половина обсягу (покрівля) не відображена* | Дніпропетровська обл. | 2 млн грн | 2026-09-13 (14д) | **90** | HIGH_PRIORITY | 35/25/15/15/0 | |
| **F13** ⚠ | Перелічує 3 різні напрями відразу, тон "терміново, дзвоніть" | angary (weak) | Дніпропетровська обл. | 3 млн грн | 2026-09-14 (14д) | **79** | HIGH_PRIORITY | 14/25/15/15/10 | |
| F14 | Дрібний ремонт навісу — негативний контроль | angary (weak) | Чернігівська обл. (далеко) | 60 тис грн | 2026-09-03 (4д) | **27** | IGNORE | 14/0/8/5/0 | |
| F15 | Генпідряд "загальнобудівельні роботи" — категорія неясна | other (none) | Дніпропетровська обл. | 2.5 млн грн | 2026-09-19 (20д) | **55** | REVIEW | 0/25/15/15/0 | |
| **F16** ⚠ | Зерносховище, дедлайн ВЖЕ минув на момент оцінки | zernoskhovyshcha (strong) | Дніпропетровська обл. | 1.5 млн грн | 2026-08-20 (**-10д, минув**) | **85** | HIGH_PRIORITY | 35/25/0/15/10 | |
| F17 | Реконструкція складського комплексу — межовий випадок | angary (weak) | Дніпропетровська обл. | 400 тис грн | 2026-09-16 (17д) | **69** | REVIEW (на 1 бал нижче HIGH) | 14/25/15/15/0 | |
| F18 ⚠ | Індустріальний парк — великий, але лише частина в напрямках Rubikon | angary (weak — "склади" не збігається з ключовим словом "складськ") | Дніпропетровська обл. | 50 млн грн | 2026-09-24 (25д) | **67** | REVIEW | 14/25/15/8/5 | |

*Weight cheat sheet (незмінні): categoryMatch ≤35, regionFit ≤25, deadlineRunway ≤15, budgetSignal ≤15,
keywordStrength ≤10. Пороги: HIGH_PRIORITY ≥70, REVIEW ≥40, інакше IGNORE.*

## Confirmed business rules (29.08.2026)

Dmytro reviewed the four failure patterns below and confirmed, rejected, or refined each one. **None
of this is implemented yet** — `radar-prototype/src/score.ts` and `categorize.ts` are still exactly as
they were before the calibration pass. This section replaces the original "proposed gates" draft with
what's actually been decided.

### 1. Confirmed, refined — expired deadline (F16, 85/HIGH_PRIORITY)

**Confirmed as a hard rule**: an expired opportunity must never generate a live high-priority alert,
regardless of score.

**Refinement from the original proposal**: not a blunt "overwrite `classification` to `IGNORE`" — the
score and breakdown as computed should stay intact in historical data (useful later for tuning and
audit — e.g. "how would this have scored if seen in time"). What must change is that expiry
independently suppresses *live alerting*, as a separate concept from the computed classification.
Exact field shape (a distinct `isExpired`/`alertEligible` flag alongside `classification`, vs.
something else) is an implementation detail for later, not decided here.

### 2. Confirmed, re-diagnosed — object mention vs. construction intent (F11, 74/HIGH_PRIORITY)

**Confirmed as a real problem, but not the one originally proposed.** The issue isn't "weak category
confidence" — it's that **mentioning a relevant object is not the same as needing construction work on
it.** F11 is a hangar *rental*; "ангар" appears in the text, but there's no build/repair/reconstruct
intent at all. A parser could be 100% *confident* this is about a hangar and still be scoring the wrong
kind of listing entirely — confidence and intent are different axes.

**Direction for later** (not implemented): a construction-intent signal, checked independently of
category — positive signals (буд-related verbs: будівництво/монтаж/спорудження/реконструкція/ремонт)
and/or negative signals (оренда/прокат/лізинг) that a real fix would need to weigh against each other,
not just detect one or the other in isolation.

### 3. Rejected — `categoryConfidence === 'strong'` as a blanket HIGH_PRIORITY gate

**Explicitly rejected.** The original proposal (require strong confidence before HIGH_PRIORITY) would
have solved issues 1–2 by accident, but at a real cost: **F18 is a genuinely large, valuable,
relevant project that only got `weak` confidence — because of the exact same parser weakness that's
issue 6 below, not because the opportunity itself is bad.** A confidence-based gate would have
suppressed a good opportunity for the wrong reason. Classification confidence (how sure the parser is
about the *label*) and business attractiveness (how good the *opportunity* is) are staying two separate
concepts — a fix has to target the real cause (intent detection for issue 2, morphology for issue 6),
not confidence as a proxy for either.

### 4. Rejected — "urgent / call now" wording as a negative signal

**Explicitly rejected.** F13's framing in the original write-up treated the urgency tone
("терміново, дзвоніть") as itself suspicious. Confirmed: it isn't — real, legitimate opportunities are
often urgent too, and treating urgency as a red flag would penalize genuinely time-sensitive
opportunities for the wrong reason.

**F13 is left genuinely open as a result** — with gate #3 rejected and tone explicitly not the
answer, F13 (lists three unrelated categories in one listing, weak confidence per direction, high raw
`keywordStrength`) doesn't currently have a confirmed fix. It should be re-examined once issue 2's
intent-detection direction exists, not resolved here.

### 5. Confirmed, parked — multi-discipline opportunities (F12, 90/HIGH_PRIORITY)

**Confirmed as legitimate and potentially high-value**, not an edge case to suppress. The current
single-`category`-field data model is a known, documented limitation — **not changed in this pass.**
Recorded for whenever the `NormalizedOpportunity`/`opportunities` schema is next revisited: it should
support multiple work directions per opportunity, not force one.

### 6. Confirmed, deliberately parked — Ukrainian morphology (F18, 67/REVIEW)

**Confirmed as a real categorization problem**, and explicitly **not to be patched word-by-word** (no
quick "add склад as a broader stem" edit). Ukrainian's inflectional morphology means literal substring
keyword matching will keep producing both false negatives (this case) and — if patched carelessly —
new false positives (a shorter stem like "склад" would match many unrelated listings). This needs a
deliberate categorization-engine design pass later (stemming/lemmatization or similar), recorded here
as a known problem to solve on purpose, not fixed reactively.

## Still open, not resolved by any rule above

- **F13** — genuinely unresolved (see rule 4). Not classified as a confirmed problem or a confirmed
  non-problem yet.
- **F17** (69, one point under HIGH_PRIORITY) — whether this reveals the threshold needs a buffer/
  review band, or whether 69-vs-70 is a fine line to draw, wasn't addressed by any of the 6 rules and
  remains open.
- Whether F12-style multi-category tenders are common enough in practice to justify a near-term
  schema change, or rare enough to stay a documented limitation for longer — parked with rule 5,
  no timeline set.

**Nothing in this document changes `radar-prototype/src/score.ts` or `categorize.ts`.** All six rules
above are recorded decisions about *what's true*, not implementations — algorithm changes wait for a
separate, explicit go-ahead.

## Calibration round 2 — matching Dmytro's 18 business verdicts

Dmytro's verdicts (30.08.2026) are the calibration target. **15 of 18 already match the current
system with zero changes.** Only 3 disagree — analyzed below, with the smallest change proposed for
each. Nothing in this section is implemented; `score.ts`/`categorize.ts` are still untouched.

Dmytro also introduced a three-way conceptual split that shapes every proposal below:
1. **Business attractiveness** (`score`, 0–100) — stays purely additive, untouched.
2. **Understanding/classification confidence** (`categoryConfidence`) — stays untouched (rule 3, above).
3. **Final operational decision** — whether a live alert actually fires. This is the piece that
   currently doesn't formally exist as its own concept; `classification` is being asked to do double
   duty as both "how attractive does this look" and "should we alert on it live," and F16 is the clearest
   proof that those two questions can have different answers for the same opportunity.

### Disagreement table

| # | Current classification | Target | Cause |
|---|---|---|---|
| F5 | HIGH (80) | REVIEW | Strong category/region/deadline, but **no budget stated at all** — see below |
| F11 | HIGH (74) | IGNORE | Rental listing, not a construction tender — already-confirmed rule 2 |
| F16 | HIGH (85) | IGNORE *for live handling* | Expired deadline — already-confirmed rule 1 |

Every other fixture (15/18) already matches — including F13 (weak confidence, still correctly HIGH,
confirming rule 3 was the right call to reject) and F17/F18 (correctly REVIEW already, no change
needed).

### Why F5 disagrees

F5 ("Бетонні роботи: фундамент під промислову будівлю") is strong category + primary region + good
deadline — identical profile to F1/F3/F9/F10/F12/F13, all of which are correctly HIGH. The one field
F5 is missing that all six of those have: **a stated budget.** Checked across all 18 fixtures — F2 and
F5 are the *only two* with no `budgetHint` at all, and F2 is already (correctly) REVIEW. This isn't
about the budget *being small* — it's about not knowing the scale at all, which is a different kind of
uncertainty than the geography/deadline/confidence gates already ruled out.

**Proposed change (weight adjustment, not a hard gate):** currently `scoreBudgetSignal()` returns `0`
for the `'unknown'` tier (no data → no penalty, no reward). Proposed: change that to a **negative**
value — e.g. `-15` — so missing budget information costs real points instead of being neutral. This
stays entirely inside the existing additive model; nothing is blocked outright, a strong-enough
opportunity could still clear HIGH_PRIORITY even without budget data if every other factor maxed out
(35+25+15-15+10 = 70, exactly at the line) — so this is a weight change, not a categorical exclusion,
and doesn't fall under "no hard gates for budget yet."

**Expected result:** F5: 80 → **65** (REVIEW). F2 (the only other unknown-budget fixture): 60 → **45**
(still REVIEW — no regression, it was already correct).

**Risk check:** every other fixture has a stated budget, so this change touches *only* F2 and F5 among
all 18 — verified by checking `budgetHint` presence on every fixture, not assumed.

**Open question for Dmytro, not decided here:** `-15` is a first guess, not a calibrated number — it's
sized to be enough to flip F5 without flipping anything else, not derived from a business rule. Worth
an explicit "does missing budget always deserve this much of a penalty" gut check before implementing,
since this generalizes to every future real opportunity with no stated budget, not just F5.

### Why F11 and F16 disagree — and the same fix shape covers both

Both are already-confirmed rules (1 and 2, above) — what's new here is *how* to implement them
minimally, given Dmytro's three-way split.

**Proposed change:** add one new field, computed *after* `score`/`classification`, never modifying
either: `operationalDecision`. Live alerting reads `operationalDecision`, not `classification`,
directly.

```
operationalDecision =
  if deadline has already passed (same date check scoreDeadlineRunway already does)  → 'IGNORE'
  else if title/description matches a rental/lease term (оренда, прокат, лізинг,
       суборенда)                                                                     → 'IGNORE'
  else                                                                                 → classification
```

`score`, `breakdown`, and `classification` stay exactly as computed either way — F16 keeps showing
`HIGH_PRIORITY, 85` as its own historical record (matching Dmytro's own words: "historically it would
have been attractive"), while `operationalDecision: 'IGNORE'` is what actually suppresses the live
alert. Same shape as the honeypot check already in Step 01's `/api/leads` — a check that runs
independently of, and after, the main logic, not a rewrite of the main logic itself.

**Expected result:** F16 → `operationalDecision: IGNORE` (score/classification unchanged at 85/HIGH).
F11 → `operationalDecision: IGNORE` (score/classification unchanged at 74/HIGH).

**Risk check:**
- Expired-check: scanned all 18 `deadlineAt` values against the prototype's reference "now" —
  **F16 is the only one in the past.** Zero collateral effect. Note this is deliberately narrower than
  "short deadline" — F8's deadline is 1 day *away* (still future), not expired, and correctly stays
  REVIEW on its own score with no override needed; this change does not touch short-but-future
  deadlines at all.
- Rental-check: scanned all 18 texts for оренда/прокат/лізинг/суборенда — **F11 is the only match.**
  Zero collateral effect.
- **Known limitation of the minimal keyword list**: a future real rental listing phrased differently
  ("здається в оренду", "надаємо в тимчасове користування") wouldn't be caught by these four words —
  acceptable for matching the current 18-fixture target, not a complete intent-detection system (that
  remains the larger "Direction for later" already noted under rule 2, above).

### Net result if all three changes are approved

Every one of the 18 fixtures' `operationalDecision` would match Dmytro's verdict exactly — verified by
hand for each fixture, not just the three that currently disagree. Three small, independent, additive
changes; nothing structural, no rework of `categorize.ts`'s keyword lists (rule 6 stays parked), no
data-model change (rule 5 stays parked).

**Still not implemented. Waiting for approval before touching `score.ts` or `categorize.ts`.**
