# Handoff · Claude Code: операційна модель, експорт DebugBear і пілот — щоденний PageSpeed після DebugBear

| | |
|---|---|
| Дата | 2026-10-27 |
| Виконавець | Claude Code |
| Підстава | Запит власника 27.10 «RUBIKON BUILD — Engineering Orchestration Setup» (кроки 1–6); підписка DebugBear завершується 27.10 |
| PR | Draft (номер — у PR). **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `claude/rubikon-orchestration-setup-shu64g` від `main` `9079f47`; пілот — гілка `ci/perf-monitor-pages` у worktree, влита `--no-ff` |
| Коміти | `9732dc3` експорт DebugBear · `6bb681b` CLAUDE.md, дозволи, хуки · `4d69cf4` агенти й скіли · `64512a1` локальний perf-стенд · `a39e01c` операційна модель, README, шаблон PR · `716fee9` → `e114fac` → `31fdf73` пілот і два раунди рев'ю · `0f58c1f` merge пілоту · далі — цей handoff і правки за рев'ю конфігурації |
| Змінено | `docs/performance/debugbear-2026-10-27/` (дані), `CLAUDE.md`, `.claude/{settings.json,hooks,agents,skills}`, `scripts/perf/{lab-lighthouse,trace-style-layout}.mjs` + тести, `tests/unit/claude-guard-hook.test.ts`, `.github/workflows/pagespeed-monitor.yml`, `docs/engineering/claude-code-operating-model.md`, `README.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `eslint.config.mjs` |
| Не змінено | Код застосунку (`app/`), CSS, тексти, дизайн, еталони, `lighthouserc.cjs`, `sonar-project.properties`, `playwright.config.ts`, `scripts/perf/pagespeed.mjs`, залежності (0 нових), налаштування Cloudflare і GitHub |

## Що було

- **Немає конфігурації Claude Code**: ні `CLAUDE.md`, ні `.claude/`. Правила власника жили лише в `AGENTS.md` (3 рядки) і handoff-ах;
  README і шаблон PR стверджували, що `typecheck` немає (є з Fast Gate), README — що Lighthouse робить 3 прогони, 2 маршрути, LCP 5,75 с
  (насправді 5, 3 профілі, 6,1 с) і що еталони оновлюються локально (DEC-18: лише з артефакту CI).
- **DebugBear** (проєкт 108814) — єдиний щоденний сигнал продуктивності для 10 сторінок × 2 пристрої; підписка закінчується 27.10.
  У репозиторії — `pagespeed-monitor.yml` лише для HOME (після деплою і раз на тиждень).
- **Хмарні сесії Claude не могли запустити e2e**: Playwright 1.62.1 чекає chromium-1234, образ має 1243, `cdn.playwright.dev` недоступний.

## Що зроблено

### 1. Експорт DebugBear (першим, до будь-яких правок)

`docs/performance/debugbear-2026-10-27/` (1,3 МБ): 485 синтетичних прогонів 13–27.10 (37 ключових колонок у CSV, усі 152 у gzip),
22 quick tests, 27 повних Lighthouse 13.5 JSON (останній прогін кожної сторінки + перший для 6 ключових), README з висновками.
RUM не був підключений; CrUX порожній (замало трафіку); анотацій немає.

### 2. Операційна модель — `docs/engineering/claude-code-operating-model.md`

- `CLAUDE.md` (~70 рядків, `@AGENTS.md` першим).
- Агенти: `perf-investigator`, `ci-triage` (Sonar + QA + cross-browser), `reviewer` — без правок; `implementer` — `isolation: worktree`.
- Скіли: `/task`, `/targeted-tests`, `/handoff`, `/perf-lab`.
- Хуки: `guard-owner-actions.sh` → `guard_owner_actions.py` — перед merge, push у main, deploy, секретами, D1 remote, rulesets,
  еталонами, бюджетами, Sonar і зміною самого запобіжника питає підтвердження людини (AGENTS.md дозволяє merge/deploy на явний
  запит, тож не блокує); `session-start.sh` (хмара: залежності + Chromium). Дозволи: deny — MCP merge, auto-merge і прямі записи
  файлів через MCP, секретні файли; allow — стандартні локальні команди й GitHub MCP на читання.
- `eslint.config.mjs` і `.gitignore`: `.claude/worktrees/` (ESLint головного checkout лінтував 510 файлів чужого worktree).

### 3. Пілот

**Вибір.** З доказів дня найбільший ефект при найменшій зміні — безперервність production-моніторингу: з 28.10 9 з 10
шляхів, які щодня міряв DebugBear, лишалися без жодного сигналу, а саме на них (сторінки напрямів) мобільний LCP за два тижні
змінився найбільше (4,8–5,6 с → 2,1–2,5 с). Перед цим перевірено й **відхилено** дві perf-гіпотези (нижче) — так система
спрацювала як фільтр: PR, що «прибирав forced reflow», не з'явився, бо не дав користі.

**Root cause.** Монітор у репозиторії свідомо однсторінковий (квота PSI, 6 викликів на запуск); багатосторінковий щоденний вимір
було делеговано DebugBear, тож з кінцем підписки сигнал зникає.

**Implementation** (`.github/workflows/pagespeed-monitor.yml`, скрипт `pagespeed.mjs` без змін): щоденний `schedule` проходить
`PSI_DAILY_PAGES` — по сторінці на шаблон: `/` (mobile + desktop), `/angary`, `/zernoskhovyshcha`, `/pro-nas`, `/napryamky`,
`/yak-pratsyuiemo`, `/metalokonstruktsii` (mobile); по черзі, 9 хв на форм-фактор (HOME 18), невиміряна сторінка — рядок у підсумку
і червоний запуск після решти; деплой і ручний запуск — як були; щоденний прогін в окремій групі concurrency.

**До / після**

| | До (з 28.10, без DebugBear) | Після |
|---|---|---|
| Шляхів зі щоденним production-сигналом | 0 (DebugBear до 27.10: 10 × 2 пристрої) | 7 (HOME × 2 + 6 × mobile) |
| Шаблонів сторінок без сигналу | 6 з 7 | 0 (`/polityka-konfidentsiinosti` свідомо поза — текст, 0,97–1,00) |
| HOME | після деплою + раз на тиждень | після деплою + щодня |
| Викликів PSI | 6 на тиждень + 6 на деплой | 24 на день + 6 на деплой (квота PSI — 25 000/день) |
| Тривалість | — | звичайний день ~15 хв; найгірший випадок обмежено 72 хв сторінок / 80 хв job |

Базова лінія для перших щоденних результатів — `docs/performance/debugbear-2026-10-27/README.md` (інший інструмент: PSI — Lighthouse 13
з симуляцією, DebugBear — реальне тротлінгування; порівнювати тренди, не абсолютні числа).

**Independent review пілоту.** Два раунди окремого субагента-рецензента у свіжому контексті:
1. `716fee9` → approve-with-changes: група concurrency на кожну подію ламала взаємне скасування деплою і ручного запуску (суперечило
   коміту); ліміт job 45 хв обривав список при збої PSI; 4 неточності в коментарі (планувальника на `/zernoskhovyshcha` немає з 06.10,
   10 сторінок, а не 11, діапазон desktop, мовчки пропущена сторінка політики). Виправлено в `e114fac`.
2. `e114fac` → approve-with-changes: 6 хв на форм-фактор менше за власні повтори скрипта (3 × 120 с) — повільний, але живий PSI вбивав
   сторінку з уже виміряними прогонами; рядок підсумку зливався з попереднім блоком. Виправлено в `31fdf73`.

### 4. Рев'ю конфігурації Claude Code

Окремий рецензент (свіжий контекст, 15 хв, офлайн-перевірки) на коміти `6bb681b`…`a39e01c`: блокерів немає, CI зелений; 10
should-fix, усі виправлено наступним комітом:

| Знахідка | Виправлення |
|---|---|
| Хук пропускав `git push` без гілки на main, `--all`/`--mirror`, `(… main)`, `main>/dev/null`, перенесення рядка; heredoc ховав решту першого рядка; апостроф у «рев'ю» ламав розбір лапок; `bash -c`/`eval`, GraphQL- і REST-merge; `npx @vinext/cloudflare deploy` | Логіка в `guard_owner_actions.py`: розбір як в оболонці, рекурсія в `bash -c`/`eval`, поточна гілка для `git push` без refspec, нові форми deploy і merge; 66 тестів, серед них усі випадки рецензента |
| Без `jq`/Python або на дуже довгій команді хук пропускав виклик | Python читає stdin сам; обгортка без Python питає на все, що схоже на дію власника |
| MCP `push_files`/`create_or_update_file`/`delete_file` у `main` повз хук | deny |
| `sed -i` / `cp` / `>` у `lighthouserc.cjs`, Sonar, еталони; сам запобіжник не захищений | хук питає й на ці форми; `.claude/settings.json` і `.claude/hooks/` — теж |
| allow `git diff*`/`git log*`/`git fetch*` виконують код і пишуть файли (`difftool -x`, `--output=`, `--upload-pack`) | прибрано; лишились `git status`, `git worktree list` |
| «CI і так запустить повний e2e» — неправда: PR Gate його не запускає | виправлено в `/targeted-tests`, CLAUDE.md, шаблоні PR |
| Блок merge суперечив AGENTS.md (merge на явний запит) | хук питає, а не блокує |
| Профіль `devtools` названо «профілем DebugBear» | названо каліброваним; перерахунок Lighthouse (562,5 мс на запит) дав тут 8,5 с проти 3,57 с production — задокументовано |
| Дрібне: stdout `pnpm` у контексті сесії, не та ревізія Chromium, `lsof` без `-sTCP:LISTEN`, «#257» в агенті, шлях `node_modules` з пробілами, база гілки implementer, «немає темної теми» в шаблоні PR | виправлено |

Хибні спрацювання першої версії (`gh ruleset list`, `wrangler secret list`, гілка `fix/merge-x`) теж прибрано й покрито тестами.

## Відхилені гіпотези (не повторювати без нового доказу)

Мобільна HOME, локальна production-збірка, профіль DebugBear Mobile, 5 прогонів, медіана (`/perf-lab`).

| Гіпотеза | Результат |
|---|---|
| Примусові перерахунки стилю під час гідратації (`useRoom` у `useLabelFit.ts`, `window.innerHeight` у `ProcessMotion`) — причина TBT | Правка прибрала їх: forced 239 → 157 мс, але стиль + розкладка 783 → 791 мс, блокування 775 → 756 мс (шум). Перший перерахунок після гідратації платить той, хто першим читає розкладку. Відхилено |
| `body:has(...)` змушує перераховувати все дерево | Одноразова збірка без них: 780 мс проти 783. Відхилено |
| LCP-зображення чекає за ~45 модульними скриптами (у production його TTFB 900 мс) | Не перевірено: локальний HTTP/1.1 не відтворює HTTP/3-пріоритети Cloudflare; потрібен вимір на preview. У беклозі |

## Перевірка

| Перевірка | Команда / прогін | Результат |
|---|---|---|
| Lint | `pnpm lint` | ✓ |
| Typecheck | `pnpm typecheck` | ✓ |
| Unit | `pnpm test:unit` | 100 файлів, 1614 тестів ✓ |
| Нові тести | `vitest run tests/unit/claude-guard-hook.test.ts tests/unit/perf` | 66 + 26 ✓ |
| Critical e2e у хмарній сесії (через Chromium з SessionStart-хука) | `PLAYWRIGHT_USE_PRODUCTION_BUILD=true pnpm test:e2e:critical` | 60 passed |
| SessionStart-хук | `CLAUDE_CODE_REMOTE=true .claude/hooks/session-start.sh`, двічі; без `CLAUDE_CODE_REMOTE` | ✓ ідемпотентний; локально нічого не робить |
| Workflow: YAML | pyyaml | ✓ |
| Workflow: усі гілки кроку | витягнутий `run:` з shim-ом `node`, без ключа PSI: schedule / push / workflow_dispatch; падіння однієї сторінки; зависання понад ліміт | 7 / 1 / 1 викликів з тими самими аргументами, що до зміни для push і dispatch; падіння й зависання — усі 7 сторінок пройдено, exit 1, рядок у підсумку |
| `pagespeed.mjs` | `vitest run tests/unit/perf/pagespeed.test.ts` | 20 ✓ (скрипт не змінено) |
| actionlint | — | **не запущено**: завантаження бінарника заблоковане в сесії; компенсовано розбором YAML, прогоном усіх гілок і двома рев'ю |
| Реальний виклик PSI | — | **не запущено** (ключа в сесії немає); перший щоденний прогін після merge — 05:30 UTC наступного дня |

CI: зміна `.github/workflows/` — зона «CI infrastructure», тож PR Gate вибере всі набори (так задумано в `classify-changes.mjs`).

## Еталони

Не змінювались.

## Успадковані червоні перевірки

Nightly Full QA на `main` `9079f47` (27.10, run 40469586629); Main Regression на тому ж коміті зелений. Розбір — агент `ci-triage`
(перший реальний запуск ролі), без правок:

- **Lighthouse (standard, `/angary`)**: медіана Performance 0.69 (< 0.70), LCP 6192 мс (> 6100). Бюджет без запасу й раніше (Nightly
  #49 і #45 падали з 0.69 / 6118–6138 мс), але після #256 (M1-1) LCP стабільно ~6180–6200 мс проти ~6120–6140: зсув ≈ +50–90 мс.
  Ймовірна причина за handoff M1-1 — +1,2 КБ gzip CSS, що блокує рендер на `/angary` (57 019 → 58 252 B); рішення власника там уже
  запитане. Бюджет не послаблювати.
- **E2E 2/4**: `tests/e2e/home-proof-contour.spec.ts:2054` [desktop-chromium], `expect(frame.t - run).toBeLessThan(900)` дав 909,9;
  пройшов з повтору, тож червоний через `failOnFlakyTests`. Відомий з #252 (`docs/handoffs/2026-10-26-main-red-after-252.md`).
  Локально `--repeat-each=5 --retries=0`: desktop 3/5 червоні, mobile 5/5 зелені. Причина: тест рахує від таймера `SWEEP_AT`
  (`run − on` = 351 мс завжди), а перехід обкладинки стартує з першого кадру після довгого кадру 116–201 мс одразу після `on`
  (`transitionstart` через 289–368 мс замість ~150). Найменше виправлення: у `recordArrival` (~рядок 630) записувати фактичний старт
  переходу і рахувати межу 900 мс від нього; окремо знайти довге завдання в момент появи листа (`/perf-lab`). Межу не піднімати.

Sonar quality gate на `main` червоний — його лагодить #257.

## Рішення власника 28.10

- **Погоджено напрямок**: операційна модель Claude Code, архів DebugBear і щоденний PageSpeed як початковий пілот. Це погодження
  підходу, **не дозвіл на merge чи production deploy** — їх власник дасть окремо.
- **Один PR** на всі три частини; **без додаткового рефакторингу** в ньому.
- **Lighthouse-бюджети й правила Sonar — без послаблення.** У цьому PR не змінені: `git diff origin/main...HEAD` по
  `lighthouserc.cjs`, `sonar-project.properties`, `playwright.config.ts`, `vitest.config.ts` — порожній.
- **Наступні технічні пріоритети**: (1) нестабільний HOME E2E — `tests/e2e/home-proof-contour.spec.ts:2054`; (2) Performance/LCP
  `/angary` (Nightly: 0.69 і 6192 мс при бюджеті 0.70 і 6100 мс). Розбір обох — «Успадковані червоні перевірки» вище.

## Перевірки перед merge (запит власника 28.10)

### 1. Чи обов'язковий `PR Gate`

Перевірено 28.10 публічним REST API GitHub, лише читання; налаштування не змінювались.

| Механізм | Що застосовано до `main` | `PR Gate` обов'язковий? |
|---|---|---|
| Ruleset `Protect main` (id 21852505, active, ціль `~DEFAULT_BRANCH`) | `deletion`, `non_fast_forward`, `required_linear_history`, `pull_request` (0 схвалень, обов'язкове розв'язання тредів, лише squash) | **Ні** — правила `required_status_checks` немає |
| Інші rulesets, зокрема батьківські (`/rules/branches/main`, `includes_parents=true`) | лише правила з `Protect main` | **Ні** |
| Класичний branch protection (`/branches/main`) | `protection.enabled: false`, `required_status_checks.enforcement_level: off`, `contexts: []` | **Ні** |

**Висновок:** `PR Gate` зараз не обов'язковий жодним механізмом — PR з червоним або відсутнім `PR Gate` технічно можна злити;
зелений CI тримається лише на дисципліні. Крок «Required context» з `docs/ci-tier-model.md` (одна обов'язкова перевірка
`PR Gate`) не виконано. Увімкнути безпечно: `pr-gate.yml` не має фільтра шляхів, а агрегатор `if: always()` звітує на кожному PR до
`main`, тож PR лише з документами не застрягне. Рекомендація власнику (дія власника, не агента): у `Protect main` додати
«Require status checks to pass» з контекстом `PR Gate` і джерелом GitHub Actions. Зауваження: публічний API показує
`bypass_actors: []`; якщо обхід справді нікому не дозволено, червоний `PR Gate` блокуватиме merge і власнику.

### 2. Python-запобіжник — не межа безпеки

Підтверджено. `guard_owner_actions.py` — запобіжник від чесних помилок агента: розпізнає типові форми команд (66 тестів) і просить
підтвердження людини; обійти його можна (інший інтерпретатор, згенерований скрипт, змінні оболонки), і він працює лише в сесіях Claude
Code з цим репозиторієм. Справжні межі — на сервері: ruleset `Protect main` (без прямого push, force-push і видалення `main`; merge
лише через PR зі squash і розв'язаними тредами) і доступи Cloudflare. CI-перевірки до них зараз **не** належать (п. 1).

### 3. Щоденний PageSpeed ще не перевірений реальним запуском

Зафіксовано: перевірено лише розбором YAML, прогоном витягнутого кроку для schedule/push/dispatch (з падінням і зависанням сторінки)
і двома рев'ю; actionlint і реальні виклики PSI не запускались. Контроль після merge — перший щоденний прогін (05:30 UTC наступного
дня), відповідальний — сесія, що веде наступну perf-задачу:

- [ ] запуск завершився зеленим, тривалість у межах ~15 хв (ліміт job — 80);
- [ ] у Step Summary 7 блоків, без рядків «incomplete»; в артефакті `pagespeed-*` — 7 тек `psi-results/<сторінка>/`;
- [ ] у логах немає помилок квоти чи ключа PSI;
- [ ] медіани мобільних сторінок порівняно з трендом DebugBear (`docs/performance/debugbear-2026-10-27/README.md`; інший інструмент — порівнювати тренд, не абсолют);
- [ ] найближчий запуск після деплою на `main` (HOME, mobile + desktop) поводиться як до зміни.

Будь-який пункт червоний — окрема задача через `/task`, не правка «на льоту».

### 4. Бюджети й Sonar — без послаблення

Див. «Рішення власника 28.10»: файли бюджетів, Sonar і конфіги тестів у PR не змінені; `lighthouserc.cjs` і
`sonar-project.properties` додатково захищені запобіжником (запит підтвердження на будь-яку зміну).

### 5. Наступні пріоритети

Зафіксовано в «Рішення власника 28.10». Перші кроки за моделлю: HOME E2E — план від `ci-triage` уже є (міряти межу 900 мс від
`transitionstart`, межу не змінювати; окремо знайти довге завдання на появі листа); `/angary` — `perf-investigator` з базовою лінією
на `/perf-lab` і рішенням власника щодо +1,2 КБ CSS з handoff M1-1. Кожен — окремий PR від свіжого `main`.

## Ризики

- Хук-guard — запобіжник, не межа безпеки: ловить типові форми команд (66 тестів), а не будь-яку можливу. Межа — Ruleset на `main`
  (прямий push, force-push, видалення, merge лише через PR); обов'язкових CI-перевірок у ньому зараз немає.
- Хук може запитати підтвердження на нетипову, але легітимну команду — запит пояснює причину; правка — в одному файлі з тестами
  (і сама правка запобіжника теж проходить через підтвердження).
- Щоденний PSI додає 24 виклики на день; деплой, що збігся з HOME у щоденному прогоні, може отримати кешований аналіз старого коду (описано в коментарі workflow).

## Що перевірити власнику

1. Чи відповідає модель Engineering Excellence Master Brief v1.0 — у цій сесії Brief недоступний (не в репозиторії; `rubikon-control` не підключений).
2. `CLAUDE.md` → «Лише з OK власника»: чи повний список.
3. Перелік щоденних сторінок і час запуску (05:30 UTC = 07:30/08:30 Київ).
4. Чи вмикати обов'язкову перевірку `PR Gate` у `Protect main` (п. 1 перевірок) — налаштування GitHub змінює лише власник.

## Відкат

`git revert` merge-коміту PR. Без побічних ефектів: дані й конфігурація; workflow повертається до HOME-only.

## Пропоновані оновлення control (лише після OK)

- DECISIONS: «Claude Code: операційна модель з `docs/engineering/claude-code-operating-model.md` (агенти, скіли, хуки, worktree) — APPROVED/…».
- CURRENT_CHECKPOINT: DebugBear завершено 27.10, історія — `docs/performance/debugbear-2026-10-27/`; production-сигнал — `pagespeed-monitor.yml` щодня (перший реальний запуск — після merge, контроль за чеклістом вище).
- DECISIONS (28.10): напрямок операційної моделі, архів DebugBear і щоденний PageSpeed-пілот погоджено; merge і deploy — окремим OK. Пріоритети: HOME E2E `home-proof-contour.spec.ts:2054`, потім Performance/LCP `/angary`.
- Відкрите питання: `PR Gate` не обов'язковий ні ruleset-ом, ні класичним branch protection (перевірено 28.10).
