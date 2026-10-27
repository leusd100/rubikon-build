@AGENTS.md

# RUBIKON BUILD — правила для Claude Code

Сайт rubikonbuild.com: vinext (Next-сумісний API на Vite) → Cloudflare Workers, D1 для заявок. Стек і структура — `README.md`.
Ролі: **Дмитро** вирішує, **ChatGPT** структурує рішення й дає незалежне рев'ю в PR, **Claude** — критичне рев'ю й реалізація
(`docs/working-principles.md`). Повна модель роботи з Claude Code і її обґрунтування — `docs/engineering/claude-code-operating-model.md`.

## Лише з OK власника

Не роби без окремого, конкретного дозволу Дмитра саме на цю дію (AGENTS.md). Хук `.claude/hooks/guard-owner-actions.sh`
для частини з них показує запит на підтвердження з причиною — підтверджує лише людина:

- merge будь-якого PR і будь-який push у `main` (DEC-30); production deploy (`wrangler`, `vinext deploy`), секрети, D1 `--remote`;
- зміни Cloudflare (Dashboard, зони, Workers Builds) і GitHub Rulesets / branch protection;
- оновлення візуальних еталонів — лише переглянутий diff, Linux-PNG лише з артефакту CI того самого коміту (DEC-18, `docs/ci-tier-model.md`);
- послаблення тестів, Lighthouse-бюджетів (`lighthouserc.cjs`), правил і обсягу Sonar (`sonar-project.properties`), security-правил (CSP, consent);
- зміна затвердженого дизайну, текстів (`app/data/deliveryModel.ts` — дослівно), governance-рішень; нові залежності;
- видалення коду, мертвість якого не доведена (пошук посилань + зелені тести + згода);
- зміна самого запобіжника — `.claude/settings.json`, `.claude/hooks/`.

Push своєї гілки і Draft PR — дозволені й очікувані; вони не є дозволом на merge чи deploy. Хук ловить типові форми
команд, а не будь-які: правило діє й там, де він мовчить.

## Як іде кожна задача

Evidence → Root Cause → Plan → Isolated Implementation → Targeted Tests → Independent Review → Owner Approval — скіл `/task`.
Гіпотезу спершу пробуй спростувати експериментом; відхилена гіпотеза з цифрами — теж результат і без PR.

## Команди

```bash
pnpm install                     # Node ≥ 22.13 (CI: Node 24)
pnpm lint && pnpm typecheck && pnpm test:unit && pnpm build      # Fast Gate, як у CI
PLAYWRIGHT_USE_PRODUCTION_BUILD=true pnpm test:e2e:critical       # після pnpm build
pnpm exec playwright test --project=desktop-chromium tests/e2e/<spec>.ts [--grep '…'] [--repeat-each=3 --retries=0]
pnpm test:lighthouse             # бюджети Nightly; локальний вимір — скіл /perf-lab
```

Які набори запускати для diff — скіл `/targeted-tests` (той самий класифікатор, що в PR Gate). Повний `pnpm test:e2e` PR Gate
не запускає (лише Main Regression після merge і Nightly); локально — коли змінюєш саму інфраструктуру тестів (`playwright.config.ts`,
спільні помічники e2e). Флейк — дефект, не привід для повтору (`docs/ci-tier-model.md` → Flaky-test policy).

## Гілки, коміти, PR

- Гілка від свіжого `origin/main`, префікс за суттю: `fix/` `perf/` `refactor/` `ci/` `test/` `docs/` `design/` (для `design/` —
  режим prototype/freeze, `docs/ci-tier-model.md`). Без stacked PR.
- Коміти, PR і handoff — українською з англійським Conventional-префіксом: `perf(scroll): Lenis у спокої (M1-3 · PDO-95)`;
  коментарі в коді — англійською, пояснюють «чому» з посиланням на доказ.
- PR відкривається як Draft за `.github/PULL_REQUEST_TEMPLATE.md`; разом — handoff `docs/handoffs/YYYY-MM-DD-<тема>.md` (скіл `/handoff`).
- Репозиторій публічний: жодних значень секретів, лише назви біндингів (`DB`, `IP_HASH_SALT`, `TELEGRAM_*`).

## Worktree і паралельна робота

- Одна задача = один worktree = одна гілка: `.claude/worktrees/<префікс>-<тема>` ↔ гілка `<префікс>/<тема>`
  (напр. `.claude/worktrees/ci-perf-monitor-pages` ↔ `ci/perf-monitor-pages`). Залежності — симлінк на `node_modules` головного checkout.
- Паралельно — лише задачі з **непересічними файлами**. Перед стартом другої задачі порівняй списки файлів у планах; спільні
  «гарячі» файли (`app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `app/data/*`, `playwright.config.ts`, workflows,
  `scripts/ci/*`) змінює одна сесія за раз. Класифікатор CI підкаже, які зони зачіпає кожна.
- Сервери — кожна збірка на своєму порту (e2e завжди 4173 — тож e2e двох worktree по черзі); зупиняй слухача порту після
  роботи: `lsof -ti tcp:<порт> -sTCP:LISTEN | xargs -r kill`.
- Субагенти: `perf-investigator`, `ci-triage`, `reviewer` — без правок; `implementer` — у власному worktree. Два агенти, що
  пишуть у ті самі файли, одночасно не запускаються.

## Відомі пастки

- e2e ніколи не ходять у Google: перехоплення — regex прямо в `context.route` (`tests/unit/e2e-google-intercept.test.ts`).
- Порт 4173 зайнятий → Playwright падає навмисно (`reuseExistingServer: false`); не обходь, звільни порт.
- Хмарна сесія: SessionStart-хук ставить залежності й вказує Playwright на передвстановлений Chromium (`PLAYWRIGHT_BROWSERS_PATH`).
- Візуальні еталони в хмарі можуть розходитися з CI-контейнером — авторитет лише CI.
- Продуктивність: RUM і CrUX немає (замало трафіку); історія — `docs/performance/debugbear-2026-10-27/`; production —
  `pagespeed-monitor.yml`; відхилені perf-гіпотези — у скілі `/perf-lab`, не повторюй їх.
- Рішення (DEC-*), реєстр PDO-* і чекпойнт живуть у приватному `rubikon-control`; тут лише посилання. Оновлення туди — лише пропозицією в handoff.
