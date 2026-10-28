# Handoff · Стиль без перерахунку майже всієї сторінки: мідь аркушів напрямів і стан шапки (MT-01, MT-04)

| | |
|---|---|
| Дата | 2026-10-27 (заміри повторено 2026-10-28 на свіжій збірці) |
| Виконавець | Claude Code |
| Підстава | Engineering Excellence brief 27.10, знахідки MT-01, MT-04 / RJ-02 (зроблено); MT-02 / RJ-03, MT-05, RJ-12 (не зроблено — причини нижче) |
| PR | [#262](https://github.com/leusd100/rubikon-build/pull/262), Draft. **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `perf/style-recalc-scope` від `main` `9079f47` |
| Коміти | **`469c819`** — код і тести · цей коміт — handoff |
| Змінено | `app/components/directions/CatalogDrawing.tsx` і `DirectionSectionDrawing.tsx`: 12 мідних фігур (`path` / `circle` у `g.dsd-accent`) п’яти аркушів мають клас `dsd-mark`. `catalog-drawing.css`: 8 правил «наведення» закінчуються `.dsd-accent .dsd-mark` замість `.dsd-accent path` / `circle`, `:nth-child` той самий. `app/globals.css:223`: стан «прокручено» ставить `--phone-hero-header-alpha: 100%` на `.site-header`, не на `body`. Тести: новий `tests/unit/catalog-drawing-marks.test.ts` (6), по одному новому e2e у `home-directions-sheets.spec.ts` і `header-first-screen.spec.ts` |
| Не змінено | **MT-02 / RJ-03 — рішення власника:** `AnalyticsConsent.tsx` і далі пише `--cookie-banner-clearance` на `<html>`; кожен такий запис перераховує 1 056 елементів HOME (тут теж 1 056, 40–61 мс при ×4 за перевіркою). Запропонована аудитом зміна небезпечна (див. нижче); кандидат на окремий PR — варіант C перевірки (правило в constructed stylesheet на селекторах споживачів, 4,1 мс), який має пройти `angary-interactive.spec.ts:695` і зберегти `scroll-padding` 70 px на /angary. Також без змін: інші 5 правил «наведення» (вже закінчувались класом), правила появи аркушів `catalog-drawing.css:71–76` (MT-05), `drawing-sheet.css:97`, `home-v2.css:1434`, `globals.css:1262` (≥ 1100 px), `ProcessMotion.tsx` (RJ-12). Вигляд і рух: жодної нової анімації, затримки чи кольору. Еталони, бюджети Lighthouse, CSP, залежності (0 нових) |

## Що було

**MT-01 · аркуші напрямів.** Chrome тримає для всіх `:has()` сторінки один спільний набір інвалідації. 8 з 13 правил «наведення» в `catalog-drawing.css` (рядки 83, 85–88, 90, 91, 95 на `main`) стоять за `:has()` картки HOME і закінчувались голим тегом — `.dsd-accent path` або `.dsd-accent circle`. Через це теги `path` і `circle` потрапили в той набір, і **кожна вставка вузла в DOM** (рядки RSC під час стрімінгу, гідрація, банер) перераховувала SVG-фігури сторінки: один `span`, вставлений у `<main>` HOME, — **455 елементів**. Мідні групи — у трьох тілах `DirectionSectionDrawing.tsx` (Металоконструкції, Бетонні, Покрівельні: на останню цілить правило `path:nth-child(2)`) і у двох з `CatalogDrawing.tsx` (Ангари, Зерносховища).

**MT-04 / RJ-02 · шапка.** `:root[data-hero-header="scrolled"] body { --phone-hero-header-alpha: 100% }` ставив успадковувану змінну на `body`, хоча читає її лише фон `.site-header` (`globals.css:210`). Тому **кожен перетин 32 px** (униз і вгору, і після зміни маршруту) перераховував **1 054 з 1 567 елементів HOME** на телефоні.

## Що зроблено

- **Клас замість тегу.** Мідні фігури аркушів — `path` і `circle` усередині `g.dsd-accent` — мають клас `dsd-mark`: Ангари й Зерносховища (`CatalogDrawing.tsx`), Металоконструкції — 4 болти, Бетонні роботи — 3 деталі, Покрівельні — 3 (`DirectionSectionDrawing.tsx`; ці самі тіла малюють і сторінки напрямів, там клас нічого не змінює — на нього немає жодного правила). 8 правил закінчуються `.dsd-accent .dsd-mark` з тим самим `:nth-child`: у кожній мідній групі всі діти — фігури з `dsd-mark`, тож номери ті самі. Ангари класу для свого правила не потребують (воно закінчується `.dsd-dashed`); клас там для однаковості, і тест вимагає його на кожній мідній фігурі.
- **Стан шапки — на шапці.** `globals.css:223` → `:root[data-hero-header="scrolled"] .site-header`, на тому самому місці, перед правилом відкритого меню. Специфічність однакова (0,3,0), меню далі в коді, тож на ≤ 1099 px відкрите меню й далі виграє (97 %); на ≥ 1100 px `globals.css:1262` лишився і, як і раніше, дає «прокручено» 100 % навіть з відкритим меню. JS (`HeroHeaderState`) і атрибут на `<html>` — без змін.
- **Запобіжники.** `catalog-drawing-marks.test.ts`: кожна мідна фігура п’яти аркушів має `dsd-mark`, і жодне правило за `:has()` у `catalog-drawing.css` не закінчується голим тегом (на коді `main` падають усі 6 тестів, друга перевірка називає саме ті 8 правил). e2e `home-directions-sheets`: фокус на картці дає кожній мідній фігурі свого аркуша свою анімацію й затримку (болти 0 / 0,15 / 0,3 / 0,45 с, третій анкер 0,65 с, ринва 1,1 с). e2e `header-first-screen`: на телефоні «прокручено» — 100 % на шапці, `body` лишається 92 %, відкрите меню — 97 % (на `main` падає: `body` 100 %).

### Що не зроблено і чому

- **MT-02 / RJ-03 · змінна банера на `<html>` — рішення власника.** Незалежна перевірка підтвердила механізм: кожен запис `--cookie-banner-clearance` на `<html>` перераховує 1 056 елементів HOME (/angary 990, /yak 952, /pro-nas 692), 40–61 мс при ×4. Але рекомендована зміна небезпечна: `AttachedBriefCta` рендериться лише після прикріплення брифу, тож змінна, записана на споживачів під час монтування банера, не дістається CTA «До заявки» на /angary — він (z-index 90) опиняється під банером (z-index 200), регресія F158, яку ловить `angary-interactive.spec.ts:695`; а inline `scroll-padding-bottom` на `<html>` перекриває `angary-editorial.css:144` (70 px → 146 px, контракт WCAG 2.4.11). Кандидат на окремий PR — варіант C перевірки: правило в constructed stylesheet на селекторах споживачів, 4,1 мс; він має пройти `angary-interactive.spec.ts:695` (і `consent-pending-hero.spec.ts:107`) і зберегти `scroll-padding` 70 px на /angary. У цій гілці `AnalyticsConsent.tsx`, CSS банера і його тести не змінені.
- **MT-05 · правила появи аркушів — не малий крок.** Лабораторно (CSSOM на завантаженій HOME, n = 5 × 4 перемикання): лише `:75` з `.dsd-mark` — 438 → 438 елементів на перемикання `main[data-motion-ready]`, тобто нічого, бо `:72` і `:74` теж закінчуються `:is(path, circle, text)`. Виграш (438 → 32 на коді `main`, 43 на гілці) дає тільки переписування `:72`, `:74` і `:75` разом із новим класом на 64 фігурах і літерах без `pathLength` (осі, штрихування, обладнання, підписи). Це вже нова розмітка всіх п’яти тіл і ризик для появи, не продовження MT-01. `home-v2.css:1434` (`:is(*, *::before, *::after)`) — не чіпав.
- **`.sheet-stamp:has(> :nth-child(3))`** (`drawing-sheet.css:97`) — лишився: звужений аргумент дав ті самі 455 елементів на вставку (і в перевірці, і тут).
- **RJ-12 · ProcessMotion** — знахідку спростовано перевіркою: дороге читання `innerHeight` платить за чужий брудний стиль (інвалідацію `:has()` від монтування банера); винесене за цикл читання платить той самий примусовий перерахунок (466 елементів), лише в іншому рядку.

## До / після

Локальні production build: `main` `9079f47` (127.0.0.1:4400) і гілка (робоче дерево = коміт `469c819`, 127.0.0.1:4411), Chrome 156 (headless, `channel: 'chrome'`), HOME, перший візит (банер згоди відкритий), телефон 412 × 660, DPR 2,625, CPU ×4 (CDP), аналітика й Turnstile відрізані (0 зовнішніх запитів). n = 5 пар завантажень на кожен режим трейсу, порядок у парі чергується. Кількість перерахованих елементів — `UpdateLayoutTree.elementCount` з трейсу, детермінована; причини — `devtools.timeline.invalidationTracking`. Хост спільний з іншим агентом, load average 4–9 під час трейсів.

| Подія | `main` | гілка |
|---|---|---|
| Завантаження HOME: перераховано елементів, сума (трейс з invalidationTracking) | 5 340 (5 160–5 806) | **3 842** (3 569–4 067); у парі −1 497 (−2 237…−1 166), менше 5/5 |
| Те саме без invalidationTracking | 5 412 (5 281–5 797) | **4 053** (3 858–4 276); у парі −1 491 (−1 903…−1 104), менше 5/5 |
| Події «Invalidation set matched tagName» на `path` / `circle` за завантаження | 2 700 (2 567–2 851) | **834** (550–852) |
| Найбільші перерахунки завантаження, елементів: 1-й / 2-й / 3-й (медіани) | 1 056 / 645 / 640 | 1 056 / **532** / **468** |
| Вставка `span` у `<main>` (мікробенчмарк, 10 × 5 × 2 режими) | 455 | **33** |
| Перетин 32 px справжнім скролом, униз і вгору (3 + 3 × 5 × 2 режими) | 1 054 | **36** |
| Перемикання `html[data-hero-header]` (мікробенчмарк, 8 × 5 × 2 режими) | 1 054 | **36** |
| Монтування банера: перший перерахунок після вставки `ASIDE.cookie-banner` (окремий прогін, n = 5 пар) | 466 (466–476) | 463 (44–468) — у 3 з 5 той самий злитий перерахунок, у 2 з 5 окремий на 44 елементи; **по суті без змін** |
| Перший запис `--cookie-banner-clearance` на `<html>` | 1 056 | 1 056 — **без змін** (MT-02 не робився) |
| `main[data-motion-ready]` (MT-05, не робився) | 438 | 438 |

Найбільший перерахунок завантаження (1 056) — це якраз запис змінної банера на `<html>` (MT-02), тому на гілці він той самий. Монтування самого банера йде через `html:has(> body > .cookie-banner)` / `body:has(> .cookie-banner)` (`globals.css:1075–1076`), а не через теги, тож MT-01 його не зменшує.

**Мс, індикативно** (прогін без invalidationTracking, n = 5 на збірку):

| | `main` | гілка |
|---|---|---|
| Перемикання `html[data-hero-header]`, медіана прогону | 19,3 (18,5–20,5) | 2,0 (1,9–2,1) |
| Перетин 32 px униз, перерахунок за подію | 20,5 (18,5–42,5) | 1,8 (1,2–3,2) |
| Вставка `span` у `<main>`, медіана прогону | 10,5 (10,2–11,0) | 2,1 (2,0–2,2) |
| Сума перерахунків стилю за завантаження | 229,1 (182,1–258,2) | 214,3 (167,8–237,6); у парі −19 (−61,3…+23,4), менше 3/5 |

У трьох мікроподіях діапазони не перетинаються. Для суми за завантаження **покращення статистично не встановлено**: елементів менше в 5/5 парах, але мілісекунди — у шумі (менше лише в 3/5, діапазони перекриваються); з invalidationTracking різниця більша (−348 мс, 5/5), але там вартість трейсу росте з кількістю інвалідацій, тож це не час користувача. MT-04 не впливає на жодну оцінювану метрику (LCP, TBT, CLS, INP) — лише на роботу головного потоку під час скролу (на телефоні скрол композитний, на десктопі Lenis веде колесо з головного потоку).

## Заміри часу

Lighthouse TBT і Style & Layout (mobile, серійно, без інших агентів на хості) — **див. наступний коміт**. Тут таймінги Lighthouse навмисно не знімались.

## Перевірка

| Що | Результат |
|---|---|
| Зібраний CSS, `main` ↔ гілка | змінилися рівно 9 правил: 8 у `CatalogDrawing.*.css` (`.dsd-accent path…` / `.dsd-accent circle…` → `.dsd-accent .dsd-mark…`) і 1 в `index.*.css` (`body` → `.site-header`); інші 19 CSS-файлів байт-ідентичні |
| `scripts/motion/motion-diff.mjs --base origin/main` | 8 відмінностей, усі в `catalog-drawing.css`: прибрано 8 декларацій руху й додано 8 з тими самими значеннями (анімація, тривалість, крива, затримка), змінився лише кінець селектора |
| HTML 9 сторінок, `main` ↔ гілка | після прибирання `dsd-mark` і хешів ресурсів — 0 відмінностей на 8 сторінках; на /napryamky React Flight розбив той самий RSC на один `<script>` менше (рядки перенумеровані) |
| Гідратований DOM, HOME, /napryamky, /metalokonstruktsii, /betonni-roboty, 1440 і 412 | розмітка `svg.cdw` однакова без `dsd-mark`, послідовність тегів `<main>` однакова; `.dsd-mark` — 24 на HOME, 12 на /napryamky, 4 і 3 на сторінках напрямів |
| Рух «наведення», `main` ↔ гілка, 1440, без reduced motion: HOME — наведення на аркуш, на картку, фокус з клавіатури (`:focus-visible`); /napryamky — наведення на рядок і фокус, по 5 напрямів | **0 з 27 станів** відрізняються (назва, затримка, тривалість, easing, fill, повтори кожної анімації кожного елемента кожного аркуша; у станах наведення 2–4 анімації) |
| Фон шапки, `main` ↔ гілка: 8 сторінок × 14 ширин (320…1440, з межами 600/601, 760/761, 959/960, 1099/1100, 1179/1180) × світла й темна × «вгорі» / «прокручено» × меню закрите / відкрите | **0 з 896 випадків** відрізняються (`background-color`, `backdrop-filter`, значення змінної, фони всіх нащадків шапки); на `main` у них 90 / 92 / 94 / 97 / 100 % |
| `vitest` | 99 файлів, **1 548 passed** |
| `catalog-drawing-marks.test.ts` на коді `main` | падає 6 з 6 (5 аркушів без класу; 8 правил із голим тегом) |
| `tsc`, `eslint` | чисто |
| E2E на збірці гілки, desktop + mobile chromium, 2 workers: `consent-pending-hero`, `direction-route-cards`, `header-current-section`, `header-first-screen`, `header-hierarchy`, `header-tablet-nav`, `home-directions-sheets`, `home-phone-directions`, `mobile-menu-panel`, `napryamky-key-plan`, `napryamky-row-sheets`, `page-hero-rhythm`, `pr-critical` | **242 passed**, 82 skipped (інший проєкт або ширина), 0 failed |
| Нові e2e на збірці `main` | шапки — падає: `body` 100 % замість 92 % (запобіжник саме від цього); аркушів — passed (фіксує, що рух той самий) |

## Еталони (DEC-18)

Прогноз на 42 цілі visual-chromium (33 з `visual.spec.ts`, логотипи шапки й підвалу, 3 кадри конфігуратора, 2 планувальника зерна), знято зі збірок `main` і гілки з однаковими налаштуваннями, порівняно компаратором Playwright з допуском специфікацій (threshold 0,25, maxDiffPixelRatio 0,02): **0 з 42 змінюються, усі 42 байт-ідентичні**. Інші еталони (ще 7 логотипів, 12 кадрів конфігуратора, 5 3D, 2 планувальника) аркушів напрямів не мають, а фон шапки однаковий у всіх 896 випадках вище. Еталони не оновлено; остаточно покаже changed-area visual regression на CI (Linux; `globals.css` вмикає широкий набір).

## Ризики

- **Нова мідна фігура без `dsd-mark`** не отримає свого руху при наведенні. Ловить `catalog-drawing-marks.test.ts`.
- **`:nth-child` рахує всіх сусідів.** Якщо в мідну групу колись додати не-фігуру, номери зсунуться — так само, як і на `main`.
- **Змінна шапки поза шапкою.** Хто колись читатиме `--phone-hero-header-alpha` поза `.site-header`, не побачить «прокручено». Таких місць немає (лише `globals.css:210`); коментар біля правила про це каже.
- **Інші рушії.** Інвалідація у WebKit і Gecko інша; селектори обирають ті самі елементи, тож вигляд і рух мають бути ті самі, але це перевірено лише в Chrome.

## Не перевірено

- Справжні Android і iPhone, Safari / WebKit і Firefox (на цьому Mac їх немає).
- Lighthouse TBT і Style & Layout — окремий серійний замір (див. наступний коміт).
- Linux-рендер еталонів (CI).
- Плавність колеса на десктопі (Lenis) на повільних ноутбуках.

## Сирі дані

Поза git, в архіві досліджень Engineering Excellence (`shasum -a 256 -c SHA256SUMS` → 0 помилок). Попередня спроба 27.10 мала збірку старішу за останні правки CSS, тож її числа відкладено як superseded і всі заміри повторено 28.10.

| Файл | SHA-256 |
|---|---|
| `data/banner-mount.jsonl` | `2dd06c7672a392f3fe8af51889fbf75b180f4ae68cd678c65949457f5eed9bd2` |
| `data/banner-mount.summary.txt` | `1c4d55ca44e6d75e57c2ce3a9111f05f5fb2b5e4c548e1e5cac19098e7f4df40` |
| `data/built-css-diff.txt` | `5516b8693f4dc341f0576152a235c6aa9f1f5f126c9d8dbaaf2c5303618bd7f1` |
| `data/dom-equiv.txt` | `72b021ae35faef6bec9163347150e65e35a43615f2d87e3cf701431038435f56` |
| `data/header-equiv.json` | `07fce9f85391e25f5883f7469cc1833809f2967b49ea10972c68cd7f5cf696e8` |
| `data/home-mobile-x4.jsonl` | `e43f5c4bb756e35cfbfd5f76bf48cfbcb5d8dfca40eed1ef14df7c255c0e7f36` |
| `data/home-mobile-x4.paired.txt` | `a8cacd6ad3c8669f2bb78fb972cd2f3eda26480491b8e6fd714d53df1f2be068` |
| `data/home-mobile-x4.summary.txt` | `c7283385a8080e8026f4f955c6c72990ad8b95d7bbe4614259f8f144fbd4f46c` |
| `data/hover-equiv.json` | `8a53a68f2a4a32329d87742d4d91d06310674bd860ec80ffafee8477e354db67` |
| `data/html-diff.txt` | `4dfc4b3ec026d6a0142ca3df7f05750f93a991e43928b9c46df8199e7128ae8a` |
| `data/motion-diff.txt` | `d8eec2f24315fcf2c4c64a8ed6a066877dffa638330b2a2c31a8b2584f28033a` |
| `dec18/_result.tsv` | `955bc18c35ba69e35e2664a026bf2ee2743e5b9c7122501ad36692c7ab7c0a66` |
| `logs/banner-mount.log` | `d10704bd468dbb9c454894686557c9f9cccee36ebabec7587b488eb60eca3634` |
| `logs/build.txt` | `88a3d5e4eec8f08308ffb4adadadac569a491e6465e07ce508d5585d5a241851` |
| `logs/dec18.log` | `cb173a8f8758899ab3f85c5ad04f6b8e50c9903013f747afd6273ec3c5e224c0` |
| `logs/e2e-branch.txt` | `9d237e2a0b019fbe96e91fb0a5ab6e89825c74ae459558b8cce016531aa5b21f` |
| `logs/e2e-new-tests-on-main.txt` | `5450d6ece5ce7baeffad3d78603cedeab9311eadf1aaa0c46bbcadff5665c89e` |
| `logs/eslint.txt` | `055111198d51000bc8145129dd890ada45c8eb51570b4cc412b8cb23e199f2b3` |
| `logs/header-equiv.log` | `d3ed52be6dcd45463213bc354eda6e5970c6fdb03656149c98fb023264a9d13b` |
| `logs/home-mobile-x4.log` | `e77576d9d63c7db797d6aaf613b5a2a1baaee4d49603b640eaf1cd04d29dafca` |
| `logs/hover-equiv.log` | `91112972e012a887c37ed3ebfbbaaa464908c735f5cc92fac132247fbfe189e1` |
| `logs/pr-262-body.md` | `38211fe072c4c3964a8a92fa26274c62be0c0e8c2e56b7236d1a5311fd8bfddb` |
| `logs/tsc.txt` | `99bb1a8bce0d56e17aefe9d7efa305ca6016804f84819cfb2127e9cbf9567836` |
| `logs/unit-test-on-main-code.txt` | `d4a9786a9a1cc2299bc56da96369f9191275fee44b984e8b3a22d88d030b2194` |
| `logs/vitest.txt` | `fea23b6f7e943e0a6281ab5c243a5a9ba675b9cb2d7436b745d10a18e93d8c21` |
| `scripts/banner-mount.cjs` | `b58cb7175709d89457e4b0c41b5c2769f202516e38fefa4582fcd6f89b0ca003` |
| `scripts/banner-summary.py` | `7a7d584a0b701aa2db4561f11e65c17dd3523735beaf4bfbd418ccbfccb17986` |
| `scripts/dec18-pixels.cjs` | `0ee786d1f8d051b0aeb5cbb21195f41be7d982a18539ac4016042851ff8dc083` |
| `scripts/dec18-two-builds.cjs` | `fa2a3e6c90ecc515b9f65e9fd88ccca106486740bfff9d8d875b1c3ef9bdf4d3` |
| `scripts/dom-equiv.cjs` | `c3f45b9fad9c7b73f7779defc1d56447be31dee8d7229fb4ad8fc3f1ca4f762d` |
| `scripts/e2e.config.ts` | `26bdc6d301f7bcf5769fbec60c42c10a7efa9ab17944e53d2c1655bdd19c1a71` |
| `scripts/evidence.cjs` | `abebd21bfe8487e27c94cfd93f70cd89f963616c87a29f6fe7ab35cd819005f8` |
| `scripts/header-equiv.cjs` | `cb74ef5e69daa9033a29040e4f6e69fb8e9abac94d5d43e88b2e569b2285bed2` |
| `scripts/hover-equiv.cjs` | `b0348c29e83544778806b0e001611238c1fa87f51db31cd6ec29376cd3057a6b` |
| `scripts/html-diff.py` | `cfe9d1f0934a27ea7242658ce2f9259f78569139799a3f5052f510ebae3173a4` |
| `scripts/paired.py` | `35a3f1d47f2bbba439e9eb3792690ba9bf9c13dbde3c31e85bdf28f2239f7130` |
| `scripts/run-evidence.sh` | `58c79e0a1c36c4d49533cb5a7704c79130abcafea0fdbb1c3f9866170808efa7` |
| `scripts/summarize.py` | `df9f218d5ffae4aac61d037d24336a923ac1f8d5f2243bf812cbf2cadb3292f8` |
| `SHA256SUMS` (344 файли, разом з 84 кадрами `dec18/main`, `dec18/branch` і відкладеними спробами 27.10) | `b9ad36c0bcc5f2dfb7e38e3fa6c95647f91a699bced3c86156321e5737cf4a98` |

## Відкат

Після squash-merge — `git revert` коміту PR. Зміни лише в селекторах і класах; дані, API, кеш не зачеплені.
