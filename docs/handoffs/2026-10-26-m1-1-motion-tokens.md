# Handoff · Motion v1 · M1-1 «Токени без змін значень»

| | |
|---|---|
| Дата | 2026-10-26 |
| Виконавець | Claude Code |
| Підстава | План Motion v1 M1, схвалений власником 26.10 (PR #253) |
| PR | [#256](https://github.com/leusd100/rubikon-build/pull/256), Draft, мітка `visual-freeze`. **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `refactor/m1-1-motion-tokens` від `main` `bcf9eab7` (#254); у гілку злито `origin/main` `bcf9eab7` перед міграцією |
| Коміти | `740d95fe` A1 парсер руху `css-motion.mjs` і `motion-diff.mjs` · `3ca1f510` A1 motion-diff: спільний `:root`, область оголошення, подвійні оголошення, симлінк · `99be4266` A2 токени Motion v1 у `globals.css` і сторож `motion-tokens.test.ts` · `1b852836` A2 сторож: хореографія лише у своєму файлі, токени лише в `globals.css` · `611767f8` злиття `origin/main` (#254) · `c40c7f32` A3 `home-v2.css` · `edd1317d` A4 `frame-tour.css`, `direction-node.css` · `bba3b493` A5 `about`, `capability`, `region`, `delivery`, `process-split` · `fcbab2b6` A6 `direction-template`, `catalog-drawing`, `formats-scope`, `directions`, `drawing-sheet`, `faq` · `61283c29` A7 `change-sheets`, `resp-matrix`, `proof-details`, `directions-key`, `directions-sheets`, `grain-*` · `dc43e3ac` A8 конфігуратор (4 файли) і `globals.css` · `706060cc` A9 сторож без `PENDING` · `939db483` A9 `ui-system-v1.md` §6 «Motion v1» · `5de6603e` A9 `computed-motion.mjs` · цей handoff |
| Змінено | 27 CSS-файлів `app/`: числа часу й `cubic-bezier` у `transition*`/`animation*` стали посиланнями на токени або на змінні хореографії файлу. `app/globals.css`: 8 нових токенів і 2 аліаси. Нові `scripts/motion/css-motion.mjs`, `motion-diff.mjs`, `computed-motion.mjs`; нові тести `tests/unit/css-motion.test.ts`, `tests/unit/motion-tokens.test.ts`; два наявні тести оновлено (`design-tokens.test.ts` — нові імена токенів, `planner/grain-planner-css.test.ts` — рівно один `:root` хореографії). `docs/ui-system-v1.md`: §6 переписано як «Motion v1», рядок Motion у §9 |
| Не змінено | Жодного значення часу, затримки чи кривої: ні в CSS, ні в обчислених стилях. Хореографія турів, X-Ray, 3D-збірки, `ProofContour` (лише числа переїхали в блоки хореографії). TSX і JS (0 файлів). Глобальне скидання зменшеного руху (`.01ms !important`). Локальні змінні `--m-reveal`, `--m-draw`, `--m-ease`, `--region-*`, `--ft-k`, `--step` (змінні темпу `--m-*` і `--region-*` чекають M1-2). Залежності (0 нових), еталони DEC-18 (0 PNG) |

## Що було

На `main` `bcf9eab7` у деклараціях `transition*`/`animation*` стояли **553 числа часу** (разом із затримками; 75 різних значень) і **26 використань 8 різних `cubic-bezier`**, і лише **203 посилання** на токени `--motion-*`/`--duration-*`/`--ease-*`. Тобто темп сайту був записаний у 27 файлах окремо, і змінити його «в одному місці» було неможливо: токени W3-01 стояли в 203 місцях проти 579 чисел і кривих, написаних руками (вимірювання парсером `scripts/motion/css-motion.mjs` на `origin/main`; сходиться зі специфікацією на `afcc648`).

## Що зроблено

- **Токени** (`app/globals.css`, перший верхньорівневий `:root`): `--motion-micro` 200 мс, `--motion-ui` 360 мс, `--motion-enter` 700 мс, `--motion-draw` 900 мс, `--motion-draw-long` 1400 мс, `--motion-media-fade` 800 мс, `--motion-stagger` 80 мс, `--motion-rise` 16 px (10 px при ≤760 px); `--ease-premium`, `--ease-plot`, `--ease-standard`, `--ease-signature`; `--duration-fast` і `--duration-medium` — аліаси на `--motion-micro` і `--motion-ui` (значення ті самі). Невживаний `--motion-reveal` (420 мс) видалено.
- **Правило заміни числа.** Число — токен лише там, де збігаються **значення й анімована властивість** (для `animation*` — властивості її `@keyframes`): 200 мс на кольорі, фоні, рамці, обводці, заливці, `box-shadow` або в правилі з `:hover`/`:focus`/`:focus-visible`/`:active` → `--motion-micro`; 800 мс на `opacity`/`filter` селектора з `hero`, `media`, `image`, `img`, `video`, `poster`, `photo`, `picture` → `--motion-media-fade`; 900 мс на `stroke-dashoffset`/`clip-path` → `--motion-draw`; 1400 мс там само → `--motion-draw-long`. Усе інше — змінна хореографії файлу. Те саме число на іншій властивості (`.2s` на `transform`) токеном **не** стає: це власний час файлу, його рішення належить M1-2.
- **Хореографія.** Кожен із 26 файлів, крім `globals.css`, має на початку верхньорівневий `:root` з коментарем `Choreography (Motion v1, ui-system §6)`; `globals.css` тримає свої 12 змінних `--site-*` наприкінці єдиного першого `:root`, після токенів (другий `:root` у файлі SonarCloud позначив би як дубль селектора, css:S4666). Імена: `--<префікс>-for-<що>` — тривалості; `--<префікс>-at-<що>` — затримки й кроки каскадів (`calc(var(--i, 0) * 22ms)` → `calc(var(--i, 0) * var(--rm-at-row-step))`; затримки завжди в `-at-*`); `--<префікс>-curve-<що>` — усі 8 кривих-літералів (на токени вони переїдуть у M1-2). Одне ім'я — одне значення, оголошене один раз; змінна читається лише у своєму файлі. Значення перенесені дослівно (`.3s` лишилось `.3s`). Усього **345 змінних** у 27 файлах.
- **Результат у числах:** літералів часу 553 → **0**, літералів `cubic-bezier` 26 → **0**; посилань на токени 203 → 225 (+22: `--motion-micro` +12, `--motion-draw` +8, `--motion-draw-long` +2); посилань на змінні хореографії 0 → 557. 22 + 557 = 579 = 553 + 26: кожне число й кожна крива пішли або в токен, або в змінну.
- **Сторож** `tests/unit/motion-tokens.test.ts` тепер без `PENDING` і працює на всіх `app/**/*.css`: літерал у `transition*`/`animation*` падає; токен має бути з точним значенням і лише в `globals.css` `:root` (єдиний виняток — `--motion-rise: 10px` у `@media (max-width: 760px)`); будь-яка інша `--motion-*`/`--ease-*`/`--duration-*` у будь-якому файлі падає; змінна руху мусить резолвитись у своєму файлі (токен — ще з `globals.css`/`theme.css`); змінна хореографії — одна на файл, у верхньому `:root`, без fallback (`var(--x, 300ms)` сховав би відсутню змінну за числом); **будь-яка змінна, яку читає `transition*`/`animation*` (з fallback чи без), мусить бути оголошена якимось CSS застосунку або входити в короткий список `INLINE` — імена, які компонент ставить inline-стилем (`--n`, `--dn-step-ms`, `--parts`, `--hold`; у коментарі до кожного — файл і рядок, де TSX її ставить)**; сам список перевіряється на застарілість: ім'я, якого вже не ставить жоден `.ts`/`.tsx`, яке оголосив CSS або яке рух не читає, — помилка.
- **Інструменти:** `scripts/motion/motion-diff.mjs [--base <ref>] --expect-none` порівнює декларації руху бази й дерева після підстановки змінних і нормалізації (`.2s` = `200ms`); `scripts/motion/computed-motion.mjs --base <url> --head <url>` порівнює обчислені стилі двох збірок і друкує помилки сторінки (`pageerror`) по збірках; помилка, якої base не кидає, — відмінність (exit 1).
- **Документ.** `docs/ui-system-v1.md` §6 «Motion v1»: таблиці токенів і кривих, п'ять жестів (M2), правила руху, механізм появи (M2-1), правило «токен чи хореографія файлу», сторож і явний запис: «Сайт має появу під час скролу — п'ять жестів, один раз, перший екран не ховається (рішення власника 26.10; скасовує попереднє правило "No sitewide scroll-reveal")». Рядок Motion у §9 тепер перелічує нові токени (без `--motion-reveal`).

### Префікси хореографії

| Префікс | Файл | Змінних |
|---|---|---|
| `hv2` | `app/home-v2.css` (головна) | 63 |
| `about` | `app/pro-nas/about.css` | 34 |
| `cdw` | `app/components/directions/catalog-drawing.css` | 24 |
| `ft` | `app/components/angary/frame-tour.css` | 20 |
| `cs` | `app/components/process/change-sheets.css` | 19 |
| `dt` | `app/components/directions/direction-template.css` | 18 |
| `ge` | `app/zernoskhovyshcha/grain-editorial.css` | 17 |
| `hv2d` | `app/components/home-v2/proof-details.css` | 16 |
| `dn` | `app/components/directions/direction-node.css` | 14 |
| `gc` | `app/components/zernoskhovyshcha/grain-complex.css` | 12 |
| `site` | `app/globals.css` (шапка, картки напрямів, кнопки) | 12 |
| `rm` | `app/components/process/resp-matrix.css` | 11 |
| `ps` | `app/components/directions/process-split.css` | 10 |
| `sheet` | `app/components/drawing-sheet.css` | 10 |
| `proc` | `app/yak-pratsyuiemo/delivery.css` | 10 |
| `planner` | `app/zernoskhovyshcha/grain-planner.css` | 9 |
| `region` | `app/components/about/region.css` | 8 |
| `gv` | `app/components/configurator/general-view.css` | 7 |
| `dkey` | `app/components/home-v2/directions-key.css` | 6 |
| `hcs` | `app/components/configurator/configurator-sheet.css` | 5 |
| `cap` | `app/components/about/capability.css` | 4 |
| `faq` | `app/components/faq.css` | 4 |
| `dfmt` | `app/components/directions/formats-scope.css` | 3 |
| `hcp` | `app/configurator-preview/configurator.css` | 3 |
| `dcat` | `app/napryamky/directions.css` | 2 |
| `dsh` | `app/components/home-v2/directions-sheets.css` | 2 |
| `hcc` | `app/components/configurator/configurator-controls.css` | 2 |

Блоки `:root` у `directions-key.css`, `directions-sheets.css`, `grain-planner.css`, `configurator-sheet.css` свідомо порушують «кожне правило прив'язане до свого блоку»; це записано в заголовках файлів. Тест `grain-planner-css.test.ts` допускає рівно один такий виняток — верхньорівневий `:root` лише з `--planner-for|at|curve-*`.

## Чому 0 змін

1. **`motion-diff`** (`node scripts/motion/motion-diff.mjs --base origin/main --expect-none`): «База origin/main (bcf9eab7): 41 CSS-файл; поточне дерево: 41. **0 відмінностей у 41 файлі**», exit 0. Порівняння йде після підстановки змінних і нормалізації часу, тож `.2s` ↔ `var(--motion-micro)` — той самий запис, а втрачена, дописана чи переставлена декларація — відмінність.
2. **`computed-motion`** (`node scripts/motion/computed-motion.mjs --base http://127.0.0.1:4383 --head http://127.0.0.1:4382`, production-збірки `main` і гілки, Chrome): **18 з 18 пар «сторінка × ширина» без відмінностей** — 9 публічних сторінок × 390 і 1440 px, `reducedMotion: 'no-preference'`, прокрутка до кінця кроками по 0,8 вікна; зібрано обчислені `transition-*`/`animation-*` усіх елементів і їхніх `::before`/`::after` у порядку DOM (від 933 до 1580 елементів і від 192 до 399 рядків руху на сторінку). Прохід детермінований: `page.clock` ставиться до навігації, після кожного кроку — 150 мс реального часу на кадри й `runFor(1200)`; тож таймерні стани (тур вузлів, утримання 260 мс) в обох збірках стоять в одній точці. Контроль: `main` проти `main` — теж 18 з 18 без відмінностей, тобто метод не шумить. Негативний контроль: збірка гілки через проксі, що міняє `--motion-micro` 200 → 210 мс, на `/napryamky` @ 1440 дала 101 відмінний рядок і exit 1.
3. **Зворотна підстановка** (27 з 27 файлів): з файлу гілки прибрано блок хореографії, кожну `var(--<префікс>-…)` і кожен токен замінено значенням, коментарі прибрано, час нормалізовано (`.2s` = `200ms`), порожні рядки не рахуються — результат дорівнює файлу `origin/main`. Для `globals.css` об'єкт порівняння — усе, крім декларацій самих токенів. Групи A6–A8 довели це ще й проти попереднього коміту — байт-у-байт; A3–A5 — через `motion-diff` і обчислені стилі.
4. **Сторож над усім CSS:** 10 тестів `motion-tokens.test.ts` зелені на всіх 41 файлі без винятків.
5. **Не покрито `computed-motion`** (`:hover`, `:focus-visible`, `:active`, `[open]`, неактивні радіо — це не обчислений стиль чогось у спокої): їх закриває `motion-diff`, який порівнює самі декларації; групи A5–A8 під час міграції прогнали обчислені стилі, а A6 — ще й з наведенням на кожен рядок і аркуш, перемиканням форматів і FAQ.

## Перевірка

| Що | Результат |
|---|---|
| `vitest run` (всі юніти) | 97 файлів, **1533 passed** |
| `tsc --noEmit --incremental false` | чисто |
| `eslint . --ignore-pattern dist --ignore-pattern .next` (як `pnpm lint`) | 0 помилок, 0 попереджень |
| `motion-diff --expect-none` | 0 відмінностей у 41 файлі |
| `computed-motion` `main` ↔ гілка | 18 з 18 без відмінностей; контроль `main` ↔ `main` — 18 з 18 |
| E2E на production-збірці гілки (порт 4382), desktop-chromium + mobile-chromium, `--workers=2`: `napryamky-key-plan`, `home-proof-contour`, `drawing-sheet-plot`, `yak-formats-scope`, `cost-factors`, `configurator-sheet`, `angary-editorial`, `smoke`, `form` | 382 тести: **298 passed**, 84 skipped (розділення по проєктах), **0 failed**, 0 flaky. `home-proof-contour:2054` цього разу не падав |
| `visual.spec.ts` локально (проєкт `visual-chromium`, macOS, `--update-snapshots=none`) | не авторитетно: darwin-еталони на `main` застарілі, тож 32 з 33 падають і на гілці, і на `main` (на `main` — теж 32). З 32 знімків 29 побайтово однакові у парному проході гілка ↔ `main`; три (`homepage-hero` desktop і mobile, `homepage-directions` desktop) відрізнялись, але в повторних проходах дають різні варіанти й на самому `main` (`homepage-hero-mobile-375`: два варіанти, різниця 48 599 пікселів, не більше 15 з 255 за каналом). Жоден PNG не оновлювався й не коміттився. Вирішує Main Regression на Linux |
| CI | Main Regression на гілці запущено вручну (`workflow_dispatch`) на `bde10d30`: запуск [40390938035](https://github.com/leusd100/rubikon-build/actions/runs/40390938035); PR Fast Gate і DEC-18 (`visual-freeze`) — у самому PR |
| Розмір CSS, що віддається сторінці (gzip) | головна 46 576 → 48 031 B (+3,1 %), `/napryamky` 33 918 → 34 540, `/yak-pratsyuiemo` 45 127 → 46 212, `/pro-nas` 36 719 → 37 499, `/angary` 57 019 → 58 252 |

## Знахідки поза задачею

Знайдено під час міграції; **не виправлялось** (M1-1 не змінює поведінку), рішення за власником.

- `app/components/angary/frame-tour.css:127`: `.ft-answer { animation: ft-in … }`, а `@keyframes ft-in` ніде в `app/` немає. Анімація не виконується, тож час `--ft-for-answer-in` і затримка `--ft-at-answer-in` ні на що не впливають.
- `.detail-steps` у `app/components/directions/direction-template.css` (9 правил) не рендериться на жодній сторінці: це гілка `else` у `DirectionDetail.tsx`, а чотири напрями з процесом мають `split` і малюють `process-split`, `/angary` процесу не має. Перевірено по відповідях `main`.
- `--dcat-for-slide-bar: 6000ms` у `app/napryamky/directions.css` дублює `CLIP_DURATION_MS = 6000` у `app/components/DirectionsHeroImageSequence.tsx`. Дві копії одного числа, зв'язку між ними немає. Це кандидат на єдине джерело в M1-4 (автопокази).
- `--site-for-hero-sequence: .7s` (`app/globals.css:143`), яку читає `.directions-hero-sequence-image` (`:791`), ніколи не діє: `DirectionsHeroImageSequence.tsx:74` ставить на кожен кадр inline `transitionDuration: 2000ms` (`FADE_DURATION_MS`, рядок 11). Два числа про одне перекривання, діє друге.
- `--site-for-hero-video: 1.1s` (`app/globals.css:144`, читає `.direction-hero-video`, `:796`) перекривається inline `transitionDuration` у `DirectionHeroVideo.tsx:202` (за замовчуванням `DEFAULT_FADE_DURATION_MS = 1100`, рядок 23; `AboutHeroVideo.tsx:88` передає 1100/800, `HomeV2HeroMedia.tsx:70` — 800). CSS-значення збігається лише з одним із них.
- `.promise-visual img` у `app/globals.css:583` не збігається з жодним елементом: `.promise-visual` стоїть лише на `/pro-nas`, і там у ньому SVG-креслення, не `img`.

## Успадковані червоні перевірки

`home-proof-contour.spec.ts:2054` нестабільний на `main` `bcf9eab7` (Main Regression, запуск 40334343823) і не пов'язаний з цим PR. У нашому прогоні на гілці він не падав.

## Ризики

- **Помилка в імені змінної** зробила б декларацію `transition`/`animation` недійсною під час обчислення (рух зник би мовчки). **Після merge в CI працює лише сторож** (`tests/unit/motion-tokens.test.ts`); `motion-diff` і `computed-motion` — ручні інструменти, у CI їх немає. Сторож ловить: ім'я токена (`--motion|ease|duration-*`) або хореографії (`--<префікс>-for|at|curve-*`), якого не оголошено (токен — у `globals.css`/`theme.css`, хореографія — лише у своєму файлі), і **будь-яке інше ім'я, яке читає `transition*`/`animation*` і якого не оголошує жоден CSS застосунку й немає в `INLINE`**. Перевірено мутаціями у тимчасовій копії `app/` (до виправлення сторож пропускав усі три першими): `var(--moiton-micro)` у `faq.css`, `var(--easing-premium)` у `about.css`, `var(--hv2-fro-held-fade)` у `home-v2.css` — кожна валить новий тест «declares every variable a transition or an animation reads»; ще `var(--m-reveel)` і `var(--hldo, …)` (описка з fallback) падають, а перейменування `'--hold'` у `ProofContour.tsx` валить «lists only inline variables a component still sets». Чого він **не** ловить: описку, що збіглась з іншим оголошеним іменем; токен не тієї ролі (`--motion-ui` замість `--motion-micro`); те, що ім'я оголошене в іншому файлі або в іншій області (`.about-page`, `.process-page`), ніж там, де його читають, — для нелокальних імен сторож не знає області; значення проміжної змінної (`--x: .3s`). Це ловить `motion-diff`/`computed-motion` перед merge.
- **Спільний `:root`.** Усі файли пишуть у один `:root`; два файли з однаковим ім'ям змінної перезаписали б одне одного. Сторож не допускає ім'я хореографії у двох файлах, а `motion-diff` окремо ловить розбіжні значення того самого імені.
- **Розмір CSS** +0,6…+1,5 КБ gzip на сторінку (див. таблицю вище). Швидкість мірялась через Nightly Full QA (у PR-воркфлоу Lighthouse немає), див. «Перевірка».
- **Таймерні стани.** M1-1 не чіпає ні `.tsx`, ні `.ts`: JS, що тримає тривалість власним числом (`CLIP_DURATION_MS`, утримання, тури), не змінився. Узгодження цих чисел із CSS — M1-4.
- **Safari/Firefox** локально не запускались; перевірка Chrome. Змінні в `transition`/`animation` і `calc(var() * var())` — звичайні можливості CSS, які сайт уже вживав (`calc(var(--i, 0) * 22ms)` стояв на `main`).
- **Відкат** одним `git revert` коміту PR (після squash-merge): значень ніхто не міняв, залежностей немає.

## Наступні кроки

1. **Порядок merge:** спершу PR #253 (специфікація й план, на які посилається §6 у `docs/ui-system-v1.md`), потім #256. Власник дивиться PR, Main Regression і DEC-18 під `visual-freeze` (очікується 0 змінених PNG). Merge — лише за його словом.
2. **M1-2 «Темп за ролями»** — після merge M1-1: появи 360/420 → `--motion-enter` 700 мс, `ease` кольору → `--ease-standard`, 8 літеральних кривих → таблиця кривих, картки HOME без підйому; це видимий PR із записами до/після, потрібне підтвердження власника за брифом M1.
3. **M1-4 «Автопокази»** — залежить від M1-1 і від рішення OD-PX-34 (крок 2,2 с чи 3 с).
