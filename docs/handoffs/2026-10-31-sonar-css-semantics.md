# Handoff · Sonar · CSS !important і семантична розмітка

| | |
|---|---|
| Дата | 2026-10-31 |
| Виконавець | Claude Code |
| Підстава | Власник: «поправимо всі Issues SonarQube» (302 відкриті, 0 багів, 0 вразливостей, Quality Gate зелений) |
| Гілка / base | `refactor/sonar-css-semantics` від `main` `bc0d34ed` |
| Споріднені | Частина з п'яти незалежних PR, без stacked |

## Що зроблено

Закрито 35 із 52 Issues: S9423 ×30, S4666 ×3, S6819 ×2. Решта 17 залишаються свідомо, їх описано в PR `ci/sonar-scoped-exclusions`.

- `.inquiry-consent`, `.form-trap`, `.direction-hero-image`, `.rm-*`: підвищено специфічність.
- `.gc-mod`: інлайн-стиль перейменовано на `--gc-turn`, правило `assembled` тепер перемагає без `!important`.
- `.hv2-proof-*`: правила переставлено, додано `:not(.hv2-proof-core)`.
- `<aside role="region">` → `<section aria-labelledby>` у банері cookie. `<p role="status">` → `<output>` у `GrainResultBand`.
- Залишені `!important` позначено блоками `sonar-important-begin` із причиною в самому CSS.

Тест `design-tokens.test.ts:139` змінено: твердження шукало `text-transform: none !important`, а тепер шукає це значення на підвищеному селекторі `.inquiry-form .inquiry-consent > span`. Він не слабший, але це зміна тесту, тож потребує очей власника.

## Що виявив Main Regression

Перша версія замінювала на `<output>` і підказку поля розміру. `angary-configurator-data.spec.ts:284` упав: `aria-describedby` поля більше не читав її текст. Локальний вибір тестів цієї специфікації не містив. Підказка повернута на `<p role="status">`, тест не змінювався. Висновок для майбутнього: `<output>` не годиться там, де елемент є ціллю `aria-describedby`.

## Перевірка

| Перевірка | Результат |
|---|---|
| `tsc`, `eslint` | чисто |
| Порівняння обчислених стилів, `main` проти гілки: 10 маршрутів × 10 комбінацій (4 ширини × 2 теми, 2 reduced motion) | 15 544 рядки, 301 719 значень |
| Шум того ж порівняння `main` проти `main` | 402 розбіжності: зсув `.gc-mod` на 2 px і `opacity` посеред переходу при наведенні |
| Реальні розбіжності | `text-wrap: pretty`, загублений `<output>`, повернуто. На фінальному коді 342 розбіжності: шум `.gc-mod` і `opacity`, плюс 90 рядків `.planner-editing-note`, вставленої на `/zernoskhovyshcha` поза `.grain-planner-root`, де ця нотатка ніколи не з'являється й правило `display: block` не діє |
| Скриншот героя `/metalokonstruktsii`, єдина різниця PNG | Не відтворилася: 6 із 6 збігаються з хешем `main` |
| Main visual (2 шарди) на зведеному коді, Linux-еталони | зелені |
| e2e локально, 17 специфікацій, обидва проєкти | 667 passed, 8 failed, 108 skipped |

Вісім падінь розібрано. На незміненому `main` локально відтворюються `configurator-sheet:223`, `:914`, `grain-page:158`, `home-proof-contour:2274` і, за звітом іншої гілки, `:2360`, `:2747`. `home-proof-contour:1374` (mobile) і `inquiry-error-focus:251` не відтворилися: перший дає 12 із 12 і на гілці, і на `main`, другий проходить наодинці.

Стани `.inquiry-sent` і `.planner-editing-note` у порівнянні стилів додані вручну, а не пройдені реальним сценарієм. Реальний скрінрідер не перевірявся.
