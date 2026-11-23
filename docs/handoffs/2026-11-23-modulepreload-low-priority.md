# Handoff · modulepreload з fetchpriority="low" (PP-03)

| | |
|---|---|
| Дата | 2026-11-23 |
| Виконавець | Claude Code |
| Підстава | Аудит швидкодії 22.11, PP-03; DebugBear Experiments 92312697 (E-03a) і 92313150 (E-03c) з OK Дмитра на кредити; рішення власника 23.11 «Так, готуй PR» |
| PR | [#337](https://github.com/leusd100/rubikon-build/pull/337), Draft. **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `perf/modulepreload-low-priority` від `main` `718e94de` |
| Коміти | `74690c5d` — перезапис у `worker.ts` + unit · `1ada08b1` — за рев'ю: у байтах, одним кроком потоку |
| Змінено | `worker.ts` (HTML-відповідь vinext → `withLowPriorityModulePreloads`); новий `worker/modulepreload-priority.ts`; `tests/unit/modulepreload-priority.test.ts` |
| Не змінено | компоненти, CSS, тексти, CSP, еталони, бюджети, залежності; відповіді, які не є `text/html` (RSC, статика, відео) |

## Що було

React (через `ReactDOM.preloadModule`, який не приймає `fetchPriority`) і vinext пишуть у `<head>` ~50
`<link rel="modulepreload" href="…">` з типовим, високим пріоритетом. На mobile-профілі DebugBear (RTT 150 мс, 1,6 Мбіт/с)
200–280 КБ чанків до першого кадру ділять канал із блокуючим CSS, шрифтами й фото героя: основний CSS, запитаний о ~0,8 с,
приходить о 2,5–3,2 с (DebugBear 22.11, усі 10 сторінок).

## Що зроблено

Worker додає `fetchpriority="low"` до кожного `<link rel="modulepreload" href="` у HTML-відповіді: браузер так само одразу
знаходить усі чанки, але пропускає вперед CSS, шрифти й фото. Перезапис потоковий і в байтах (рядок — ASCII; UTF-8 не повторює
ASCII-байт усередині літери): між чанками тримається лише можливий початок збігу, TTFB і стрімінг не змінюються. Не
HTMLRewriter: `vinext start` (e2e, perf-лабораторія) запускає цей Worker у Node. bootstrap-посилання React уже має
`fetchPriority="low"` і не збігається з шаблоном.

Відхилено з цифрами:
- **Повністю вимкнути modulepreload (E-03a, 92312697):** FCP −1219 мс, але LCP лише −485 мс, TTI +151 мс, DOMContentLoaded
  +1481 мс — гідратація пізніше.
- **Перша реалізація через TextDecoderStream/TextEncoderStream:** 7–14 мс CPU на сторінку в Node і перекодування байтів (BOM,
  невалідний UTF-8) — замінено на пошук у байтах (рев'ю).

## Перевірка

| Перевірка | Метод | Результат |
|---|---|---|
| Ефект на production-HTML | DebugBear Experiment 92313150, HOME Mobile, 5+5, та сама заміна рядка | FCP 5333 → 4026 мс, LCP 6786 → 4863 мс, SI 5962 → 4852, TTI 8192 → 7856, TBT 592 → 523; DOMContentLoaded 6332 → 7644 мс. TTFB обох сторін ~1,63 с (проксі експерименту) — дивитися на різницю |
| Браузер застосовує пріоритет | Lighthouse (локально, HTTP/2): пріоритети скриптів HOME | main: High×52, Low×1 → гілка: High×3, Low×50 |
| Локальна лабораторія | `lab-lighthouse.mjs --throttling devtools` через `lhci-server.mjs --http2`, 5 прогонів, main 718e94de проти гілки | HOME LCP 3621 / 3626 мс, FCP 2547 / 2697; `/angary` LCP 2819 / 2772 — **без різниці**: DevTools-тротлінг обмежує кожен запит окремо й не ділить канал за пріоритетами HTTP/2/3 (відома межа `/perf-lab`). Ефект видно лише на справжньому Cloudflare (DebugBear) |
| Гідратація не пізніше | Playwright, профіль DebugBear Mobile за запитами, 5 прогонів поперемінно, HOME і `/angary` | момент гідратації меню й кнопки дзвінка: HOME 2825 / 2822 мс, `/angary` 2855 / 2844 мс — однаково |
| Вартість | Node 24, збережена production HOME 258 КБ, чанки по 2 КБ, медіана 30 | 0,6 мс CPU (без перезапису 0,08 мс) |
| Правильність | 300 випадкових розрізів production HOME (1–70 000 байт) | 300/300 = `replaceAll` по цілому документу; 50 посилань |
| Unit | `tests/unit/modulepreload-priority.test.ts` | 6/6: розріз на кожному байті й по одному байту, BOM і невалідні байти без змін, потоковість відповіді, Set-Cookie, лише `text/html` |
| Lint, typecheck, unit, build | бінарники напряму | зелено |
| e2e (усі фокусні зони — зміна Worker) | як у `pr-gate.yml`, локально | critical 58/58; hero-video, theme ×3, direction artwork, node assembly — зелено; inquiry 119/120 (флейк `form.spec.ts:1160`, див. нижче); planner 94 + 19 skipped / 1 failed; configurator 237 + 36 skipped / 1 failed |
| Падіння planner і configurator — не від цієї зміни | ті самі 4 тести ізольовано, гілка ×3; повний planner на `main` 718e94de ×2 | гілка 12/12; на `main` той самий `grain-page.spec.ts:158` теж падає в повному прогоні (і ще `grain-planner:86`, `grain-page:88`); у configurator щоразу інший тест (`fullscreen-accessibility:44`, `inquiry-handoff:369`) — локальна нестабільність повних наборів під навантаженням; авторитет — CI |

Пастка середовища (не код): перша збірка гілки пройшла без завантаження шрифтів Google (`.vinext/fonts` порожній), і гілка
вантажила на 2 шрифти менше — перше локальне порівняння було нечесним і відкинуте. Перед A/B перевіряти
`dist/client/_next/static/_vinext_fonts`.

## Еталони

Не змінювались: розмітка змінюється лише атрибутом `fetchpriority` у `<head>`.

## Успадковані червоні перевірки

Флейк `form.spec.ts:1160` (на `main`, виправлення — PR #336) упав і тут у повному прогоні набору inquiry; форму цей PR не змінює.

## Незалежне рев'ю

Субагент-рецензент: approve-with-changes, без блокерів. Перевірив: шаблон не перекривається сам із собою, утримуваний хвіст —
лише префікс шаблону; 300 розрізів по байтах; React пише `rel`, `href`, `crossorigin` у цьому порядку; RSC-відповіді
(`text/x-component`), 204/304 — без змін; 404/500 і `x-vinext-cache` HIT — переписуються; Set-Cookie, ETag, Server-Timing,
`Link` (шрифти) — зберігаються; Node prod-server не губить нічого, стиснення не зачеплено; `TextDecoderStream` не потрібен.
Прийнято: пошук у байтах (CPU, BOM), точніший коментар, тести BOM / Set-Cookie / потоковості відповіді. Не прийнято: тест
підключення в `worker.ts` — модуль тягне віртуальні модулі vinext, у vitest не імпортується; покрито e2e (усі сторінки йдуть
через цей шлях).

## Ризики

- На production DebugBear мірить HOME mobile; на інших сторінках механізм той самий (50–58 modulepreload), але виграш не виміряно
  до deploy. Перевірка — планові прогони DebugBear (≥ 6) після deploy, з анотацією.
- Якщо колись з'явиться CSP-nonce, vinext-посилання стане `rel="modulepreload" nonce=… href=` і не збігатиметься (React ставить
  `nonce` після `href`, його посилання збігаються далі).
- DOMContentLoaded на HOME у DebugBear пізніший (+1,3 с); що бачить відвідувач — гідратацію — локально не змінилось.

## Що перевірити власнику

Після deploy: DebugBear `110361` mobile FCP/LCP на 10 сторінках (очікування для HOME — LCP −1…−2 с у профілі DebugBear) і чи
працюють меню, форма й тур як раніше.

## Відкат

`git revert` комітів — одна обгортка у `worker.ts`.

## Пропоновані оновлення control (лише після OK)

PP-03 → IMPLEMENTED після merge, VERIFIED — після ≥ 6 прогонів DebugBear.
