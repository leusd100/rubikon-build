# Handoff · Тест GA4: заблокований маяк googletagmanager.com/td не вважається падінням

| | |
|---|---|
| Дата | 2026-10-24 |
| Виконавець | Claude Code |
| Підстава | Рішення власника 24.10: «у тесті аналітики ігноруй лише заблокований CSP маяк googletagmanager.com/td, решту перевірок лиши» |
| PR | Draft. **Merge — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `test/analytics-ignore-td-beacon` від `main` `96d2492` |
| Коміти | **`027fc7f`** — тест · цей handoff |
| Змінено | `tests/e2e/analytics-consent.spec.ts` — одна умова в останній перевірці й константа `TAG_DIAGNOSTICS` |
| Не змінено | Сайт, CSP, налаштування GA4, решта перевірок тесту |

## Що було

`analytics-consent.spec.ts:119` («Прийняти все» / «лише аналітика») навмисно завантажує справжній gtag.js. Він перевіряє, що вимірювання йде лише через `*.google-analytics.com`, без рекламних і Signals-запитів і без порушень CSP. 24.10 тест двічі впав (прогони #237 і #238), раз на кілька прогонів. Причина — службовий маяк Google: `img https://www.googletagmanager.com/td?id=G-…`. CSP сайту блокує його до виходу з браузера. На повторі тест проходив, але `failOnFlakyTests` робить шард червоним.

## Що зроблено

Остання перевірка ігнорує рівно одне порушення: `img-src https://www.googletagmanager.com/td…`. Маяк заблоковано, нічого з нього до Google не доходить. Без змін лишилися:

- `/g/collect` лише на `*.google-analytics.com`;
- жодних рекламних і Signals-запитів (doubleclick, ga-audiences, googlesyndication, googleadservices, /pagead/);
- жодних інших Google-запитів поза `*.google-analytics.com`;
- будь-яке інше порушення CSP, пов'язане з Google, — падіння.

CSP не розширено. Якби маяк `/td` дозволили, Google отримував би додаткові дані, а тест однаково впав би на перевірці «запити поза google-analytics.com».

## Перевірка

| Що | Результат |
|---|---|
| Шаблон `TAG_DIAGNOSTICS` на рядку з логу CI і 5 негативних прикладах (інша директива, `/tdx`, `/gtag/js`, doubleclick, script-src) | ігнорує лише `img-src …/td` |
| `tsc`, `eslint` | чисто |
| Сам тест | лише в CI: локально справжній gtag.js не завантажуємо |
| CI | у коментарі PR |

## Відкат

`git revert 027fc7f`.
