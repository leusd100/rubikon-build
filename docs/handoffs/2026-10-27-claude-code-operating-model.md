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
- Хуки: `guard-owner-actions.sh` (блокує merge/push у main/deploy/D1 remote/rulesets; питає про еталони, force push, бюджети, Sonar);
  `session-start.sh` (хмара: залежності + Chromium). Дозволи: deny MCP merge і секретних файлів; allow — читання й стандартні команди.
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

**Independent review.** Два раунди окремого субагента-рецензента у свіжому контексті:
1. `716fee9` → approve-with-changes: група concurrency на кожну подію ламала взаємне скасування деплою і ручного запуску (суперечило
   коміту); ліміт job 45 хв обривав список при збої PSI; 4 неточності в коментарі (планувальника на `/zernoskhovyshcha` немає з 06.10,
   10 сторінок, а не 11, діапазон desktop, мовчки пропущена сторінка політики). Виправлено в `e114fac`.
2. `e114fac` → approve-with-changes: 6 хв на форм-фактор менше за власні повтори скрипта (3 × 120 с) — повільний, але живий PSI вбивав
   сторінку з уже виміряними прогонами; рядок підсумку зливався з попереднім блоком. Виправлено в `31fdf73`.

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
| Unit | `pnpm test:unit` | 100 файлів, 1577 тестів ✓ |
| Нові тести | `vitest run tests/unit/claude-guard-hook.test.ts tests/unit/perf` | 29 + 26 ✓ |
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

Nightly Full QA на `main` `9079f47` (27.10, run 40469586629): червоні **Lighthouse (standard)** і **Nightly E2E (2/4)**; Main
Regression на тому ж коміті зелений. Розбір — нижче (агент `ci-triage`). Sonar quality gate на `main` червоний — його лагодить #257.

## Ризики

- Хук-guard — запобіжник, не межа безпеки: ловить типові форми команд (29 тестів), а не будь-яку можливу. Межа — Ruleset на `main`.
- Хук може помилково заблокувати нетипову, але легітимну команду — повідомлення пояснює причину; правка — в одному файлі з тестами.
- Щоденний PSI додає 24 виклики на день; деплой, що збігся з HOME у щоденному прогоні, може отримати кешований аналіз старого коду (описано в коментарі workflow).

## Що перевірити власнику

1. Чи відповідає модель Engineering Excellence Master Brief v1.0 — у цій сесії Brief недоступний (не в репозиторії; `rubikon-control` не підключений).
2. `CLAUDE.md` → «Лише з OK власника»: чи повний список.
3. Перелік щоденних сторінок і час запуску (05:30 UTC = 07:30/08:30 Київ).

## Відкат

`git revert` merge-коміту PR. Без побічних ефектів: дані й конфігурація; workflow повертається до HOME-only.

## Пропоновані оновлення control (лише після OK)

- DECISIONS: «Claude Code: операційна модель з `docs/engineering/claude-code-operating-model.md` (агенти, скіли, хуки, worktree) — APPROVED/…».
- CURRENT_CHECKPOINT: DebugBear завершено 27.10, історія — `docs/performance/debugbear-2026-10-27/`; production-сигнал — `pagespeed-monitor.yml` щодня.
