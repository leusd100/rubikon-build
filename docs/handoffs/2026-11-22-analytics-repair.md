# Handoff · Ремонт аналітики: GA4 лише на rubikonbuild.com, ключ подання в generate_lead (DEC-06 · 1B)

| | |
|---|---|
| Дата | 2026-11-22 |
| Виконавець | Claude Code |
| Підстава | DEC-06 «Ремонт аналітики» (APPROVED як напрям, 27.09); специфікація ремонту в приватному control (`measurement/ANALYTICS_REPAIR_SPEC.md`, §3–§5, §8–§9); старт — рішення власника 22.11 («Почати 1B аналітику») |
| PR | [#329](https://github.com/leusd100/rubikon-build/pull/329), Draft. **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `fix/analytics-repair` від `main` `e3a41b49` (#328) |
| Коміти | `23306abd` — перевірка хоста, ключ подання, генератор ключа · `a36e7d1a` — e2e на production-хості через локальний проксі, тест «поза хостом» · `a874a83c` — проксі: свіже з'єднання на запит, WebSocket закрито (рев'ю) |
| Змінено | `app/lib/analyticsHost.ts` (новий), `AnalyticsConsent.tsx`, `ProjectInquiryForm.tsx` (один аргумент), `app/lib/inquiry/{analytics,submitAttempt,submissionId}.ts`, `app/lib/proofAnalytics.ts`; тести: `tests/e2e/production-host.helpers.ts` (новий), 7 e2e-специфікацій, 5 unit-файлів |
| Не змінено | Консент (вибір, сховище, Consent Mode, банер), `app/layout.tsx`, Turnstile, `/api/leads`, D1 (схема й рядки), тексти, дизайн, еталони, бюджети, Sonar, залежності |

## Що було

- `AnalyticsConsent.tsx` вантажив `gtag/js?id=G-WYRXJV71WG` і викликав `config` на **будь-якому** хості, щойно дано згоду на аналітику. Так само події `page_view`, `contact_click`, `inquiry_contact_attempt`, `generate_lead`, `proof_interaction`. Аудит GA4 (26.09): 581 із 595 сесій — localhost, 127.0.0.1 і preview; 106 із 107 за 15–25.09 — локальні.
- `generate_lead` не мав ключа, тож подію GA4 неможливо зіставити з рядком D1. Запасний генератор ключа (без `randomUUID`) складав його з мітки часу й лічильника сторінки.

## Що зроблено

- **Один предикат хоста** — `app/lib/analyticsHost.ts`. `isProductionAnalyticsHost()` = точний збіг `location.hostname` з hostname `company.siteUrl` (`rubikonbuild.com`). `canMeasureAnalytics()` = хост **і** згода на аналітику.
- **Без цієї перевірки до GA4 не доходить нічого:**
  - `loadAnalytics` не вставляє тег і не викликає `js`/`config`;
  - маршрутний `page_view` і `contact_click` (`AnalyticsConsent.tsx`);
  - `inquiry_contact_attempt` і `generate_lead` (`inquiry/analytics.ts`, `submitAttempt.ts`);
  - `proof_interaction` (`proofAnalytics.ts`).
- **Без змін:** Consent Mode `default`/`update` і збереження вибору працюють на будь-якому хості, як і раніше.
- **`generate_lead` несе `lead_submission_id`** — той самий `submissionId`, що запит передає в `/api/leads`, а D1 зберігає як `leads.submission_id`. Перевантаження TypeScript не дає викликати `generate_lead` без ключа. PII, GA client id і числового `id` D1 у події немає.
- **Семантика `generate_lead` не змінена (так погоджено):** один раз на серверний id ліда в змонтованій формі. Повтор після втраченої відповіді, підтверджений як `isNew:false`, теж рахується, бо інакше збережений лід лишився б без події. Honeypot повертає `id:0`, тож події не дає.
- **`createSubmissionId`:** `randomUUID` → UUID v4 з `crypto.getRandomValues` (так буває на plain http) → стара мітка часу лише як останній резерв. Таких браузерів сайт не підтримує, а унікальний індекс D1 лишається останнім бар'єром.
- **e2e на production-хості.**
  - Тести, що рахують команди gtag і події, відкривають `https://rubikonbuild.com`; кожен запит туди Playwright бере з локальної збірки (`production-host.helpers.ts`, `route.fetch` поза браузером), тож DNS лишається закритим, а сервер бачить локальний запит.
  - Решта тестів лишається на 127.0.0.1. Новий тест доводить, що там зі згодою «Прийняти все» немає ні тегу, ні `js`/`config`, ні жодної події: сторінка, контакт, заявка, наступний документ.
- **`page_view`: один на маршрут.** Сайт не має клієнтських переходів між маршрутами, тож кожен перехід — новий документ з одним `config`. Перегляд від history-подій (`replaceState` у конфігураторі й брифі) додає вже сам GA4 Enhanced Measurement; це налаштування вимикає власник (нижче).

**Відхилення від специфікації (на погодження власника):**

1. §3: перевірки режиму збірки немає, лише хост. Preview — теж production-збірки, тож ця перевірка нічого б не додала, а e2e на dev-сервері втратили б перевірений шлях.
2. §5: без жодного безпечного генератора форма не відмовляє, а надсилає з ключем-міткою часу (практично недосяжно).
3. §5/§8.7: `isNew:false` після втраченої відповіді рахується один раз (див. вище).
4. §8.2: preview-хости (`*.workers.dev`, `www`, схожий домен) перевірені unit-тестами; e2e «поза хостом» — на 127.0.0.1.

**Відхилені під час роботи:**
- обхід «пропустити ECONNRESET у проксі»: ховав симптом;
- корінна причина — спільний keep-alive пул Playwright, де Node закриває сокет після 6 с простою (так само, як у `server.helpers.ts`); виправлено `Connection: close` на кожному проксованому запиті.

## Перевірка

| Перевірка | Команда / прогін | Результат |
|---|---|---|
| Lint, typecheck | `eslint .`, `tsc --noEmit` | 0 помилок |
| Unit | `vitest run` | 1909 passed, 1 skipped (нові: `analytics-host.test.ts`; хост у `inquiry-analytics`, `proof-analytics`, `submitAttempt`; UUID v4 з `getRandomValues`) |
| Build | `vinext build` | OK |
| PR Gate: critical | `playwright test tests/e2e/pr-critical.spec.ts --project=desktop-chromium` | 58 passed |
| PR Gate: inquiry | `--project=desktop-chromium tests/e2e/form.spec.ts` | 62 passed |
| PR Gate: hero (4 кроки) | як у `pr-gate.yml` | 68 · 66 (+6 skipped, `theme` ×3 без повторів) · 14 · 4 passed |
| Змінені специфікації, усі проєкти | 7 файлів × desktop/mobile-chromium (+ firefox/webkit — їм відповідає лише `responsive-a11y-phase1`) | 170 passed; 1 падіння проксі (ECONNRESET) → виправлено в `a874a83c` |
| Стабільність | 6 аналітичних специфікацій × 2 проєкти, `--repeat-each=3 --retries=0` (до `a874a83c`) | 327 passed |
| Стабільність після `a874a83c` | 7 змінених специфікацій × 2 проєкти, `--repeat-each=3 --retries=0` | 511 passed, 2 failed — обидва в **незмінених** тестах форми на 127.0.0.1 (див. «Успадковані червоні перевірки»); жодного падіння в змінених тестах |
| Незалежне рев'ю | субагент `reviewer`, свіжий контекст | approve with changes → 2 should-fix (keep-alive пул, WebSocket) виправлено в `a874a83c` → **approve** |
| Мутація | `isProductionAnalyticsHost` → завжди `true`, перезбірка | новий тест «off the production host» падає («HOME: only consent commands …»); файл відновлено |
| Класифікатор | `node scripts/ci/classify-changes.mjs origin/main HEAD` | inquiry, visual (wide), hero_playback |

Візуальний набір локально не запускався: diff не змінює вигляду, а авторитет еталонів — лише CI (DEC-18).

## Еталони

Не змінювались.

## Успадковані червоні перевірки

- Під `--repeat-each=3` на двох проєктах `form.spec.ts` періодично падає в тестах, яких цей PR не торкається: `toBeFocused` поля «Телефон» у помічнику `sendAnother`, «Запит надіслано» не з'являється після кліку. Ті тести йдуть на 127.0.0.1 зі згодою «лише необхідні», а там поведінка гілки й main однакова.
- Той самий набір на `origin/main` `e3a41b49` теж падав (`form.spec.ts:1063`, `toContainText`). Той самий клас (фокус «Телефон» після «Виправити номер…») — у Nightly 19.11 (`form.spec.ts:1153`).
- Це окрема задача 1A (корінна причина флейків форми), не цей PR.

## Ризики

- **Помилка в умові хоста вимкнула б аналітику на production.** Захист — точний збіг з `company.siteUrl`, unit-таблиця хостів і контракт на `https://rubikonbuild.com` у e2e. Після deploy потрібна жива перевірка (нижче).
- Якщо колись з'явиться другий production-хост, GA4 на ньому мовчатиме, доки не оновлено `company.siteUrl` і цей предикат. Це навмисно.
- Довгі e2e тепер частіше йдуть через проксі: на кожен запит — свіже з'єднання (трохи повільніше, зате без keep-alive флейку).

## Що перевірити власнику

1. Код і відхилення 1–4 вище.
2. **Налаштування GA4: робить Дмитро, не агент.**
   1. **До** першої перевірочної заявки: Admin → Custom definitions → event-scoped dimension `lead_submission_id`. Він не діє заднім числом.
   2. Одразу після deploy: Data streams → Rubikon Build → Enhanced measurement → Page views → advanced → вимкнути «Page changes based on browser history events». Самі Page views лишаються увімкненими.
   3. Перевірка: Realtime/DebugView — лише hostname `rubikonbuild.com`, один `page_view` на документ. Одна позначена QA-заявка з iPhone: `generate_lead` з `lead_submission_id` = `submission_id` нового рядка D1. Цей ключ записати як тестовий.
   4. Після перевірки: позначити `generate_lead` як Key event і записати `ANALYTICS_RELIABLE_FROM` (UTC час deploy + перевірки, commit). Дані до цієї мітки в бізнес-звітах не використовувати.

## Відкат

- Revert трьох комітів (deploy з OK). Одночасно повернути налаштування history-переглядів у GA4, щоб `page_view` не зник і не задвоївся.
- Якщо заважає лише `lead_submission_id`, приберіть параметр, а перевірку хоста лишіть.
- D1 відкочувати не треба: схема й дані не змінювались.

## Пропоновані оновлення control (лише після OK)

- `DECISIONS.md`, DEC-06: «IMPLEMENTED у коді (PR …, `fix/analytics-repair`); VERIFIED — після deploy, налаштувань GA4 і QA-заявки; `ANALYTICS_RELIABLE_FROM` = …».
- `CURRENT_CHECKPOINT.md`, «Active tasks»: рядок «Analytics repair (DEC-06)» → «код у PR; чекає merge/deploy і налаштувань GA4 власником».
