# Handoff · CI reliability: телефонний тест теми та «socket hang up» в API-запитах e2e (PR #195)

| | |
|---|---|
| Дата | 2026-10-15 |
| Виконавець | Claude Code (діагностика, реалізація, перевірка) |
| Рев'ю | ChatGPT (незалежне, через GitHub), Дмитро (рішення) |
| PR | https://github.com/leusd100/rubikon-build/pull/195 · **Draft**. **Merge і deploy не виконувались і не дозволені**; merge = production deploy, лише за окремим OK Дмитра |
| Гілка | `test/ci-reliability-theme-keepalive` |
| Base | `main` `9800b28` (#193) |
| Код | `fa7e1af` (тести, helper, guard); handoff — окремим комітом |
| Статус | IMPLEMENTED у гілці · REVIEW-READY · не злито, не розгорнуто |
| Рішення | Не потрібне: змінено лише тести. `app/`, baseline-и, `playwright.config.ts`, workflows, retries, timeout, `failOnFlakyTests` не змінено |

Цей файл — канонічний handoff для обох агентів. Приватних даних у ньому немає: репозиторій публічний.

## 1. Мета й обсяг

Stage 01 (15.10) зафіксував два збої поточного `main`: S01-01 (CI-01) і S01-02 (CI-02). Завдання цього PR — встановити причину кожного й виправити найменшою коректною зміною. Заборонено: вимикати тести, підвищувати timeout, додавати retries, послаблювати перевірки, оновлювати baseline-и та змінювати застосунок, якщо причина в тестовому середовищі.

| ID | Тест | Симптом у CI | Частота |
|---|---|---|---|
| CI-01 | `tests/e2e/directions-hero-sequence.spec.ts:124` «changing theme while the carousel is paused preserves the slide and pause state», `mobile-chromium` | `locator.click: Test timeout of 30000ms exceeded … waiting for getByRole('switch', { name: 'Темна тема' })` у всіх 3 спробах | **7 з 7** прогонів main від `c03bd8f` (13.10): Main Regression на `c03bd8f`, `c6f8654`, `270e54c`, `ec2e358`, `9800b28`; Nightly на `c03bd8f`, `270e54c` |
| CI-02 | `tests/e2e/grain-page.spec.ts:152` «related directions … every link resolves», `desktop-chromium` | `apiRequestContext.get: socket hang up` на `GET http://127.0.0.1:4173/betonni-roboty`; retry пройшов; `failOnFlakyTests` → exit 1 | 2 скидання з'єднання у ~230 невдалих E2E-jobs з 02.10 (10.10 `b029047`, 15.10 `9800b28`) |

## 2. CI-01 — причина

- Тест додано в #190 (`c03bd8f`). Він натискав `getByRole('switch', { name: 'Темна тема' })` — перемикач у шапці для ноутбука.
- На телефоні цей перемикач приховано навмисно (`ThemeSwitch` у `SiteChrome.tsx`). Тема змінюється в мобільному меню (`ThemeOptions variant="menu"`).
- Тому `mobile-chromium` чекав на прихований елемент до 30-секундного таймауту. На `desktop-chromium` тест проходив.
- Це дефект тесту, а не застосунку. Stage 01 окремо перевірив на живому сайті шлях «меню → Темна» зі збереженням паузи й слайда (Chrome і WebKit, 390 px).

**Виправлення.** Локальний helper `chooseTheme(page, theme)` діє як `choose()` у `theme.spec.ts`:
- якщо перемикач видимий, натискає його;
- інакше відкриває `.mobile-menu` і обирає «Темна» або «Світла» в `.theme-options`.

Перевірки після перемикання (`data-art-theme`, `complete && naturalWidth > 0`, `currentSrc` потрібної серії, `is-active`, кнопка «Відтворити показ напрямів») не змінено. Без `force`, без `skip`.

## 3. CI-02 — причина

**Ланцюжок, встановлений за кодом і вимірами:**

1. Playwright 1.62.1 надсилає кожен API-запит з Node (`request`, `page.request`) через один process-wide агент `httpHappyEyeballsAgent` з `keepAlive: true` і без власного `timeout` (`playwright-core/lib/coreBundle.js`, `_sendRequest`). Пул спільний для всіх тестів worker-а.
2. Сервер підказує час простою: `Keep-Alive: timeout=5`. Але `http.Agent.keepSocketAlive` у Node 24 застосовує підказку лише тоді, коли вона менша за `options.timeout` агента. Тут цей timeout 0, тож підказку проігноровано, і сокет лежить у пулі, доки його не закриє сервер.
3. Тестовий сервер — `vinext start`, тобто звичайний `http.createServer` Node 24 без власних налаштувань: `keepAliveTimeout` 5000, `keepAliveTimeoutBuffer` 1000. Виміряно сирим TCP на збірці main `9800b28`: простійне з'єднання сервер закриває через **6 002–6 004 мс** після останнього байта відповіді.
4. Хронологія невдалого worker-а (blob report run 38713909898, shard 2/4):
   - `w1` виконав `grain-page.spec.ts:63`, де `page.request.get(GRAIN_PAGE)` (рядок 79) — останній Node-запит. Тест почався о 09:36:22.573 і тривав 1900 мс.
   - Невдалий `request.get('/betonni-roboty')` у `:152` стартував о **09:36:30.181**, тобто приблизно через 6 с після запиту `:79`, у момент закриття сокета сервером.
   - Інших Node-запитів у `w1` між ними не було.
5. Коли сервер на 2-vCPU runner-і, поділеному з двома Chromium, у цей момент не отримує процесор, таймер закриття спрацьовує вже після того, як GET прийшов на старий сокет. Клієнт отримує скидання з'єднання.

**Відтворення.** Скрипти й виводи — в архіві, §6.

| Модель | Пул (як зараз) | `Connection: close` |
|---|---|---|
| `vinext start` main `9800b28`, macOS, Node 24.20: сервер `SIGSTOP` з +5990 до +6060 мс, GET на +6010…+6030 мс | `read ECONNRESET` **4/4**; GET на +5991 мс — 200 | **200 у 5/5** |
| Linux (`mcr.microsoft.com/playwright:v1.62.1-noble`, Node 24.18), окремий процес-сервер Node з налаштуваннями за замовчуванням, та сама схема | `read ECONNRESET` **5/5** | **200 у 5/5** |
| `vinext start`, той самий клієнт без зупинки сервера (крок 5 мс, 5935–6010 мс) | 200 у 16/16: на вільному сервері гонка не виникає | — |

Обмеження: у CI повідомлення — `socket hang up`, у моделі — `read ECONNRESET`. Обидва мають код Node `ECONNRESET` і відрізняються лише тим, який TCP-сегмент клієнт прочитав першим. Точну мить зупинки сервера в CI не записано; вона випливає з хронології (п. 4) і моделі. Статус причини: **механізм CONFIRMED, CI-хронологія узгоджується (LIKELY для конкретного прогону)**.

**Виправлення.**
- `tests/e2e/server.helpers.ts` → `getFromServer(request, url)` = `request.get(url, { headers: { connection: 'close' } })`. Жоден такий запит не йде старим сокетом і не залишає сокет у пулі.
- Скидання на свіжому з'єднанні, як і раніше, валить тест: це не retry.
- Через helper тепер ідуть усі 10 Node-запитів у 6 файлах: `brand-logo-visual`, `configurator-sheet`, `grain-page` ×3, `grain-planner` ×2, `home-proof-contour`, `pr-critical` ×2.
- Guard `tests/unit/e2e-server-requests.test.ts` (Vitest, PR Fast Gate) забороняє прямі `request.(get|head|fetch|post|put|patch|delete)(` у `tests/e2e`, крім helper-а.
  - На main `9800b28` guard червоний 2/2: знаходить усі 10 викликів.
  - На `fa7e1af` guard зелений.

Чому не інакше:
- retry (`maxRetries`) приховав би й справжнє скидання сервером;
- більший timeout не впливає на мить закриття;
- `extraHTTPHeaders` у config змінив би й трафік браузера;
- `keepAliveTimeout` сервера задає `vinext start`, і його зміна торкнулася б застосунку.

## 4. Результати перевірки

Сервер — production-збірка main `9800b28` (`vinext build` + `vinext start`, 127.0.0.1:4391). Тести — Linux, образ Playwright v1.62.1-noble, `CI=1` (retries 2 і `failOnFlakyTests`, як в Actions), 2 workers.

| Прогін | Результат |
|---|---|
| CI-01 на main `9800b28` (`:124`, desktop + mobile) | desktop ✓; mobile ✘ ×3 (`waiting for getByRole('switch', { name: 'Темна тема' })`) — ідентично CI |
| CI-01 на `fa7e1af` (`:140`, `--repeat-each=5`) | **10/10** (5 desktop, 5 mobile) |
| Шість змінених файлів: `directions-hero-sequence`, `grain-page`, `grain-planner`, `pr-critical`, `configurator-sheet`, `home-proof-contour` (desktop + mobile) | **323 passed, 53 skipped, 0 failed, 0 flaky** (13,7 хв) |
| `brand-logo-visual.spec.ts` (visual-chromium) | 8/8 |
| `tsc --noEmit --incremental false`, `eslint tests/e2e`, `vitest` (guard + `e2e-google-intercept`) | чисто; 9/9 |

Пропуски (53) — наявні `test.skip` за проєктом (desktop-only / mobile-only), не нові.

## 5. Ризики й межі

- Зміна лише в тестах; поведінка сайту, URL, тексти й baseline-и не змінюються.
- `Connection: close` додає один TCP-handshake на loopback на кожен із 10 запитів: це мікросекунди.
- Повний Main Regression на гілці не запускався: це робить CI після push. Перший зелений Main Regression можливий лише після merge (окремий OK).
- Окремо від цього PR у Nightly 15.10 є третій нестабільний тест: `home-proof-contour.spec.ts:1171` (desktop, порядок підсвічування легенди, `1` ↔ `0.14`). Його не досліджено й не змінено. Він винесений у follow-up.

## 6. Докази

Архів поза git: `~/Documents/RUBIKON-archive/research/ci/2026-10-15-ci-reliability-theme-keepalive/` (`SHA256SUMS.txt`).

- `ci-logs/` — повні логи jobs 116352177576 (CI-01) і 116352177586 (CI-02);
- `ci02-trace/` — trace невдалої спроби (розпакований), `report.jsonl` shard 2/4, `worker-timeline.txt`;
- `ci02-race/` — скрипти моделей (`race-starved.cjs`, `linux-*`, `idle-close.cjs`, `race*.cjs`) і їхні виводи;
- `ci01-runs/` — результати Playwright на main і гілці;
- `history/` — скан невдалих E2E-jobs з 02.10 (`history.tsv`, `scan.py`);
- `branch-runs/` — логи прогонів змінених файлів.

## 7. Пропоновані оновлення control (лише після OK Дмитра)

- `CURRENT_CHECKPOINT`: CI-01 і CI-02 — причини встановлено, виправлення в PR #195 (draft), merge очікує OK.
- Ledger Stage 01: S01-01 → FIX IN PR; S01-02 → ROOT CAUSE CONFIRMED (механізм), FIX IN PR.
