# Handoff · Аналітика: детермінований контракт застосунку (Layer A) окремо від live-тегу Google

| | |
|---|---|
| Дата | 2026-10-16 |
| Виконавець | Claude Code (діагностика: агент аналітики Wave 01; реалізація й перевірка) |
| Рев'ю | ChatGPT (незалежне, через GitHub), Дмитро (рішення) |
| PR | Draft. **Merge і deploy не виконувались і не дозволені**: merge = production deploy, лише за окремим OK Дмитра |
| Гілка | `test/analytics-contract-isolation` |
| Base | `main` `c4bfaef` (#200) |
| Змінено | нові `tests/e2e/google.helpers.ts`, `tests/e2e/analytics-contract.spec.ts`; розширено `tests/unit/e2e-google-intercept.test.ts` |
| Не змінено | `tests/e2e/analytics-consent.spec.ts` (live-тег), `app/`, `csp.ts`, workflows, `classify-changes.mjs`, retries, timeout-и |
| Статус | IMPLEMENTED у гілці · перевірено локально в Linux Docker · CI — див. §5 |

## 1. Причина нестабільності live-тесту (доведена)

`analytics-consent.spec.ts:102` (endpoint/CSP) у Nightly 38867707280 упав на першій спробі на `:118`: CSP заблокував `img-src https://www.googletagmanager.com/td?…`. Retry пройшов. Аудит 16.10 залишив причину як UNKNOWN.

- gtag.js під час кожного завантаження один раз викликає `Math.random()` (`dl.T`).
- За `T ≥ 0.99` він шле діагностичний `/td`; за `T < 0.005` — кілька `/a?…t=t`; за `0.005 ≤ T < 0.01` — `/a?v=3&t=l`. Усі ці запити йдуть як `new Image()` на `www.googletagmanager.com`.
- Наш `img-src` цього хоста не має, тож CSP блокує запит, і `:118` бачить порушення.
- Контрольований офлайн-експеримент: збережені байти двох версій gtag, наш production CSP, 15 умов × 3 повтори × 2 тіла = 90 прогонів. Кожна умова дала один і той самий результат.
- Історія CI з 19.09: **9 зі 127** прогонів Main і Nightly мають саме ці рядки CSP. Модель: ≈2 % на виконання кейсу, ≈7,8 % на прогін.
- Збір (`/g/collect`) іде з кожного завантаження, зокрема коли діагностику заблоковано. Заблокована діагностика ≠ втрачений збір. Реальне приймання в GA4 **не перевірено**: доступу немає, тестові події заборонені.

Повний аналіз, статична атрибуція й експеримент — у пакеті Wave 01 (`03_ANALYTICS_CONTRACT_REVIEW.md`, приватний архів власника).

## 2. Що змінює цей PR

**Layer A** — перевірка нашої логіки без Google:
- `google.helpers.ts`:
  - версійований stub `rubikon-gtag-stub/1`. Він забирає `dataLayer` і далі приймає `push` так, як справжній тег, і записує кожну команду з ознакою `Arguments`;
  - `stubGoogle(context, origin)`: одна context-route для **всього** поза origin застосунку. `gtag/js` отримує stub, інші запити до Google — 204 із записом, усе інше — abort із записом. У мережу не йде нічого.
- `analytics-contract.spec.ts` для мітки «analytics-only» і для «Прийняти все» перевіряє:
  - точну послідовність `consent default → consent update → js → config` з `allow_google_signals:false` і `allow_ad_personalization_signals:false`;
  - що кожна команда передана як `Arguments`;
  - **0 вихідних запитів**;
  - **0 CSP-порушень**;
  - після повної навігації на `/angary` — ті самі 4 команди, config рівно один раз.
- Лід (mocked `/api/leads`, stub Turnstile, **реальної заявки немає**) дає рівно один `generate_lead` з `contact_method` і `project_direction`.

**Unit-guard** `e2e-google-intercept.test.ts`:
- spec, що дає згоду, проходить, якщо має regex-маршрут на всі Google-URL (як раніше) **або** імпортує `stubGoogle` і викликає `stubGoogle(context, …)`;
- новий тест закріплює форму helper-а: `context.route((url) => url.origin !== appOrigin, …)`, без `route.fetch` / `continue` / `fallback`, stub без жодного транспорту (`fetch`, `XMLHttpRequest`, `sendBeacon`, `Image`, `createElement`, `.src`, `WebSocket`, `EventSource`, `import(`).

**Не змінює.** `analytics-consent.spec.ts` (live-тег) лишається як є, разом зі своєю ≈2 % нестабільністю. Причина: перенести live-кейси в окремий workflow (Layer B) і вибрати політику для `/td` і `/a` може лише власник. Без цього прибрати live-кейси означало б просто втратити покриття.

## 3. Перевірка (Linux Docker, CI-збірка `c4bfaef`, `--retries=0`)

| Прогін | Результат |
|---|---|
| `analytics-contract.spec.ts`, desktop + mobile, 5 повторів | **30/30** |
| Негативні контролі (не в PR): config знову вмикає signals; команда простим масивом; сторінка сама шле зображення в Google — по 5 повторів × 2 проєкти | **30/30 спіймано**: тест падає на перевірці, 1,5–2,3 с, без timeout-ів |
| Unit-guard | 9/9. Контроль 1: spec зі згодою без захисту — guard **падає**. Контроль 2: helper з `route.continue()` — guard **падає** |
| `tsc --noEmit`, `eslint` | 0 помилок |

## 4. Межі й наступний крок

- PR Fast Gate запускає `inquiry` за явним списком spec-ів, тож `analytics-contract.spec.ts` побіжить у Main Regression і Nightly, але **не в PR Gate**. Щоб додати його в `inquiry`, треба змінити `pr-gate.yml` і `classify-changes.mjs`, а це рішення власника.
- **Layer B** (live-тег в окремому workflow: один live-GET на прогін, хеш байтів, закріплений семпл на кожен кейс, INCONCLUSIVE замість skip) існує як прототип у пакеті Wave 01. Потребує погодження власника: політика `/td`, новий workflow, підміна `Math.random` у тесті.

## 5. CI

Заповнюється після PR Fast Gate і Main Regression (`workflow_dispatch`) на гілці.
