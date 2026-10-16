# Handoff · Аналітика: детермінований контракт (Layer A), чесний skip live-тегу і жодного запиту з браузера назовні

| | |
|---|---|
| Дата | 2026-10-16 |
| Виконавець | Claude Code (діагностика: агент аналітики Wave 01; реалізація й перевірка) |
| Рев'ю | Незалежне adversarial-рев'ю PR і верифікація аналізу 16.10 (GO_WITH_NOTES / SOUND_WITH_CORRECTIONS); ChatGPT (через GitHub); Дмитро (рішення) |
| PR | https://github.com/leusd100/rubikon-build/pull/203 · Draft. **Merge і deploy не виконувались і не дозволені**: merge = production deploy, лише за окремим OK Дмитра |
| Гілка | `test/analytics-contract-isolation` |
| Base | `main` `c4bfaef` (#200) |
| Commits | `37d64df` Layer A · `4d34d54` live-skip без гонки · `6542d79` DNS-захист · `38c0120` посилення Layer A за рев'ю (+ handoff) |
| Змінено | нові `tests/e2e/google.helpers.ts`, `tests/e2e/analytics-contract.spec.ts`; `tests/e2e/analytics-consent.spec.ts` (skip, denied-кейси, DNS-захист); `tests/unit/e2e-google-intercept.test.ts` |
| Не змінено | `app/`, `csp.ts`, workflows, `classify-changes.mjs`, retries, timeout-и; assertions live-кейсів `:111–118`, `:142–143` |

## 1. Що знайдено (доведено)

| # | Знахідка | Доказ |
|---|---|---|
| F1 | **Чому live-тест червоніє ≈2 % виконань.** gtag.js один раз на завантаження викликає `Math.random()` (`dl.T`). За `T ≥ 0.99` він шле `/td`, за `T < 0.01` — `/a`, обидва як `Image` на `www.googletagmanager.com`. Наш `img-src` їх блокує, `:118` бачить порушення | Статичний аналіз 3 тіл тега (sha256 у пакеті), 84/84 детерміновані примусові умови офлайн; історія CI — 9 із 125 прогонів Main і Nightly з такими рядками |
| F2 | **Skip «gtag.js could not be fetched» був гонкою тесту, а не недоступністю Google.** `gtagLoaded` ставав `true` лише після `await route.fetch()`, а `waitForLoadState('networkidle')` повертався одразу. Analytics-only кейс часто тихо не виконувався | Кроки blob-звітів: у кожному пропуску networkidle тривав 0–1 мс, GET тега ще йшов, помилки fetch немає. 4/6 спроб analytics-only — skip, «Прийняти все» — 0/6 |
| F3 | **Live-тест, імовірно, слав справжні GA4-хіти з CI.** На переході `/` → `/angary` тег шле keepalive `/g/collect` (`scroll`, `user_engagement`) на `pagehide`, і цей запит іде повз routes Playwright | Збережені байти тега проти dead-end sink: без захисту — з'єднання назовні у 2/2 прогонів, із захистом — 0/2. У production GA4 не перевірено: доступу немає |

## 2. Що змінює PR

1. **Layer A** (`google.helpers.ts`, `analytics-contract.spec.ts`) — логіка аналітики сайту без Google.
   - Версійований stub тега записує кожну команду `dataLayer`. Одна context-route на все поза origin застосунку; кожне завантаження `gtag/js` рахується.
   - Для «analytics-only» і «Прийняти все» тест перевіряє:
     - точну послідовність `consent default → update → js → config` з вимкненими signals;
     - протокол `Arguments`;
     - 0 вихідних запитів, 0 CSP-порушень;
     - після повної навігації — ті самі команди; рівно 2 завантаження тега, по одному на документ.
   - «До вибору» і «Лише необхідні»: тег не завантажено, команд немає, 0 вихідних, 0 CSP.
   - Лід (mocked `/api/leads`, **реальних заявок немає**): рівно один `generate_lead` з непорожніми `contact_method` і `project_direction`.
2. **Чесний skip live-тегу** (`analytics-consent.spec.ts`).
   - `recordGoogle` знає стан тега: не запитували / вантажиться / завантажено / не вдалося (з причиною).
   - Endpoint- і лід-кейси чекають, поки завантаження завершиться, і пропускаються лише при справжній невдачі, з її текстом.
   - Denied-кейси перевіряють сильніше: тег **не запитували взагалі**. Раніше вистачало «не завантажено», чому відповідали й незавершене, і невдале завантаження.
3. **DNS-захист** в обох spec-ах аналітики: `--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost`.
   - Браузер не може з'єднатися ні з чим, крім застосунку.
   - Справжній `gtag.js` і далі приходить через `route.fetch`, який Playwright виконує поза браузером.
4. **Unit-guard.**
   - Spec зі згодою проходить з regex-маршрутом **або** з `stubGoogle(context, …)`.
   - Форма helper-а закріплена: одна route на все поза origin; без `fetch`/`continue`/`fallback`; stub без транспорту.
   - `analytics-contract.spec.ts` — у списку обов'язкових.
   - Це текстовий tripwire, а не повний аналізатор.

## 3. Наслідки, які власник має знати

- **Червоних прогонів через `/td` може стати більше.** До F2 analytics-only кейс часто тихо пропускався (≈2,7 виконання `:118` на прогін, ≈5 % прогонів). Тепер він виконується (4 на прогін, ≈7,8 %). Сама перевірка не змінилась. Це чесніший сигнал, доки власник не вирішить політику `/td` (OD-4).
- **Layer A не замінює live-контракт.** Stub нічого не шле. Якщо live-кейси колись перенесуть в окремий необов'язковий workflow (OD-5), у gate не лишиться перевірки «справжній тег × наш CSP × збір лише на `*.google-analytics.com`». Варіанти: Layer B обов'язковий або входить у gate Nightly; або в gate лишається один live-кейс із нейтральним семплом.
- **У PR Gate Layer A не біжить.** Job `inquiry` має явний список spec-ів, тож Layer A йде лише в Main Regression і Nightly (OD-3).

## 4. Перевірка (Linux Docker, CI-збірка `c4bfaef`, `--retries=0`)

| Прогін | Результат |
|---|---|
| `analytics-contract` + `analytics-consent`, desktop + mobile, 3 повтори, фінальний код | **66/66**, жодного skip: live-тег завантажено через `route.fetch` при закритому DNS |
| Негативні контролі Layer A (поза PR): signals увімкнено в config; команда простим масивом; сторінка сама шле зображення в Google | 30/30 спіймано, 1,5–2,3 с |
| Unit-guard | 9/9. Spec зі згодою без захисту — guard **падає**; helper з `route.continue()` — guard **падає** |
| A/B витоку на `pagehide` (dead-end sink) | без захисту — 2/2 з'єднання назовні; із захистом — 0/2 |
| `tsc`, `eslint` | 0 помилок |

## 5. CI

| Що | Run | Результат |
|---|---|---|
| Main Regression (`workflow_dispatch`), head `371cc80` (Layer A) | [38912609045](https://github.com/leusd100/rubikon-build/actions/runs/38912609045) | **success**: 1265 clean (+6 нових Layer A), 0 retry-pass, 292 skip |
| PR Fast Gate і Main Regression на фінальному head | — | див. коментар у PR |

## 6. Межі

- Layer A ловить усе, що сторінка шле, поки документ живий. Запити під час вивантаження й WebSocket-и context-route не бачить, тому в spec-ах аналітики додано DNS-захист.
- Unit-guard текстовий: імпорт із викликом можна підробити, але від випадкових помилок він захищає.
- Чи доходили в GA4 хіти з CI до цього PR, **не перевірено**: доступу до GA4 немає.
