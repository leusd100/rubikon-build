# Handoff · e2e-тести з дозволом аналітики більше не звертаються до Google (PR #194)

| | |
|---|---|
| Дата | 2026-10-15 |
| Виконавець | Claude Code (реалізація, перевірка) |
| Рев'ю | ChatGPT (незалежне, через GitHub), Дмитро (рішення) |
| PR | https://github.com/leusd100/rubikon-build/pull/194 · **Draft**. **Merge і deploy не виконувались і не дозволені**; merge = production deploy, лише за окремим OK Дмитра |
| Гілка | `test/e2e-intercept-google` |
| Base | `main` `270e54c` (#192) |
| Код | `505c9e1` (два тести, мертвий glob у `form.spec.ts`, guard); handoff — окремим комітом |
| Статус | IMPLEMENTED у гілці · REVIEW-READY · не злито, не розгорнуто |
| Рішення | Не потрібне: змінено лише тести. `app/`, CSP, налаштування GA4, ID і події не змінено, live-хітів під час перевірки не було |

Цей файл — канонічний handoff для обох агентів. Приватних даних у ньому немає: репозиторій публічний.

## 1. Мета й обсяг

Аналітичний трек Implementation Wave 01 (15.10, PR #193) показав, що двоє e2e-тестів дають згоду на аналітику й завантажують справжній gtag (`G-WYRXJV71WG`) з тестового хоста 127.0.0.1. Історично 544 з 595 сесій GA4 (15.08–25.09) прийшли з 127.0.0.1.

| Тест | Що було | Де йде |
|---|---|---|
| `tests/e2e/ux-conversion-phase2.spec.ts:202` «a tap on the call or a channel is still counted once, with its method» | Перехоплення Google немає взагалі | Main Regression, Nightly, PR Gate «Inquiry regression» (лише desktop: тест сам ставить `test.skip` на mobile) |
| `tests/e2e/first-contact.spec.ts:151` «each phone tap is one contact_click with method phone» | `page.route('**/googletagmanager.com/**', abort)` — glob не збігається з `www.googletagmanager.com` | Main Regression, Nightly (desktop + mobile) |

Завдання — лише тести. Обидва мають перехоплювати Google так само, як `consent.spec.ts:14-16`, і далі перевіряти `contact_click` у `dataLayer`.

Поза обсягом: production host guard (DEC-06), налаштування GA4, CSP, `app/`. Чи доходили хіти з CI до звітів GA4, не перевірено: доступу до звітів немає.

## 2. Чому glob не спрацьовував

У glob Playwright `**/googletagmanager.com/**` перед `googletagmanager.com` стоїть буквальний `/`. В адресі `https://www.googletagmanager.com/gtag/js?id=…` перед цим іменем стоїть `.` (`www.`), тож збігу немає. Маршрут ніколи не викликався, і скрипт ішов у мережу.

Те саме підтвердив прогін «до» (§5): запит `gtag/js` з тестового хоста дійшов до мережевого стеку Chrome.

## 3. Що змінено (`505c9e1`)

1. **Обидва тести** отримали `context` у фікстурах і першим рядком маршрут, дослівно як у `consent.spec.ts:15`:
   ```ts
   await context.route(/^https:\/\/[^/]*(?:google|doubleclick)[^/]*\//, (route) => route.fulfill({ status: 200, body: '' }));
   ```
   - Маршрут стоїть усередині кожного з двох тестів, а не в `beforeEach` файлу. Решта тестів у цих файлах дає відмову (`denied`) і gtag не вантажить. До того ж маршрут вимикає HTTP-кеш контексту, а цикл сторінок і вікон у `ux-conversion-phase2.spec.ts` не повинен від цього сповільнитися.
   - Перевірки `contact_click` / `contact_method` не змінено. Вони читають `window.dataLayer`, який створює наш власний код (`AnalyticsConsent.tsx`), тож gtag.js їм не потрібен.
2. **`tests/e2e/form.spec.ts:502`** — прибрано той самий мертвий glob. Запит і так перехоплював regex-маршрут із `beforeEach` файлу (рядок 48), тож поведінка не змінилась (§5, прогін «файли»).
3. **Guard `tests/unit/e2e-google-intercept.test.ts`** (Vitest, тобто PR Gate → Fast Gate → Unit tests):
   - знаходить spec, що дають згоду на аналітику (текст `'granted'` або «Прийняти все»), і перевіряє, що серед них є щонайменше `analytics-consent`, `consent`, `first-contact`, `form`, `ux-conversion-phase2`;
   - для кожного такого spec вимагає regex-маршрут, що покриває `www.googletagmanager.com/gtag/js`, `www.google-analytics.com/g/collect`, `region1.google-analytics.com/g/collect`, `stats.g.doubleclick.net/g/collect` і `www.google.com/ccm/collect`;
   - забороняє glob-маршрути з `google` / `doubleclick` у будь-якому spec.

   На main `270e54c` guard червоний (3 з 7): `first-contact` і `ux-conversion-phase2` без regex-маршруту, плюс два glob-и (`first-contact`, `form`). На `505c9e1` зелений (7 з 7).

## 4. Метод перевірки

- Сервер: production-збірка (`vinext build` + `vinext start`) цього дерева на 127.0.0.1:4397. Код застосунку збігається з main `270e54c`.
- Браузер: системний Chrome (`channel: 'chrome'`, на цьому Mac без нього не можна), 1 worker, `--retries 0`.
- Обгортка конфігурації поза репозиторієм (`harness/verify.config.ts` в архіві) використовує ті самі `devices` і проєкти, що й `playwright.config.ts`, і додає:
  - `--host-resolver-rules=MAP * 127.0.0.1, EXCLUDE localhost` — кожен зовнішній хост веде на закритий порт loopback, тож запит, що проскочив маршрут, не може дійти до Google навіть у прогоні «до»;
  - `--log-net-log` — Chrome NetLog, тобто записи самого мережевого стеку;
  - `trace: 'on'` — trace Playwright для кожного тесту.
- Підрахунок (`harness/analyze.py`):
  - **запит з тестового хоста** — подія NetLog `URL_REQUEST_START_JOB` з адресою Google і `initiator` = `http://127.0.0.1:4397`;
  - окремо рахуються всі події NetLog, що згадують хости GTM / GA / doubleclick, і записи Google в trace (статус, `_failureText`, `_wasFulfilled`).

## 5. Результати

### 5.1 Два тести: до (`270e54c`) і після (`505c9e1`)

| | До, desktop | До, mobile | Після, desktop | Після, mobile |
|---|---|---|---|---|
| Тести | 2 пройшли | 1 пройшов, 1 пропущено (наявний desktop-only skip) | 2 пройшли | 1 пройшов, 1 пропущено |
| `URL_REQUEST` до Google з тестового хоста (NetLog) | **2** (`gtag/js?id=G-WYRXJV71WG`) | **1** | **0** | **0** |
| Події NetLog про хости GTM / GA / doubleclick | 32: `URL_REQUEST_START_JOB`, `HTTP_STREAM_JOB`, `SOCKET_POOL_CONNECT_JOB_CREATED`, `QUIC_SESSION_POOL_JOB` та ін. | 14 | 12: лише заголовок CSP у відповідях 127.0.0.1 і `CORS_REQUEST` | 4: те саме |
| `gtag/js` у trace | `net::ERR_CONNECTION_REFUSED` на loopback (×2) | `net::ERR_CONNECTION_REFUSED` (×1) | статус 200, `_wasFulfilled: true` (×2) | статус 200, `_wasFulfilled: true` (×1) |

Що лишилося в NetLog після виправлення:
- **CSP** — заголовок `content-security-policy` наших відповідей з 127.0.0.1 називає `www.googletagmanager.com` дозволеним джерелом. Це не запит.
- **`CORS_REQUEST`** — шар CORS мережевого сервісу записав запит `gtag/js` і закрив його (`CHECK_CORS_PREFLIGHT_REQUIRED` → кінець). Далі немає ні `URL_REQUEST`, ні DNS, ні сокета: відповідь дав маршрут Playwright.

### 5.2 Цілі файли після виправлення (`505c9e1`)

Прогін: увесь `first-contact.spec.ts` + увесь `ux-conversion-phase2.spec.ts` + `form.spec.ts:500` (тест зі зміненим рядком).

| | Desktop | Mobile |
|---|---|---|
| Тести | 38 пройшли | 27 пройшли, 10 пропущено (наявні desktop-only skip у `ux-conversion-phase2`) |
| `URL_REQUEST` до Google з тестового хоста | **0** | **0** |
| Запити Google у trace | 3 × `gtag/js` (first-contact, ux-conversion-phase2, form), усі 200 з маршруту | 1 × `gtag/js` (first-contact), 200 з маршруту |
| Події NetLog про GTM / GA / doubleclick | лише CSP (320) і `CORS_REQUEST` (3) | лише CSP (132) і `CORS_REQUEST` (1) |

### 5.3 Шум локального Chrome

У NetLog є й власний трафік Chrome до Google:
- `content-autofill.googleapis.com`, `accounts.google.com/ListAccounts`, `www.google.com/async/…`, `update.googleapis.com`, `clients2.google.com/time`, `android.clients.google.com/checkin`;
- `initiator` = «not an origin», тобто запити браузера, а не сторінки;
- у прогонах з двома тестами їх однаково до й після: 12 на desktop і 10 на mobile;
- жоден не йде до GTM / GA / doubleclick і не містить `G-WYRXJV71WG`;
- усі відхилено на loopback.

Це властивість каналу `chrome` на Mac. CI запускає вбудований Chromium headless.

### 5.4 Інше

- ESLint (увесь репозиторій), `tsc --noEmit --incremental false` — OK.
- Vitest: 89 файлів, 1389 тестів — усі пройшли.

## 6. Докази (RUBIKON-archive)

Шлях: `RUBIKON-archive/research/ci/2026-10-15-e2e-google-intercept/` (поза git; 153 МБ, 34 файли; `shasum -a 256 -c SHA256SUMS.txt` → 0 помилок). Сирі NetLog лишаються лише в архіві: у них є службові адреси самого Chrome.

| Файл | SHA-256 |
|---|---|
| `SHA256SUMS.txt` | `438ae7c8d1818d51189559e01b72f21e76e8ecec1267c54c542fe454a9610816` |
| `README.md` | `c21af78d98a9e654d449295f24a7d7bcd1d374c4015d1c6ea9b8fe28f21c08d0` |
| `harness/verify.config.ts` | `d66c0bca65355531112090df28b04f245cfbe4867c9d6b4a8c2b57f1885e69c2` |
| `harness/analyze.py` | `341d23de5bea777751e3ddf70664b5d452fe8c1922171d260174a5a78e6e5734` |
| `before/summary.json` | `a3f98d792e854f4dd3dad4ef1eff17592cb472eb7075ff711b231de767e4805c` |
| `before/desktop-chromium/netlog.json.gz` | `3c37351055e0ad71ea23715ce88ad25cf0400921adbfc4ff76c493dc9ae698c2` |
| `before/mobile-chromium/netlog.json.gz` | `6dab6052fc04713c4a61bdfd00a482b881c8b4c3a8aa210b26e38bec615ca255` |
| `after/summary.json` | `95833d6fccd7e657e4a88ed53d4049079cb9d140d934e09eb78a560c439448e1` |
| `after/desktop-chromium/netlog.json.gz` | `1d594b917425937d12d4c5edf06f948a05447cee5f721c8d64814b0c3987a7f1` |
| `after/mobile-chromium/netlog.json.gz` | `c73badf6c61f2335597ccd44c4378cb2ca6e27245c11219ba1731f5d4891678c` |
| `files/summary.json` | `2d57b4f3bf0e888a40edc009228b8e2517b2d57bdaebafd31ec9ce84bc53e309` |
| `files/desktop-chromium/netlog.json.gz` | `2d0c086cea4fb01ade7c4ab728f82365b0936688a91d1a22d91f4010983a37f9` |
| `files/mobile-chromium/netlog.json.gz` | `60655162f66f972349710be77cb5cd97e551ce4cb8fd2ae855616170128d05d6` |
| `logs/guard-red-on-main-270e54c.log` | `bd9e1170a2525fcf5e280fc02213e7fbb4ccad51f580d115295f512c1292dbda` |
| `logs/guard-green.log` | `2eb5f6b8688f2478f6655e42190658beed34e074b84ab113c81d153b3bc3d04f` |
| `logs/files-run.log` | `86ab09c038355703a6e5799ed30dbaecdb9af14666a7bdd6c21aa3681af51984` |

Поруч лежать JSON-звіти Playwright і trace кожного тесту з прогонів «до» та «після». У прогоні «файли» trace збережено лише для трьох тестів, що дають згоду.

## 7. Свідомо не зроблено

| Що | Чому |
|---|---|
| `tests/e2e/analytics-consent.spec.ts` | Цей файл навмисно вантажить справжній gtag.js (`route.fetch()`): під тестом саме вибір ендпоінта. Кожен інший запит до Google він відповідає локально (204), тож хітів GA4 немає. Але **завантаження скрипта з `www.googletagmanager.com` з CI-хоста лишається** (PR Gate «Inquiry regression», Main Regression, Nightly). Поза обсягом. У локальній основній копії є незакомічена зміна саме цього файлу — її не чіпали |
| Спільний помічник для маршруту Google | Сам регулярний вираз уже стоїть у трьох місцях (`consent.spec.ts` ×2, `form.spec.ts`). Тепер додано ще два, дослівно як у `consent.spec.ts`. Узгодженість тримає guard |
| `first-contact.spec.ts` у PR Gate | Класифікатор (`scripts/ci/classify-changes.mjs`) не включає цей файл у жоден job PR Gate. Це зміна CI, а не тесту. Регресію тут ловить guard у Fast Gate |
| Production host guard (DEC-06) | Окрема задача |

## 8. Ризики

- **Guard текстовий.** Spec, що дає згоду іншим шляхом — без `'granted'` і «Прийняти все» (наприклад, лише через «Налаштувати» і перемикач), — він не побачить.
- **Guard перевіряє весь файл, а не кожен тест.** Regex-маршрут в одному тесті «покриє» згоду в іншому тесті того самого файлу.
- **Основний доказ локальний** (Chrome 155 на macOS). Прогону `first-contact.spec.ts` на CI-браузері до merge не буде: файл іде лише в Main Regression і Nightly. За потреби Main Regression можна запустити через `workflow_dispatch` на цій гілці, як для #186.
- **CI на старих комітах main.** Хіти, які вже надіслали попередні прогони CI, виправлення не прибирає. Розділити їх у звітах GA4 можна лише фільтром за hostname — там, де потрібен доступ до GA4.

## 9. Відкрите й пропоновані оновлення контролю

Усі пункти — лише після OK Дмитра:
- **`CURRENT_CHECKPOINT`:** «два e2e-тести з дозволом аналітики більше не вантажать gtag з 127.0.0.1 — #194 (draft), guard у Fast Gate».
- **Рішення власника (окремо):** чи лишати справжнє завантаження gtag.js в `analytics-consent.spec.ts`. Варіанти — так, як зараз, або перевіряти вибір ендпоінта на збереженій копії скрипта. Окремим PR і окремим погодженням.
- **`INDEX`/`MANIFEST` архіву:** окремий R-ID для `research/ci/2026-10-15-e2e-google-intercept/`.
