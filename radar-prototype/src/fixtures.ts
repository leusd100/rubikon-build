import type { RawItem } from './types.js';

/**
 * ⚠ SYNTHETIC / TEST DATA ONLY. Nothing below is a real tender, real listing, or real company.
 * All URLs use the `.invalid` TLD (reserved by RFC 2606 specifically for guaranteed-non-resolving
 * addresses) so nothing here can be mistaken for, or accidentally resolve to, a real website.
 *
 * 18 listings, shaped like what a real Rabotniki.ua-style adapter would produce. F1–F10 are the
 * original scoring-path coverage set (strong/weak/no category match, primary/neighboring/distant
 * region, short/long/missing deadlines, small/sweet-spot/large/unknown budgets, one item with no
 * stable sourceItemId). F11–F18 were added specifically to stress-test the additive scoring model
 * for business-rule calibration — see docs/project-radar-calibration.md for the compact scoring
 * table and the "questionable results" analysis these particular items were designed to surface.
 *
 * All dates are relative to the prototype's fixed reference "now" (2026-08-30) used in run.ts and
 * the tests, so scoring output is reproducible on every run.
 */
export const fixtures: RawItem[] = [
  // F1 — strong fit across every factor. Expected: HIGH_PRIORITY.
  {
    sourceItemId: 'rb-10231',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10231',
    title: 'Будівництво промислового ангару під логістичний центр',
    description: 'Швидкомонтований ангар, складські приміщення, під’їзні шляхи для вантажівок.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-25',
    deadlineAt: '2026-09-19',
    budgetHint: '1.2 млн грн',
  },
  // F2 — strong category, neighboring region, no deadline stated, no budget. Expected: REVIEW.
  {
    sourceItemId: 'rb-10244',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10244',
    title: 'Зерносховище на 5000 тонн — пошук підрядника',
    description: 'Потрібен елеватор для зберігання зерна нового врожаю.',
    region: 'Запорізька область',
    publishedAt: '2026-08-27',
  },
  // F3 — strong fit, very large budget (tests the very-large tier, not the sweet spot). Expected: HIGH_PRIORITY.
  {
    sourceItemId: 'rb-10250',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10250',
    title: 'Металоконструкції для промислового цеху — каркас і сталевий несучий контур',
    description: 'Виготовлення та монтаж сталевих ферм і колон для нового виробничого корпусу.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-20',
    deadlineAt: '2026-09-29',
    budgetHint: '8 млн грн',
  },
  // F4 — weak/no category keyword match, but good region/deadline/budget. Expected: REVIEW.
  {
    sourceItemId: 'rb-10261',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10261',
    title: 'Будівництво виробничого приміщення для зберігання обладнання',
    description: 'Промислового призначення приміщення, потрібен підрядник під ключ.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-26',
    deadlineAt: '2026-09-14',
    budgetHint: '900 тис грн',
  },
  // F5 — strong category, primary region, good deadline, but no budget stated at all. Expected: HIGH_PRIORITY
  // (shows a missing budget doesn't block a strong result when everything else is solid).
  {
    sourceItemId: 'rb-10273',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10273',
    title: 'Бетонні роботи: фундамент під промислову будівлю',
    description: 'Монолітний фундамент, армування, підготовка основи під каркас.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-28',
    deadlineAt: '2026-09-11',
  },
  // F6 — weak category, distant region, small budget, tight deadline. Expected: IGNORE.
  {
    sourceItemId: 'rb-10280',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10280',
    title: 'Ремонт покрівлі виробничого цеху',
    description: 'Локальний ремонт пошкодженої ділянки даху.',
    region: 'Львівська область',
    publishedAt: '2026-08-29',
    deadlineAt: '2026-09-01',
    budgetHint: '95 тис грн',
  },
  // F7 — no construction-direction relevance at all. Expected: IGNORE.
  {
    sourceItemId: 'rb-10291',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10291',
    title: 'Ремонт офісного приміщення в бізнес-центрі',
    description: 'Косметичний ремонт, заміна підлогового покриття.',
    region: 'м. Київ',
    publishedAt: '2026-08-24',
    deadlineAt: '2026-09-24',
    budgetHint: '250 тис грн',
  },
  // F8 — everything decent except deadline is essentially tomorrow, and category confidence is only
  // weak. Expected: REVIEW (not HIGH_PRIORITY) — see docs/project-radar-calibration.md, this is a
  // real boundary case worth discussing, not a "should obviously be X" fixture.
  {
    sourceItemId: 'rb-10305',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10305',
    title: 'Ангар для сільськогосподарської техніки — промисловий проєкт',
    description: 'Швидкий тендер, потрібне рішення в стислі строки.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-29',
    deadlineAt: '2026-08-31',
    budgetHint: '1.5 млн грн',
  },
  // F9 — no sourceItemId at all, exercises the content-hash dedup fallback in dedupe.ts.
  {
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/no-id-listing',
    title: 'Будівництво зерносховища — елеватор на новому майданчику',
    description: 'Комплексний проєкт зберігання зерна.',
    region: 'Полтавська область',
    publishedAt: '2026-08-23',
    deadlineAt: '2026-09-17',
    budgetHint: '1.8 млн грн',
  },
  // F10 — strong category, distant region, but a very large budget makes it worth traveling for.
  // Expected: HIGH_PRIORITY — demonstrates the "elsewhere, but large enough" region rule.
  {
    sourceItemId: 'rb-10318',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10318',
    title: 'Зерносховище та елеватор — масштабний проєкт зберігання',
    description: 'Великий інвестиційний проєкт, національний рівень постачальника.',
    region: 'Волинська область',
    publishedAt: '2026-08-22',
    deadlineAt: '2026-09-21',
    budgetHint: '12 млн грн',
  },

  // ---- F11–F18: added for business-rule calibration — see docs/project-radar-calibration.md ----

  // F11 — a keyword false-positive trap: this is an EQUIPMENT/SPACE RENTAL, not a construction
  // tender, but "ангар" appears literally in the text. Scores surprisingly high on pure keyword +
  // region + budget-number grounds. Flagged in the calibration doc as the strongest case for a gate.
  {
    sourceItemId: 'rb-10402',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10402',
    title: 'Оренда ангару для тимчасового зберігання меблів',
    description: 'Потрібне приміщення ангарного типу, термін оренди 6 місяців.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-27',
    deadlineAt: '2026-09-14',
    budgetHint: '600 тис грн',
  },
  // F12 — a genuinely multi-trade tender (both concrete AND roofing work). categorize() can only
  // assign one category, silently dropping the other half of the scope. A data-model limitation,
  // not obviously a scoring bug — flagged separately in the calibration doc.
  {
    sourceItemId: 'rb-10415',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10415',
    title: 'Комплексний ремонт: бетонні роботи та заміна покрівлі складу',
    description: 'Потрібні бетонні роботи (фундамент) та покрівельні роботи одночасно.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-26',
    deadlineAt: '2026-09-13',
    budgetHint: '2 млн грн',
  },
  // F13 — a keyword-stuffed, low-substance listing (lists three unrelated building types as if
  // interchangeable, "терміново, дзвоніть" tone) — the kind of post a human would immediately treat
  // as low-credibility, but scores HIGH_PRIORITY. The strongest case for requiring
  // categoryConfidence==='strong' (not just a high total) before HIGH_PRIORITY is allowed.
  {
    sourceItemId: 'rb-10427',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10427',
    title: 'Ангар зерносховище металоконструкції промисловий об’єкт терміново',
    description: 'Ангар, зерносховище, металоконструкції — терміново, дзвоніть.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-29',
    deadlineAt: '2026-09-14',
    budgetHint: '3 млн грн',
  },
  // F14 — negative control: a genuinely small, low-value, distant repair job. Should score low, and
  // does — included to prove the model isn't just permissive by default.
  {
    sourceItemId: 'rb-10433',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10433',
    title: 'Ремонт невеликого складського навісу',
    description: 'Локальний ремонт, невеликий об’єм робіт.',
    region: 'Чернігівська область',
    publishedAt: '2026-08-28',
    deadlineAt: '2026-09-03',
    budgetHint: '60 тис грн',
  },
  // F15 — a genuinely category-ambiguous generic tender, but with solid region/deadline/budget.
  // Lands in REVIEW — a positive example of the model correctly punting an unclear case to a human
  // instead of guessing, contrasting with F13's false HIGH_PRIORITY.
  {
    sourceItemId: 'rb-10441',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10441',
    title: 'Будівництво об’єкта — тендер на загальнобудівельні роботи',
    description: 'Шукаємо генпідрядника для комплексного будівництва.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-25',
    deadlineAt: '2026-09-19',
    budgetHint: '2.5 млн грн',
  },
  // F16 — strong fit on every factor EXCEPT the deadline has already passed at "now". Scores
  // HIGH_PRIORITY anyway, because the other four factors compensate for a zero deadline score. The
  // strongest case for a hard "deadline already passed → force IGNORE" gate, independent of total.
  {
    sourceItemId: 'rb-10456',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10456',
    title: 'Термінове будівництво зерносховища',
    description: 'Елеватор, зберігання зерна нового врожаю.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-10',
    deadlineAt: '2026-08-20', // before the prototype's reference "now" of 2026-08-30
    budgetHint: '1.5 млн грн',
  },
  // F17 — a realistic near-miss: weak category confidence pulls it just one point under the
  // HIGH_PRIORITY threshold. Useful for calibration precisely because it's a boundary case, not an
  // obvious one.
  {
    sourceItemId: 'rb-10462',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10462',
    title: 'Реконструкція складського комплексу',
    description: 'Плановий проєкт, замовник вже визначив основні вимоги.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-27',
    deadlineAt: '2026-09-16',
    budgetHint: '400 тис грн',
  },
  // F18 — a large multi-building industrial park, only part of which (the hangars/warehouses) is
  // actually Rubikon's scope. Scores HIGH_PRIORITY correctly ("worth a look"), but the score itself
  // can't express that the full tender exceeds Rubikon's own capability — that judgment call is
  // exactly the future "bid/no-bid assistant" territory from docs/automation-roadmap.md, not
  // something Score v1 should try to solve.
  {
    sourceItemId: 'rb-10470',
    url: 'https://synthetic-fixture.invalid/rabotniki-ua-style/tender/10470',
    title: 'Будівництво індустріального парку — багатофункціональний комплекс',
    description: 'Ангари, склади, адміністративні будівлі, інженерні мережі. Багатоетапний проєкт.',
    region: 'Дніпропетровська область',
    publishedAt: '2026-08-18',
    deadlineAt: '2026-09-24',
    budgetHint: '50 млн грн',
  },
];
