# Handoff · Проксі production-хоста: запит, що летів після кінця тесту, більше не валить тест (1A)

| | |
|---|---|
| Дата | 2026-11-22 |
| Виконавець | Claude Code |
| Підстава | Main Regression [45005067648](https://github.com/leusd100/rubikon-build/actions/runs/45005067648) на `65053eeb` (#330) червоний: `consent.spec.ts:71` «flaky» (CI валить пройдене з повтору — `failOnFlakyTests`); програма робіт, крок 1A |
| PR | Draft. **Merge — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `test/e2e-proxy-teardown` від `main` `65053eeb` |
| Змінено | `tests/e2e/production-host.helpers.ts` |
| Не змінено | Код сайту, інші тести, `playwright.config.ts`, workflows |

## Що було

У CI тест `consent.spec.ts:71` пройшов, але отримав помилку обробника маршруту з проксі (#329):
`route.fulfill: Fetch response has been disposed` → `browserContext.close: Test ended.`.
Запит до локальної збірки (відео, пізній чанк) ще був у дорозі, коли тест скінчився. Закриття контексту прибрало відповідь, а помилка дісталась тесту.

## Що зроблено

Обробник маршруту пропускає **лише** помилки закриття контексту (`Test ended`, `has been disposed`, `has been closed`, `Target page, context or browser has been closed`). Скидання з'єднання та будь-яка інша помилка, як і раніше, валять тест; `Connection: close` з #329 лишається.

Відхилено: повернути глухий `.catch(() => {})` на `fulfill`, як було до рев'ю #329. Він ховав би й справжні збої.

## Перевірка

| Перевірка | Команда / прогін | Результат |
|---|---|---|
| Відтворення механізму | тимчасовий тест: 20 `fetch` на відео з «production»-сторінки й одразу кінець тесту, `--repeat-each=10` | старий помічник — `route.fetch: Test ended.` 4 рази; новий — 0 |
| Прямий повтор `consent.spec.ts` | `--repeat-each=20`, desktop-chromium | 180 passed і зі старим, і з новим: локально гонка не проявляється, лише в таймінгу CI |
| Усі специфікації з проксі + critical | analytics-contract, analytics-consent, consent, direction-texts, first-contact, ux-conversion-phase2, form, pr-critical × desktop/mobile-chromium | 289 passed, 14 skipped |
| Lint, typecheck, unit | Fast Gate | 0 помилок; 1913 passed, 1 skipped |

## Еталони

Не змінювались.

## Успадковані червоні перевірки

- **`home-proof-contour.spec.ts:2173`** — другий «flaky» того самого прогону. Під час проходу шва X-Ray зсувається `.hv2-frame-text`, текст туру «Приклад каркаса» в тій самій секції HOME. Це шостий випадок (MR 04594b17, a4c6420b, 38292108, 29924943, 65053eeb; Nightly 15.11), і #328 його не прибрав.
  - Локально **не відтворено**: затримка чанка `HomeFrameTour` до 3 с і затримка всіх шрифтів до 5 с зсуву не дають (метричні fallback працюють).
  - Наступний крок — відтворення в Linux-контейнері, як у CI (Docker amd64), з трасою з артефакту CI. Окрема задача.
- **`form.spec.ts` під локальним стрес-навантаженням** (`--repeat-each` 4–8, два проєкти) падає ≈0,5–1 % прогонів: `check()` чекбокса згоди «did not change its state», фокус «Телефон», «Дякуємо» не з'явилось. Відтворено й на `origin/main`. Що спростовано:
  1. плавна прокрутка (з `reducedMotion: reduce` — 3 падіння на 528);
  2. перенесення форми `InquiryFormHost` (лише `/angary`);
  3. зсув форми під час заповнення (позиція чекбокса стабільна).

  Сторінка прокручується під кліком, джерело не знайдено. У CI не проявлялось з 19.11. Окрема задача.

## Ризики

Регулярний вираз помилок закриття залежить від тексту повідомлень Playwright. Якщо після оновлення Playwright текст зміниться, тест знову впаде гучно, а не мовчки, і це видно.

## Відкат

Revert PR.
