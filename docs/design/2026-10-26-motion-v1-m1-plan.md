# Motion v1 · Хвиля M1 «Почерк» — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** один темп і одні криві руху для всього сайту: токени замість 553 чисел у CSS, повільніша поява за ролями, Lenis без кадрів у спокої, чотири автопокази за одним правилом.

**Architecture:** чотири незалежні від `main` PR (без стекування): M1-1 переводить числа на токени й локальні «блоки хореографії» без зміни жодного значення (доводить скрипт `motion-diff`); M1-2 змінює значення за ролями; M1-3 замінює `autoRaf` Lenis власним циклом, що живе лише під час руху; M1-4 виносить автопокази в чистий планувальник `createFirstViewWalk` + хук-обгортку. Логіка, яку можна перевірити без браузера (парсер CSS, планувальник, цикл Lenis), — у чистих модулях із юніт-тестами (vitest працює в Node без DOM); поведінка компонентів — e2e Playwright.

**Tech Stack:** CSS custom properties, React 19 / vinext, Lenis 1.3.26, vitest 4 (environment node), Playwright 1.62.

**Spec:** `docs/design/2026-10-26-motion-v1-design.md` (розділи 4, 7, 8, 9, 11, 13). Виконавець читає і специфікацію, і цей план.

## Global Constraints

- Кожен PR — гілка від свіжого `origin/main`, Draft PR у `main`, без стекування. Merge — лише за словом власника (DEC-30). Push гілки з worktree — явним refspec `git push -u origin <branch>:<branch>`.
- PR-назви, handoff і коміти — українською; handoff у `docs/handoffs/<дата>-<тема>.md` на гілці PR (публічний репозиторій: без приватних шляхів і даних). Кінець кожного коміту — рядок `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Нових залежностей — 0.
- Токени (точні значення, `app/globals.css` `:root`): `--motion-micro: 200ms`, `--motion-ui: 360ms`, `--motion-enter: 700ms`, `--motion-draw: 900ms`, `--motion-draw-long: 1400ms`, `--motion-media-fade: 800ms`, `--motion-stagger: 80ms`, `--motion-rise: 16px` (10px при `max-width: 760px`), `--ease-premium: cubic-bezier(.2, .7, .1, 1)`, `--ease-plot: cubic-bezier(.55, 0, .25, 1)`, `--ease-standard: cubic-bezier(.4, 0, .2, 1)`, `--ease-signature: cubic-bezier(.3, 1.5, .5, 1)`; аліаси `--duration-fast: var(--motion-micro)`, `--duration-medium: var(--motion-ui)`; `--motion-reveal` видаляється.
- Зменшений рух: кінцевий стан одразу; глобальне скидання `globals.css:1589–1597` (`.01ms !important`) не змінюється; JS-таймери перевіряють `matchMedia('(prefers-reduced-motion: reduce)')` самі.
- Еталони DEC-18: очікувано 0 змінених PNG у кожному PR (знімаються під `reduce`). Мітка `visual-freeze` на кожен PR.
- e2e не ходять у Google: регулярний вираз Google — прямо в `context.route(...)` (сторож `tests/unit/e2e-google-intercept.test.ts`).
- Середовище: у worktree — симлінк `node_modules` на основний checkout; бінарники напряму (`./node_modules/.bin/vitest|tsc|eslint|playwright|vinext`), не `pnpm exec`. Сервер `vinext start` зупиняти за портом (`lsof -tiTCP:<port> -sTCP:LISTEN`), бо дочірній node переживає `pkill`.
- Хореографія турів, X-Ray, 3D-збірки (`frame-tour.css`, `home-v2.css` тур контуру, `ProofContour`) не змінюється — лише числа переїжджають у блоки хореографії в M1-1.

## Review Focus

1. **Неоголошена або чужа змінна в переході** (опечатка в `var(--hv2-for-…)` або змінна з іншого CSS-файлу, якого немає на маршруті) робить усю декларацію `transition`/`animation` недійсною мовчки → тест «кожна змінна руху оголошена у своєму файлі або серед токенів» (Task A2).
2. **Перше колесо після довгого простою** не має стрибати сторінкою (великий `deltaTime` у `lenis.raf`) → тест «перший крок після 3 с простою ≤ 40 px» (Task C2).
3. **Трекпад (серія дрібних `wheel`) і клік по якорю** мають тримати цикл Lenis живим до кінця руху й зупиняти після → тести «серія трекпада доходить до цілі, потім 0 rAF/с» і наявний «hero CTA reaches the inquiry section» (Task C2).
4. **Людина торкається блоку до старту показу** (під час `startDelayMs` або поки блок < 50 % у вікні) → показ не стартує ніколи → юніт «stop() до старту» (Task D1) і e2e «наведення на схему /pro-nas до прокрутки — показу немає» (Task D3).
5. **Відновлений браузером вибір формату на /yak** (`resp-format` після reload) → прохід форматів не стартує → e2e у Task D4.

---

## Файли

| Файл | Відповідальність | Частина |
|---|---|---|
| `scripts/motion/css-motion.mjs` (новий) | розбір CSS: декларації руху, кастомні властивості, підстановка `var()`, нормалізація | A |
| `scripts/motion/motion-diff.mjs` (новий) | CLI: декларації руху `<base>` проти робочого дерева після підстановки змінних | A, B |
| `scripts/motion/computed-motion.mjs` (новий) | CLI: обчислені `transition-*`/`animation-*` усіх елементів двох запущених збірок на 9 сторінках × 390/1440 | A |
| `tests/unit/css-motion.test.ts` (новий) | юніт-тести парсера | A |
| `tests/unit/motion-tokens.test.ts` (новий) | сторож Motion v1 | A, B |
| `tests/unit/design-tokens.test.ts` | список токенів руху | A |
| `app/globals.css` | токени; власні числа → блок хореографії | A, B |
| 26 інших CSS-файлів з числами (таблиця в Task A3–A8) | числа → токени / блоки хореографії | A, B |
| `docs/ui-system-v1.md` §6 | «Motion v1» | A |
| `app/components/lenisLoop.ts` (новий) | цикл rAF для Lenis лише під час руху | C |
| `tests/unit/lenis-loop.test.ts` (новий) | юніт-тести циклу | C |
| `app/components/SmoothScroll.tsx` | `autoRaf: false` + `startLenisLoop` | C |
| `tests/e2e/smooth-scroll-idle.spec.ts` (новий) | Lenis у спокої й під час руху | C |
| `app/lib/firstViewWalk.ts` (новий) | чистий планувальник автопоказу + «одна сцена» | D |
| `tests/unit/first-view-walk.test.ts` (новий) | юніт-тести планувальника | D |
| `app/hooks/useFirstViewWalk.ts` (новий) | хук: IntersectionObserver + дії людини → планувальник | D |
| `CostFactorsFigure.tsx`, `CapabilityFigure.tsx`, `ChangeSheets.tsx`, `FormatsScope.tsx`, `formats-scope.css` | перехід на хук | D |
| `tests/e2e/first-view-walks.spec.ts` (новий), `tests/e2e/yak-formats-scope.spec.ts` | поведінка показів | D |
| `docs/handoffs/…` (4 нові) | handoff кожного PR | A–D |

**Порядок:** A (M1-1) першим. C (M1-3) — паралельно з A, файли не перетинаються. B (M1-2) і D (M1-4) — гілки від `main` після merge A. E (бриф M1) — після реалізації B і D на гілках; Draft PR для B і D відкриваються після рішень власника в брифі.

---

## Частина A — M1-1 «Токени без змін значень»

Гілка `refactor/m1-1-motion-tokens` від `origin/main`.

**Правило заміни числа** (кожне число часу або `cubic-bezier` у декларації `transition*`/`animation*`; для `animation*` «анімована властивість» — властивості з її `@keyframes`):

| Значення | Замінюється на | Лише коли анімована властивість… |
|---|---|---|
| 200ms / .2s | `var(--motion-micro)` | `color`, `background-color`, `border-color`, `outline-color`, `text-decoration-color`, `fill`, `stroke`, `box-shadow` — або правило має `:hover`/`:focus`/`:focus-visible`/`:active` у селекторі |
| 800ms / .8s | `var(--motion-media-fade)` | `opacity`/`filter` на селекторі зі словом `hero`, `media`, `image`, `img`, `video`, `poster`, `photo` або `picture` |
| 900ms / .9s | `var(--motion-draw)` | `stroke-dashoffset`, `clip-path` |
| 1400ms / 1.4s | `var(--motion-draw-long)` | `stroke-dashoffset`, `clip-path` |
| усе інше | змінна хореографії файлу | — |

**Змінні хореографії:** блок `:root { … }` на початку файлу (після заголовного коментаря) з коментарем `/* Choreography (Motion v1, ui-system §6): this file's own times and curves */`. Імена: `--<префікс>-for-<що>` — тривалості, `--<префікс>-at-<що>` — затримки й кроки каскадів (`calc(var(--i, 0) * 22ms)` → `calc(var(--i, 0) * var(--rm-at-row-step))`), `--<префікс>-curve-<що>` — 8 кривих-літералів (лише до M1-2). Одне ім'я = одне значення, оголошене один раз; змінна вживається лише у своєму файлі. Значення переносяться дослівно (`.3s` лишається `.3s`). Наявні локальні змінні (`--m-reveal`, `--m-draw`, `--m-ease`, `--region-*`) не чіпати.

### Task A1: Парсер CSS і `motion-diff`

**Files:**
- Create: `scripts/motion/css-motion.mjs`, `scripts/motion/motion-diff.mjs`
- Test: `tests/unit/css-motion.test.ts`

**Interfaces:**
- Produces (`css-motion.mjs`, ESM, JSDoc-типи):
  - `stripComments(css: string): string`
  - `motionDeclarations(css: string): { selector: string; property: string; value: string; atRule: string | null }[]` — декларації з `property` `^(transition|animation)(-[a-z-]+)?$` у порядку файлу; `atRule` — прелюдія найближчого `@media`/`@supports` (вкладеність до 2 рівнів); вміст `@keyframes` пропускається.
  - `customProperties(css: string): Map<string, string[]>` — усі значення кожної `--*`, у порядку файлу.
  - `resolveVars(value: string, defs: Map<string, string>): string` — рекурсивна підстановка `var(--x[, fallback])`; невідома змінна без fallback лишається як є.
  - `normalizeMotion(value: string): string` — час → `<n>ms` (`.3s` → `300ms`, `-0.4s` → `-400ms`), `cubic-bezier(.30, .7,.2,1)` → `cubic-bezier(0.3,0.7,0.2,1)`, пробіли згорнуті, нижній регістр.
  - `timeLiterals(value: string): string[]` — числа часу ≠ 0 і ≠ `.01ms`/`0.01ms`.
- `motion-diff.mjs`: `node scripts/motion/motion-diff.mjs [--base <ref>] [--expect-none]`. Для кожного `app/**/*.css` (база — `git show <ref>:<path>`, default `origin/main`; поточне — робоче дерево): `defs` = значення з `globals.css` `:root` + `theme.css` того ж дерева + змінні файлу, що мають рівно одне значення; порівнює списки `selector | property | normalizeMotion(resolveVars(value))`; друкує відмінності по файлах; з `--expect-none` — exit 1 за будь-якої.

- [ ] **Step 1: Write the failing tests** — `tests/unit/css-motion.test.ts`, фікстури рядками:
  - `motionDeclarations` повертає `transition` з правила всередині `@media (min-width: 761px) { @supports (…) { … } }` з `atRule` `(min-width: 761px)`… і **не** повертає нічого з `@keyframes x { to { … } }`;
  - `normalizeMotion('opacity .3s cubic-bezier(.30, .7,.2,1) 1.4s')` → `'opacity 300ms cubic-bezier(0.3,0.7,0.2,1) 1400ms'`;
  - `resolveVars('transform var(--a) var(--b, 20ms)', new Map([['--a', 'var(--c)'], ['--c', '700ms']]))` → `'transform 700ms 20ms'`;
  - `resolveVars('calc(var(--i, 0) * var(--s))', new Map([['--s', '22ms']]))` → `'calc(var(--i, 0) * 22ms)'`;
  - `timeLiterals('opacity .01ms, transform 0s 120ms')` → `['120ms']`.
- [ ] **Step 2: Run** `./node_modules/.bin/vitest run tests/unit/css-motion.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `css-motion.mjs` (сканер дужок `{}` з урахуванням рядків і коментарів, без залежностей) і `motion-diff.mjs`.
- [ ] **Step 4: Run** тест — PASS; `node scripts/motion/motion-diff.mjs --expect-none` на незміненому дереві — exit 0, «0 відмінностей у 40 файлах».
- [ ] **Step 5: Commit** `test(motion): парсер декларацій руху і motion-diff (M1-1)`.

### Task A2: Токени Motion v1 і сторож

**Files:**
- Modify: `app/globals.css:108–119` (блок «Motion (PDO-64)»), `tests/unit/design-tokens.test.ts:31–35`
- Create: `tests/unit/motion-tokens.test.ts`

**Interfaces:**
- Consumes: `css-motion.mjs` (A1).
- Produces: `PENDING: readonly string[]` у `motion-tokens.test.ts` — файли (шляхи відносно `app/`), ще не переведені; кожен Task A3–A8 видаляє свої.

- [ ] **Step 1: Write the failing test** `tests/unit/motion-tokens.test.ts`:
  - `declares the Motion v1 tokens` — `:root` `globals.css` має кожен токен із Global Constraints з точним значенням; `--duration-medium: var(--motion-ui)`; немає `--motion-reveal`; є `@media (max-width: 760px) { :root { --motion-rise: 10px; } }`.
  - `keeps numbers out of transitions and animations` — для кожного CSS поза `PENDING`: `timeLiterals(value)` порожній і `value` не містить `cubic-bezier(`; повідомлення `file | selector | property | value`.
  - `resolves every motion variable in its own file or the tokens` — кожна `var(--x)` у деклараціях руху, де `x` відповідає `^--(motion|ease|duration)-` або `^--[a-z0-9]+-(for|at|curve)-`, оголошена в тому самому файлі або в `globals.css`/`theme.css`. Перевіряється для **всіх** файлів (і `PENDING` теж).
  - `declares each choreography variable once` — у кожному файлі `--<p>-(for|at|curve)-*` має рівно одне значення.
  - `PENDING` = 27 файлів з таблиці Task A3–A8.
- [ ] **Step 2: Run** — FAIL на `declares the Motion v1 tokens`.
- [ ] **Step 3: Implement** у `globals.css`: додати `--motion-ui`, `--motion-enter`, `--motion-stagger`, `--motion-rise`, `--ease-signature`, медіа-правило `--motion-rise`; `--duration-medium: var(--motion-ui)`; видалити `--motion-reveal`; оновити коментар блоку (посилання на ui-system §6). У `design-tokens.test.ts:33` замінити `'--motion-reveal'` на `'--motion-ui', '--motion-enter', '--motion-stagger', '--motion-rise', '--ease-signature'`.
- [ ] **Step 4: Run** `./node_modules/.bin/vitest run tests/unit` — PASS; `motion-diff --expect-none` — exit 0 (`--duration-medium` резолвиться в ті самі 360ms).
- [ ] **Step 5: Commit** `refactor(tokens): токени Motion v1 і сторож руху (M1-1)`.

### Tasks A3–A8: Переведення файлів

Однаковий цикл для кожної групи; префікси — з таблиці.

| Task | Файли (кількість чисел · кривих) | Префікс |
|---|---|---|
| A3 | `home-v2.css` (105 · 2) | `hv2` |
| A4 | `components/angary/frame-tour.css` (61), `components/directions/direction-node.css` (17 · 1) | `ft`, `dn` |
| A5 | `pro-nas/about.css` (45 · 1), `components/about/capability.css` (11), `components/about/region.css` (9), `yak-pratsyuiemo/delivery.css` (11), `components/directions/process-split.css` (17) | `about`, `cap`, `region`, `proc`, `ps` |
| A6 | `components/directions/direction-template.css` (28), `components/directions/catalog-drawing.css` (27 · 4), `components/directions/formats-scope.css` (13), `napryamky/directions.css` (3), `components/drawing-sheet.css` (13), `components/faq.css` (10) | `dt`, `cdw`, `dfmt`, `dcat`, `sheet`, `faq` |
| A7 | `components/process/change-sheets.css` (25 · 6), `components/process/resp-matrix.css` (17 · 2), `components/home-v2/proof-details.css` (18 · 3), `components/home-v2/directions-key.css` (9), `components/home-v2/directions-sheets.css` (2), `zernoskhovyshcha/grain-editorial.css` (19), `components/zernoskhovyshcha/grain-complex.css` (18), `zernoskhovyshcha/grain-planner.css` (11) | `cs`, `rm`, `hv2d`, `dkey`, `dsh`, `ge`, `gc`, `planner` |
| A8 | `components/configurator/general-view.css` (23 · 6), `components/configurator/configurator-sheet.css` (9), `configurator-preview/configurator.css` (7), `components/configurator/configurator-controls.css` (4), `globals.css` (21 · 1) | `gv`, `hcs`, `hcp`, `hcc`, `site` |

- [ ] **Step 1:** видалити файли групи з `PENDING`.
- [ ] **Step 2: Run** `./node_modules/.bin/vitest run tests/unit/motion-tokens.test.ts` — FAIL зі списком чисел групи.
- [ ] **Step 3: Implement** заміни за правилом частини A.
- [ ] **Step 4: Run** сторож — PASS; `node scripts/motion/motion-diff.mjs --expect-none` — exit 0.
- [ ] **Step 5: Run** e2e, що найбільше залежать від часу цієї групи (A3: `home-proof-contour.spec.ts`; A4: `angary-*.spec.ts`, `direction-node*.spec.ts`; A5–A7: `yak-*.spec.ts`, `cost-factors.spec.ts`, `drawing-sheet-plot.spec.ts`; A8: `configurator*.spec.ts`) на зібраному `vinext build` + `vinext start`, chromium — PASS.
- [ ] **Step 6: Commit** `refactor(motion): <файли> — числа часу на токени й хореографію, без змін значень (M1-1)`.

### Task A9: Дизайн-система, перевірка, PR M1-1

**Files:**
- Modify: `docs/ui-system-v1.md:135–157`, `tests/unit/motion-tokens.test.ts` (прибрати `PENDING`)
- Create: `docs/handoffs/<дата>-m1-1-motion-tokens.md`

- [ ] **Step 1:** прибрати `PENDING` із сторожа; Run `vitest run tests/unit` — PASS.
- [ ] **Step 2:** §6 замінити на «Motion v1»: таблиці 4.1–4.3 специфікації, правила 4.4, правило частини A (токен / хореографія) і запис «Сайт має появу під час скролу — п'ять жестів, один раз, перший екран не ховається (рішення власника 26.10; скасовує попереднє правило "No sitewide scroll-reveal")».
- [ ] **Step 3: Implement** `scripts/motion/computed-motion.mjs` — перевірка зі специфікації (розділ 8, «M1-1 без змін»): `node scripts/motion/computed-motion.mjs --base <url> --head <url>`; для 9 публічних сторінок (специфікація 5.2) × ширини 390 і 1440, `reducedMotion: 'no-preference'`: завантажити обидві збірки, прокрутити до кінця кроками по 0,8 вікна (щоб увімкнулись появи), для кожного елемента в порядку DOM зібрати обчислені `transition-property/-duration/-delay/-timing-function` і `animation-name/-duration/-delay/-timing-function/-iteration-count`; надрукувати відмінності; exit 1 за будь-якої. Браузер — `chromium.launch({ channel: 'chrome' })` з `@playwright/test`.
- [ ] **Step 4: Run** повний набір: `./node_modules/.bin/tsc --noEmit --incremental false`, `./node_modules/.bin/eslint .`, `vitest run`, `motion-diff --expect-none`, `vinext build` для `main` і гілки, два `vinext start` на різних портах, `computed-motion.mjs --base … --head …` — exit 0; локальний `visual.spec.ts` (chromium) — усе PASS, 0 змінених PNG.
- [ ] **Step 5:** handoff (що, чому 0 змін, вивід `motion-diff` і `computed-motion`, таблиця префіксів, ризики, відкат одним revert), push, Draft PR `refactor(motion): Motion v1 — токени руху без змін значень (M1-1)` з міткою `visual-freeze`; Main Regression на гілці.
- [ ] **Step 6: Commit** `computed-motion.mjs` і handoff `docs(handoffs): M1-1 токени руху`.

---

## Частина B — M1-2 «Темп за ролями» (видимо)

Гілка `design/m1-2-motion-tempo` від `origin/main` **після merge M1-1**. Draft PR — після OK власника в брифі (Task E1).

### Task B1: Криві й ключові слова на токени

**Files:**
- Modify: файли зі змінними `--*-curve-*` (`home-v2.css`, `direction-node.css`, `about.css`, `catalog-drawing.css`, `change-sheets.css`, `resp-matrix.css`, `proof-details.css`, `general-view.css`, `globals.css`), файли з `ease-out` / `ease-in-out` і з `ease` на властивостях кольору; `tests/unit/motion-tokens.test.ts`

- [ ] **Step 1: Write the failing tests** у сторожі:
  - `keeps curves in the tokens` — `cubic-bezier(` трапляється лише в `globals.css` `:root`; жодної змінної `--*-curve-*`;
  - `uses the standard curve for colour` — у деклараціях `transition*`, де анімована властивість із родини кольору (список з правила частини A, рядок 200ms), немає ключового слова `ease` (лише `var(--ease-standard)`);
  - `has no ease-out or ease-in-out` у деклараціях руху.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** за таблицею 4.2 специфікації: `(.3,.7,.2,1)`, `(.2,.7,.2,1)`, `(.2,.8,.25,1)`, `(.3,.6,.3,1)` → `var(--ease-premium)`; `(.45,0,.2,1)`, `(.65,0,.25,1)` → `var(--ease-plot)`; `(.3,1.5,.5,1)`, `(.3,1.6,.5,1)` → `var(--ease-signature)`; змінні `--*-curve-*` видалити; `ease-out` → `var(--ease-premium)`, `ease-in-out` → `var(--ease-standard)`; `ease` на властивостях кольору → `var(--ease-standard)`. `ease` на `opacity`/`transform` і `linear` лишаються.
- [ ] **Step 4: Run** сторож — PASS; `node scripts/motion/motion-diff.mjs` — у виводі змінились лише криві, жоден час (вивід зберегти для handoff).
- [ ] **Step 5: Commit** `design(motion): криві руху — чотири токени (M1-2)`.

### Task B2: Поява 360/420 → 700 мс

**Files:**
- Modify: `app/pro-nas/about.css:9`, `app/yak-pratsyuiemo/delivery.css:18`, `app/components/directions/direction-template.css:88`, `app/components/about/region.css:11`; `tests/unit/motion-tokens.test.ts`
- Test: `tests/e2e/motion-tempo.spec.ts` (новий)

- [ ] **Step 1: Write the failing tests:**
  - юніт `points every page reveal at the enter token` — `--m-reveal` у трьох файлах = `var(--motion-enter)`; `--region-reveal: var(--m-reveal, var(--motion-enter))`;
  - e2e `motion-tempo.spec.ts`, 1440×900, `reducedMotion: 'no-preference'`: на `/pro-nas` у `.about-principles-grid li`, на `/yak-pratsyuiemo` у `.proc-principle`, на `/metalokonstruktsii` у `.feature-list > article` після `data-motion-ready="on"` обчислена `transition-duration` містить `0.7s` для `opacity`.
- [ ] **Step 2: Run** — FAIL (0.36s / 0.42s).
- [ ] **Step 3: Implement** чотири рядки.
- [ ] **Step 4: Run** — PASS; e2e цих сторінок (`yak-*.spec.ts`, `phase3-shorter-pages.spec.ts`, `direction-*.spec.ts`) — PASS.
- [ ] **Step 5: Commit** `design(motion): поява блоків — 700 мс за токеном (M1-2)`.

### Task B3: HOME без підйому карток

**Files:**
- Modify: `app/components/home-v2/directions-sheets.css:44–53`
- Test: `tests/e2e/motion-tempo.spec.ts`

- [ ] **Step 1: Write the failing test** `HOME direction sheets answer hover with the copper frame, not a lift` — 1440×900, наведення на `.hv2-directions .dsh-sheet[href="/angary"]` і на `.direction-card[href="/angary"]`: в аркуша `transform` = `none`, `box-shadow` = `none`, `border-color` = обчислений `--color-accent`.
- [ ] **Step 2: Run** — FAIL (`matrix(1, 0, 0, 1, 0, -5)`).
- [ ] **Step 3: Implement:** прибрати `transform: translateY(-5px)` і `box-shadow` з `:hover` і п'яти правил `:has(...)`; прибрати `::after` «запас під піднятий аркуш» і його коментар.
- [ ] **Step 4: Run** — PASS; `homepage-directions-*` у `visual.spec.ts` — PASS без оновлення PNG.
- [ ] **Step 5: Commit** `design(home): аркуші напрямів без підйому при наведенні (M1-2)`.

### Task B4: PR M1-2 (після Task E1)

- [ ] **Step 1: Run** повний набір із A9 Step 3; `motion-diff` — зберегти вивід (таблиця змін для handoff).
- [ ] **Step 2:** handoff `docs/handoffs/<дата>-m1-2-motion-tempo.md` (таблиця змін із `motion-diff`, записи з брифу, рішення власника), push, Draft PR `design(motion): темп руху за ролями (M1-2)` + `visual-freeze`, Main Regression.

---

## Частина C — M1-3 «Lenis у спокої»

Гілка `perf/m1-3-lenis-idle` від `origin/main`; може йти паралельно з A.

### Task C1: Цикл rAF лише під час руху

**Files:**
- Create: `app/components/lenisLoop.ts`, `tests/unit/lenis-loop.test.ts`
- Modify: `app/components/SmoothScroll.tsx:81–97` і ефект створення Lenis
- Test: `tests/e2e/smooth-scroll-idle.spec.ts`

**Interfaces:**
- Produces:
  ```ts
  /** The part of Lenis the loop drives */
  export interface LoopTarget { raf(time: number): void; time: number; readonly isScrolling: 'smooth' | 'native' | false }
  export interface FrameClock { request(callback: (time: number) => void): number; cancel(id: number): void }
  export function startLenisLoop(lenis: LoopTarget, clock?: FrameClock): { wake(): void; destroy(): void }
  ```
  `clock` за замовчуванням — `requestAnimationFrame`/`cancelAnimationFrame`. Поведінка: `wake()` планує кадр, якщо цикл стоїть; перший кадр після простою ставить `lenis.time = time - 1000 / 60` перед `lenis.raf(time)`; цикл триває, доки після `raf` `isScrolling === 'smooth'`; `destroy()` скасовує кадр.

- [ ] **Step 1: Write the failing tests:**
  - юніт (фейковий `FrameClock` і `LoopTarget`): `wake schedules one frame and a second wake does not double it`; `the first frame after rest sets time one frame back`; `keeps going while smooth and stops when not`; `destroy cancels the pending frame`;
  - e2e `smooth-scroll-idle.spec.ts`, 1440×900, `/polityka-konfidentsiinosti`, `addInitScript` рахує виклики `requestAnimationFrame`: `at rest the page requests no frames` — через 1,5 с після `load`, за наступні 1000 мс ≤ 2 виклики (на `main` ≈ 60).
- [ ] **Step 2: Run** — юніт FAIL (модуля немає), e2e FAIL (~60).
- [ ] **Step 3: Implement** `lenisLoop.ts`; у `SmoothScroll.tsx` — `autoRaf: false`, після створення `const loop = startLenisLoop(lenis)`, слухачі `window` `wheel` і `click` (`capture: true, passive: true`) викликають `loop.wake()`; при знищенні Lenis — `loop.destroy()` і зняти слухачі; оновити коментарі (`autoRaf`, «No custom rAF loop either» більше не правда).
- [ ] **Step 4: Run** — PASS; `smooth-scroll.spec.ts` — PASS.
- [ ] **Step 5: Commit** `perf(scroll): Lenis без кадрів у спокої — цикл лише під час руху (M1-3 · PDO-95)`.

### Task C2: Рух не ламається

**Files:**
- Test: `tests/e2e/smooth-scroll-idle.spec.ts`

- [ ] **Step 1: Write the tests** (1440×900, `/metalokonstruktsii`):
  - `the first wheel after a long rest does not jump` — 3 с спокою, `mouse.wheel(0, 120)`, вибірка `scrollY` у кожному кадрі: перша зміна ≤ 40 px, кінець = 120 ± 1 за 1000 мс;
  - `a trackpad burst lands where it should, then the loop rests` — 20 подій `wheel` по 6 px кожні 16 мс: кінець = 120 ± 1; за наступні 1000 мс ≤ 2 виклики rAF;
  - `an anchor click still glides to its section` — клік по першому `a[href^="#"]` героя: секція-ціль на відстані ≤ 2 px від своєї позиції під шапкою за 1500 мс.
- [ ] **Step 2: Run** — PASS на гілці; той самий файл на `main` — перший тест PASS/FAIL фіксується в handoff як довідка (на `main` цикл крутиться постійно, тож стрибка немає).
- [ ] **Step 3:** handoff `docs/handoffs/<дата>-m1-3-lenis-idle.md` (до/після: rAF/с у спокої на 5 сторінках; Chrome і Safari вручну — колесо, трекпад, клавіші, якорі — пункт для власника), push, Draft PR `perf(scroll): Lenis у спокої (M1-3 · PDO-95)` + `visual-freeze`, Main Regression.
- [ ] **Step 4: Commit** `test(scroll): колесо після простою, трекпад, якір (M1-3)`.

---

## Частина D — M1-4 «Автопокази за одним правилом»

Гілка `design/m1-4-first-view-walks` від `origin/main` **після merge M1-1**. Крок — `WALK_STEP_MS = 2200` (OD-PX-34 (a)); якщо власник у брифі обере (b) — одна зміна константи на `3000` і тестових очікувань.

### Task D1: Планувальник показу

**Files:**
- Create: `app/lib/firstViewWalk.ts`, `tests/unit/first-view-walk.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const WALK_STEP_MS = 2200;
  export const WALK_VIEW_RATIO = 0.5;
  export interface WalkTimers { set(callback: () => void, ms: number): number; clear(id: number): void }
  export type WalkState = 'waiting' | 'queued' | 'playing' | 'paused' | 'done' | 'stopped';
  export interface FirstViewWalk { see(ratio: number): void; stop(): void; dispose(): void; readonly state: WalkState }
  export function createFirstViewWalk<T>(options: {
    steps: readonly T[];
    onStep: (step: T) => void;
    onDone?: () => void;
    startDelayMs?: number;   // default 0
    stepMs?: number;         // used as Math.max(stepMs ?? WALK_STEP_MS, WALK_STEP_MS)
    timers?: WalkTimers;     // default window.setTimeout / clearTimeout
  }): FirstViewWalk;
  /** Tests only: forget the walk on stage and the queue */
  export function resetWalkStage(): void;
  ```
  «Сцена» — модульна: одночасно `playing` лише один показ. `see(r ≥ 0.5)`: `waiting`/`paused` → `playing`, якщо сцена вільна, інакше `queued`; `see(r < 0.5)`: `playing` → `paused` (таймер знято, сцена звільнена), `queued` → `waiting`. Звільнення сцени запускає перший `queued`. `playing` з `waiting`: через `startDelayMs` — `onStep(steps[0])`, далі кожні `stepMs`; після останнього кроку ще `stepMs` → `onDone`, `done`. З `paused` → наступний крок через повний `stepMs`, показаний крок не повторюється. `stop()` у будь-якому стані → `stopped` назавжди. `dispose()` = `stop()` без побічних викликів.

- [ ] **Step 1: Write the failing tests** (`vi.useFakeTimers()`, `resetWalkStage()` у `beforeEach`):
  - `starts only when half of the block is in view` — `see(0.3)`: 0 кроків за 10 с; `see(0.6)`: крок 0 через `startDelayMs`;
  - `steps every WALK_STEP_MS and never faster` — `stepMs: 1300` → інтервали 2200;
  - `walks once and calls onDone once` — 3 кроки: `onStep` ×3, `onDone` ×1, далі 0 викликів за 60 с;
  - `stop() before the start keeps it from ever stepping` — `stop()`, `see(1)` → 0 кроків;
  - `stop() mid-walk ends it for good` — після кроку 1 `stop()`, `see(1)` → більше 0 кроків, `onDone` не викликано;
  - `pauses out of view and resumes with a full step` — після кроку 1 `see(0)` 10 с — 0 кроків; `see(1)` → крок 2 через 2200;
  - `plays one walk at a time` — A і B у вікні: B `queued`, 0 кроків B, доки A не `done`; потім B починає; `stop()` чи `see(0)` A теж звільняє сцену для B.
- [ ] **Step 2: Run** `vitest run tests/unit/first-view-walk.test.ts` — FAIL.
- [ ] **Step 3: Implement** `firstViewWalk.ts`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(motion): планувальник автопоказу за одним правилом (M1-4 · PDO-55)`.

### Task D2: Хук `useFirstViewWalk`

**Files:**
- Create: `app/hooks/useFirstViewWalk.ts`

**Interfaces:**
- Consumes: `createFirstViewWalk`, `WALK_VIEW_RATIO` (D1).
- Produces:
  ```ts
  export function useFirstViewWalk<T>(
    ref: RefObject<HTMLElement | null>,
    options: { steps: readonly T[]; onStep: (step: T) => void; onDone?: () => void; startDelayMs?: number; stepMs?: number; enabled?: boolean },
  ): { stop: () => void };
  ```
  Ефект (залежності `[enabled, steps]`; колбеки читаються через ref): без `enabled` або під `reduce` — нічого; `IntersectionObserver` з порогами `[0, WALK_VIEW_RATIO]` → `walk.see(entry.isIntersecting ? entry.intersectionRatio : 0)`; на корені `pointerdown`, `focusin`, `keydown` і `pointerenter` з `pointerType === 'mouse'` → `walk.stop()`; прибирання — `dispose()`. `stop` стабільний між рендерами.

- [ ] **Step 1:** реалізувати хук (перевіряється e2e у D3–D4; юніт-середовище без DOM).
- [ ] **Step 2: Run** `tsc --noEmit --incremental false`, `eslint app/hooks` — PASS.
- [ ] **Step 3: Commit** `feat(motion): хук useFirstViewWalk (M1-4)`.

### Task D3: CostFactorsFigure, CapabilityFigure, ChangeSheets

**Files:**
- Modify: `app/components/process/CostFactorsFigure.tsx:155–196`, `app/components/about/CapabilityFigure.tsx:53–83`, `app/components/process/ChangeSheets.tsx:96–118`
- Test: `tests/e2e/first-view-walks.spec.ts` (новий)

**Interfaces:**
- Consumes: `useFirstViewWalk` (D2).

| Компонент | `steps` | `startDelayMs` | `enabled` | `onDone` | Хто кличе `stop()` |
|---|---|---|---|---|---|
| `CostFactorsFigure` | ключі факторів | 400 | `tourEnabled` | `setTour(null)` | `point()` |
| `CapabilityFigure` | наявний масив кроків | 1200 | `true` | `setTour(null)` | `setPointed()` (замість `toured`) |
| `ChangeSheets` | `[1, 2, 3, 4]` | 700 | `!matchMedia('(max-width: 760px)').matches` | — (лишається на 4) | `choose()` |

`TOUR_STEP_MS`, `STEP_MS`, власні спостерігачі й `toured` видаляються. Взвод `ChangeSheets` (`setArmed(true); setStep(0)` у rAF після mount) лишається.

- [ ] **Step 1: Write the failing tests** (`page.clock.install()`, 1440×900, `reducedMotion: 'no-preference'`):
  - `/yak-pratsyuiemo cost factors walk one factor per 2200 ms and come to rest` — після першого кроку `data-active` змінюється через `runFor(2200)` і не змінюється через `runFor(2100)`; після останнього + 2200 — атрибута немає;
  - `/pro-nas capability walk: 2200 ms a step; pointing ends it for good`;
  - `/pro-nas pointing at the scheme before it is in view keeps the walk from starting` (Review Focus 4) — `hover` на `.cap-fig` при ~30 % у вікні, потім прокрутка до 100 %, `runFor(10_000)` — `data-*` показу не змінюються;
  - `/yak-pratsyuiemo plays one walk at a time` — ширина 1440 і висота вікна, за якої фактори й аркуші змін обидва ≥ 50 % (виміряти перед тестом, від 2400), обидва блоки у вікні: поки змінюється `data-active` факторів, `.cs` `data-reached` незмінний; після кінця факторів `.cs` іде 1 → 4.
- [ ] **Step 2: Run** — FAIL (1500/1300 мс; одночасні покази).
- [ ] **Step 3: Implement** три компоненти за таблицею.
- [ ] **Step 4: Run** — PASS; `cost-factors.spec.ts`, `yak-pro-nas-touch.spec.ts`, `angary-*.spec.ts` — PASS. Виміряти на 1440×900 і 1920×1080, чи бувають фактори й аркуші змін одночасно ≥ 50 % без штучної висоти вікна; результат — у handoff (якщо так — сцена тримає аркуші на кроці 0, доки грають фактори).
- [ ] **Step 5: Commit** `design(motion): три автопокази на одному правилі — 2,2 с, один прохід, по одному (M1-4)`.

### Task D4: FormatsScope і марш

**Files:**
- Modify: `app/components/directions/FormatsScope.tsx:45–46, 93–140`, `app/components/directions/formats-scope.css:64`
- Test: `tests/e2e/yak-formats-scope.spec.ts:49–75`, `tests/e2e/first-view-walks.spec.ts`

- [ ] **Step 1: Write the failing tests:**
  - змінити `the block walks through the formats once…`: у «одному пакеті» пакети йдуть один раз — Фундамент → Каркас → Покрівля по 1150 мс — і зупиняються на Фундаменті (`runFor(5000)` — більше змін немає);
  - `no endless animation while the formats are on screen` — `document.getAnimations()` без жодної з `effect.getTiming().iterations === Infinity`, поки `#obsiah` у вікні з форматом «комплексно»;
  - `a format the browser restored stops the walk` (Review Focus 5) — вибрати `resp-format` = `subcontract`, `page.reload()`, прокрутити `#obsiah` у вікно, `runFor(20_000)` — `data-format` лишається `subcontract`.
- [ ] **Step 2: Run** — FAIL (пакети по колу; марш `infinite`).
- [ ] **Step 3: Implement:** прохід форматів — `useFirstViewWalk` (`steps` = id `[...formats.slice(1), formats[0]]`, `startDelayMs: 1600`, `stepMs: 3600`, `enabled` = `!matchMedia('(max-width: 1050px)').matches`, `onStep` = `select`); `choose()`, відновлення й `follow` у дзеркальній групі кличуть `stop()` замість `touched`; спостерігач `inView` лишається для пакетів; пакети — ланцюг `setTimeout` по `STEP_MS` 1150 рівно `PACKAGES.length` разів, потім `turn` = 0, перезапуск лише при зміні `active` або поверненні у вікно; `formats-scope.css:64` — у `animation` маршу `infinite` → `3` (тривалість лишається токеном, який дав M1-1).
- [ ] **Step 4: Run** — PASS; уся `yak-formats-scope.spec.ts` (і мобільні проєкти) — PASS.
- [ ] **Step 5: Commit** `design(motion): формати /yak — один прохід, без нескінченного маршу (M1-4)`.

### Task D5: PR M1-4 (після Task E1)

- [ ] **Step 1:** якщо OD-PX-34 = (b): `WALK_STEP_MS = 3000`, оновити очікування 2200 → 3000 у D1/D3; Run — PASS.
- [ ] **Step 2: Run** повний набір із A9 Step 3.
- [ ] **Step 3:** handoff `docs/handoffs/<дата>-m1-4-first-view-walks.md`, push, Draft PR `design(motion): автопокази за одним правилом (M1-4 · PDO-55)` + `visual-freeze`, Main Regression.

---

## Частина E — Бриф M1

### Task E1: Записи й рішення власника

**Files:** поза репозиторієм (артефакт + PDF); у репозиторій — нічого.

- [ ] **Step 1:** записи Playwright `recordVideo` з локальних збірок `main` і гілок B, D: 1440×900 і iPhone 12 (390×844) — `/pro-nas`, `/yak-pratsyuiemo` (поява, фактори, аркуші змін, формати), `/metalokonstruktsii` (поява). Кожен запис — пара «до / після» з однаковим сценарієм прокрутки.
- [ ] **Step 2:** бриф-артефакт українською (палітра RUBIKON) + PDF: що змінюється й навіщо, записи, питання — OD-PX-34 (a) 2,2 с / (b) 3 с; підтвердження темпу появи 700 мс; ручна перевірка Lenis (M1-3) у Chrome і Safari — колесо, трекпад, клавіші, якорі.
- [ ] **Step 3:** відповіді власника → Task B4, D5.

---

## Готовність хвилі M1

- 4 PR змерджено власником; Main Regression зелений на `main`.
- `motion-tokens.test.ts` без `PENDING`; `cubic-bezier(` лише в `globals.css` `:root`.
- Запропонувати власнику оновлення control (CURRENT_CHECKPOINT: Motion v1 M1 done; DECISIONS: OD-PX-34 рішення) — лише після його OK.
