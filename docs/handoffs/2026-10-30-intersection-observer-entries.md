# Handoff · Решта колбеків IntersectionObserver читають пакет записів, а не перший запис

| | |
|---|---|
| Дата | 2026-10-30 |
| Виконавець | Claude Code |
| Підстава | Ризик із [`2026-10-30-home-contour-open-flake.md`](2026-10-30-home-contour-open-flake.md): шаблон `([entry])` лишився в дев'яти місцях; завдання власника |
| PR | PR_LINK, Draft. **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `fix/intersection-observer-entries` від `main` `e6458d01` |
| Коміти | `17471458` — виправлення і тест · handoff |
| Змінено | Дев'ять колбеків IntersectionObserver (таблиця нижче); новий `tests/e2e/observer-batches.spec.ts` |
| Не змінено | Наявні тести, CSS, дизайн, тексти, CSP, еталони, бюджети, залежності, `playwright.config.ts`; ResizeObserver у `HangarPreview.tsx:43` і `useDrawingTour.ts:64`. Спільного помічника немає: правка в кожному місці — один-два рядки, як у #276 |

## Що було

`new IntersectionObserver(([entry]) => …)` читає перший запис пакета. Один виклик може нести `[не видно, видно]`; колбек виходить, а нового запису
спостерігач не надішле, поки ціль не перетне поріг знову. Механізм і запис із Chrome — у handoff #276.

На `main` у браузері: новий spec падає **22 із 22** (desktop + mobile), тобто кожен із дев'яти блоків справді лишається в стані до появи, якщо пакет прийшов.

## Що зроблено

Правило #276: разова поява — `entries.some(...)`, оборотний стан — `entries.at(-1)!`. Пороги й решта умов ті самі.

| Місце | Що вирішує спостерігач | Правило |
|---|---|---|
| `about/CapabilityFigure.tsx` | разовий обхід схеми | `some` (видно і ≥ 0,5) |
| `configurator/useFirstViewBuildUp.ts` | разова побудова креслення | `some` (≥ 0,5) |
| `home-v2/ScopeCells.tsx` | разова поява комірок | `some` (видно) |
| `process/ChangeSheets.tsx` | разовий обхід аркушів | `some` (видно і ≥ 0,45) |
| `process/CostFactorsFigure.tsx` | разовий обхід факторів | `some` (видно і ≥ 0,5) |
| `useDrawingTour.ts` | тур стартує, стає на паузу й відновлюється | `at(-1)` |
| `hooks/useDeferredMedia.ts` | `isVisible`: відео й слайди на паузі поза вікном | `at(-1)` |
| `zernoskhovyshcha/GrainComplexBuilder.tsx` | `inview` + разова поява на 0,35 | `at(-1)` для `inview`, `some` для появи |
| `directions/FormatsScope.tsx` | `inView` + разовий обхід форматів на 0,5 | `at(-1)` для `inView`, `some` для обходу |

`FormatsScope` у завданні не був названий як подвійний, але читання коду показало те саме, що в `GrainComplexBuilder`: `data-live` оборотний, обхід разовий.
`useDrawingTour` — `at(-1)`, бо запуск оборотний: якщо блок пролетів повз 0,5 і вже нижче порогу, тур просто стартує при наступному вході.

### Тест

`tests/e2e/observer-batches.spec.ts`: техніка #276 у трохи ширшому вигляді. Справжній спостерігач сторінки притримує записи цілі, тест скролить і дає команду, записи
йдуть одним викликом. Пакет справжній, гонка ні. Дев'ять рядків таблиці `[не видно, видно]` і два тести `[не видно, видно, не видно]` для місць із двома правилами
(`GrainComplexBuilder`, `FormatsScope`): поява відбулась, стан «у вікні» — ні.

Рядки `ChangeSheets`, `FormatsScope` і `useDeferredMedia` ідуть при 1440×900 в обох проєктах: на вузькому екрані цих турів немає, а герой HOME на телефоні не спостерігається (записів цілі немає). `DirectionsHeroImageSequence` окремого рядка не має: той самий хук, зелений наявний `directions-hero-sequence`.

Для `useDeferredMedia` перша версія рядка була хибно зеленою на `main`: `isVisible` починається з `true`, тож кліп приєднується ще під час затримки. Тепер рядок перевіряє, що відео грає. Другий хибний зелений: у частині прогонів якір спрацьовує після першого запису, і пакет починався з «видно»; тому утримання починається з першого «не видно».

## Перевірка

Стенд: Mac, встановлений Chrome (`channel: 'chrome'`), production-збірка, порт 4461, 2 воркери, `--retries=0`. Сервер перевірено за `cwd` процесу перед кожним прогоном. Машину паралельно вантажила інша сесія (load average до 82).

| Перевірка | `main` `e6458d01` | Гілка |
|---|---|---|
| `observer-batches`, desktop + mobile, ×1 | **0/22**: падає твердження появи, а не підготовка | 22/22 |
| `observer-batches`, ×3 | — | 66/66; рядок `CostFactorsFigure` потім переведено з 1440 px на вікно проєкту: ×3 6/6 на гілці, на `main` у цьому вікні не ганявся |
| Рядок `useDeferredMedia`, ×5 | 0/10 (`paused`) | у складі ×3 |
| Мутація: появу Grain і обхід Formats через `at(-1)`, `inview` через `some` (дві збірки, по дві правки) | — | 2 тести `[не видно, видно, не видно]` падають 4/4, кожен на своїй перевірці |
| Наявні spec (18 файлів, нижче), desktop + mobile | — | 562 passed, 117 skipped, **1 failed** (успадкований, нижче) |
| `home-proof-contour` + `links-buttons-focus`, `-g 'scope\|Покрівля\|cell\|roof'` | — | 94 passed, 14 skipped |
| `eslint` · `tsc` · `vitest` | — | 0 помилок · чисто · 1652/1652 |

18 файлів: `grain-page`, `grain-builder-phone`, `configurator-sheet`, `pro-nas-capability`, `cost-factors`, `yak-formats-scope`, `yak-format-switch`, `yak-pro-nas-touch`, `shorter-pro-nas-yak`, `direction-node`, `drawing-tour-framing`, `hero-video`, `directions-hero-sequence`, `direction-static-hero`, `consent-pending-hero`, `angary-editorial`, `angary-interactive`, `pr-critical`.

`useDeferredMedia`: `hero-video`, `directions-hero-sequence`, `direction-static-hero`, `consent-pending-hero` — зелені.

Локально не запускались: повний `home-proof-contour` (лише вибірка вище), візуальні набори, Firefox, WebKit.

## Еталони

Не змінювались.

## Успадковані червоні перевірки

`pro-nas-capability.spec.ts:69` `pointing ends the walk…`, desktop: `hover` не підсвітив рядок, той самий рядок і твердження на обох збірках.

| Прогін ×10 | `main` | Гілка |
|---|---|---|
| Перший | 9/10 (load спадав з ~18 до ~9) | 7/10 (load ~50) |
| Другий | 10/10 (load ~8) | 10/10 (load ~8) |

У першому прогоні навантаження різне, тож 9 проти 7 не є порівнянням. Причину не встановлено. Припущення: `hover` після `reload` встигає раніше за гідрацію; не перевірено.

## Ризики

- **Частота для реальних відвідувачів невідома.** Тест відтворює пакет, а не гонку. Стенд гонки з #276 тут не повторювали: у жодному з дев'яти місць пакет не зафіксовано природно.
- **Firefox і Safari не перевірялись.** Перевірено лише Chrome.
- `at(-1)` залежить від порядку записів (спец додає їх у чергу за часом), як і в #276.
- Новий spec не входить до зон PR Gate за назвою: перший запуск на Linux — Main Regression після merge. Покладається на реальний час відтворення відео й турів; локально в CI-контейнері не ганявся.
- `useDeferredMedia` на `main` із пакетом ставить відео на паузу, але кліп уже приєднано; вікно цієї гонки потребує гідрації, коли герой поза вікном (перехід за якорем). Це читання коду плюс тест, не спостереження в полі.

## Що перевірити власнику

1. `FormatsScope` отримав те саме подвійне правило, що й `GrainComplexBuilder`, хоча в завданні це не було сказано.
2. Чи потрібен окремий розбір `pro-nas-capability.spec.ts:69`.

## Відкат

`git revert` merge-коміту. Міграцій і змін даних немає.

## Пропоновані оновлення control (лише після OK)

- CHECKPOINT: шаблон `([entry])` у колбеках IntersectionObserver усунуто в усьому `app/`; регресія — `tests/e2e/observer-batches.spec.ts`.
