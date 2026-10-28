# Handoff · Lenis: колесо під модальним 3D, перехоплені якорі, сенсорні планшети (MO-01 · MO-02 · MO-03)

| | |
|---|---|
| Дата | 2026-10-27 – 28 |
| Виконавець | Claude Code |
| Підстава | Engineering Excellence brief 27.10, знахідки MO-01, MO-02, MO-03 (`06_SCROLL_AND_MOTION_ANALYSIS.md`, підтверджені перевіркою). MO-04 — лише контекст, не змінено |
| PR | [#261](https://github.com/leusd100/rubikon-build/pull/261), Draft. Merge — за вказівкою Дмитра 28.10, лише коли перевірки PR зелені; **production deploy — лише з окремого OK Дмитра** |
| Гілка / base | `fix/lenis-guards` від `main` `9079f47` |
| Коміти | **`2ee652e`** — код і тести · цей коміт — handoff |
| Змінено | `app/components/SmoothScroll.tsx`: опція `prevent` (вузол з `aria-modal="true"`), `anchors: false` і власний слухач якорів, `HOVER_QUERY` в умові запуску та його `change`. Коментарі в минулому часі там, де вони описували старий обробник якорів Lenis: `HangarConfigurator.tsx`, `revealAttachedBrief.ts`, `configurator-phase4-inquiry.spec.ts`, `form.spec.ts`; у `smooth-scroll-idle.spec.ts` коментар називає порядок слухачів, на який спирається тест якоря. Тести: 8 нових e2e у `tests/e2e/smooth-scroll.spec.ts` |
| Не змінено | Параметри Lenis (`lerp: 0.18`, `wheelMultiplier: 1`, `syncTouch: false`, `stopInertiaOnNavigate: true`, `autoRaf: false`), поріг 1181 px, reduced motion, `?lenis=off`, `lenisLoop.ts`, щит прокрутки (другий ефект `SmoothScroll`, MO-04), обхідні `stopPropagation` у `HangarConfigurator` і `revealAttachedBrief`, CSS, розмітка, тексти, залежності (0 нових), еталони |

## Що було

На `main` `9079f47`, від 1181 px без reduced motion, Lenis згладжує прокрутку `window` і має три «краї».

- **MO-01. Колесо під повноекранним 3D на /angary.** `FullscreenPreviewFrame` ставить `overflow: hidden` на `body`, але Lenis бере `wheel` на `window` (`passive: false`), сам робить `preventDefault` і прокручує через `window.scrollTo`, якого `overflow: hidden` не зупиняє. 5 клацань колеса над оверлеєм — сторінка за ним на **500 px** далі, і після Escape відвідувач на 500 px нижче, ніж був. З `?lenis=off` — 0 px.
- **MO-02. Обробник якорів Lenis (`anchors: true`) не дивиться на `defaultPrevented` і модифікатори.** Кожен компонент, що перехоплює якір, мусив ще й зупиняти спливання (`HangarConfigurator`, `revealAttachedBrief` — так виправляли PDO-02). Без цього — друга прокрутка. Живий випадок на production: `ScopeLink` «Обсязі робіт» у підказці кроку (`ConfiguratorControls.tsx`) робить лише `preventDefault`, відкриває крок «Обсяг» і ставить вкладки під шапку (`landOnSteps`), а Lenis слідом везе сторінку до прихованого `#hc-step-check`: вкладки кроків і фокус на них опиняються **на 98 px над вікном** (1440 × 900; 97 px на 1366 × 768). Cmd/Ctrl/Shift-клік по якорю відкриває вкладку чи вікно і водночас прокручує поточну сторінку на 784 px.
- **MO-03. Сенсорні планшети в ландшафті.** Умова запуску перевіряла лише ширину і reduced motion, тож iPad Pro 11″ (1194 px) і 13″ (1366 px) у ландшафті отримували Lenis, його chunk (18 610 B, 5 382 B gzip) і три блокувальні touch-слухачі на `window` (`touchstart`/`touchmove`/`touchend`, `passive: false`) — всупереч коментарю над `DESKTOP_QUERY`, що планшети, зокрема в ландшафті, лишаються на нативній прокрутці. `HOVER_QUERY` у файлі вже був, але запуску не стосувався.

## Що зроблено

- **MO-01 — `prevent`.** Lenis отримує `prevent: (node) => node.getAttribute('aria-modal') === 'true'`. Lenis перевіряє кожен елемент шляху події (лише `HTMLElement`) і для такого вузла лишає колесо браузеру: без `preventDefault`, без `scrollTo`. Нативну прокрутку під модальним вікном блокує його ж `overflow: hidden`. Закриває весь клас: будь-яке теперішнє чи майбутнє `aria-modal="true"`. Поза модальними вікнами Lenis не змінився.
- **MO-02 — `anchors: false` і свій слухач.** `onAnchor` — слухач `click` на `window` у фазі bubble, як був у Lenis, доданий і знятий разом з екземпляром Lenis. Він виходить, якщо клік уже скасовано (`defaultPrevented`), кнопка не основна, натиснуто будь-який модифікатор, посилання веде на інший шлях чи хост або не має hash. Інакше — `lenis.scrollTo(decodeURIComponent(hash))` з тими самими (типовими) параметрами, що в Lenis, і `wake()` циклу (M1-3). Дію за замовчуванням не скасовує: hash в адресі й запис в історії — браузерні, як були. `stopInertiaOnNavigate` лишився за Lenis: його обробник `click` і далі зупиняє інерцію перед посиланням на іншу сторінку. Обхідні `stopPropagation` лишились — тепер зайві, але не шкідливі.
- **MO-03 — `HOVER_QUERY` в умові запуску.** `wanted()` = не `?lenis=off` і ≥ 1181 px і `(hover: hover) and (pointer: fine)` і без reduced motion; зміна `HOVER_QUERY` (під’єднали чи від’єднали мишу) викликає `sync()`, як зміна ширини. Та сама умова вже стояла на щиті прокрутки, тепер Lenis і щит вмикаються за однаковим вказівником.
- **Тести** (`smooth-scroll.spec.ts`, desktop-chromium):
  - миша 1440 — chunk Lenis завантажено (контроль, щоб планшетні тести не були порожніми); iPad Pro 13″ 1366 × 1024 і 11″ 1194 × 834 (`isMobile`, `hasTouch`) — ширина ≥ 1181, але без `html.lenis` і без запиту chunk;
  - перехоплений якір (`preventDefault` у capture на `document`, як у компонентів) не рухає сторінку й не ставить hash; Cmd/Ctrl-клік не рухає сторінку;
  - «Обсязі робіт» на /angary при 1440 × 900 і 1366 × 768: крок «Обсяг» відкрито, фокус на його вкладці, вкладки під шапкою і у верхній половині вікна (контракт `landOnSteps`);
  - 5 клацань колеса над повноекранним 3D — `scrollY` не змінився ні під оверлеєм, ні після Escape; поза оверлеєм колесо знову згладжується.

## До / після

Локальні production-збірки: `main` `9079f47` і гілка (той самий base), `vinext start` на 127.0.0.1. Chrome 156.0.8078.47 headless (`channel: 'chrome'`), 1440 × 900 (де не сказано інше), DPR 1, згода «відхилено» до завантаження, Google перехоплено. Числа — геометрія й позиції прокрутки, детерміновані: усі повтори дали те саме значення.

| Випадок | main | main `?lenis=off` | гілка |
|---|---|---|---|
| MO-01: /angary, 3D → «Розгорнути», 5 × 100 px колеса над оверлеєм: зсув сторінки під ним, n = 3 | **500 / 500 / 500 px** | 0 / 0 / 0 | **0 / 0 / 0** |
| MO-01: зсув після Escape відносно відкриття, n = 3 | 500 px ×3 | 0 ×3 | **0 ×3** |
| MO-01: `wheel.defaultPrevented` над оверлеєм | true ×5 | false ×5 | false ×5 |
| MO-02: Home, тестовий якір `#directions`, `preventDefault` у capture на `document`: зсув, n = 3 | **784 px** ×3 | 0 | **0** ×3 |
| MO-02: той самий якір, звичайний клік: зсув · hash · `history.length` після (у скасованих — 2) | 784 · `#directions` · 3 | 784 · `#directions` · 3 | 784 · `#directions` · 3 ×3 |
| MO-02: Cmd-клік / Shift-клік: зсув поточної сторінки · нових вкладок | 784 · 1 / 784 · 1 | 0 · 1 / 0 · 1 | **0 · 1 / 0 · 1** |
| MO-02: «Обсязі робіт», 1440 × 900: верх вкладок кроків (шапка — 101 px), n = 3 | **−98 px** ×3 (сторінка +373 px) | 275 (сторінка 0) | 275 / 275 / 116 (сторінка 0 ×3) |
| MO-02: те саме, 1366 × 768, n = 3 | **−97 px** ×3 (сторінка +306 px) | 116 (сторінка 0) | 209 / 209 / 116 (сторінка 0 ×3) |
| MO-03: iPad Pro 13″ 1366 × 1024 і 11″ 1194 × 834 (емуляція, touch, iPad UA): `html.lenis` · chunk · блокувальні touch-слухачі на `window` | так · 1 · 3 (обидва) | — | **ні · 0 · 0** (обидва) |
| MO-03: 1440 × 900 з `hasTouch` без `isMobile` (у Chrome — `pointer: coarse`) | так · 1 · 3 | — | ні · 0 · 0 |
| MO-03: миша 1440 × 900 і 1366 × 768 | так · 1 · 3 | — | так · 1 · 3 |
| MO-03: iPad Air 1180 (під порогом) | ні · 0 · 0 | — | ні · 0 · 0 |

Позиція вкладок на гілці (275 / 209 / 116) різниться між повторами, бо різниться місце, де Playwright зупинив сторінку перед кліком (`scrollIntoViewIfNeeded` під Lenis); сам клік сторінку не рухає в жодному повторі — так само, як з `?lenis=off`, — а `landOnSteps` лишає вкладки на місці, коли вони вже під шапкою у верхній половині вікна, або ставить їх на шапка + 8…15 px.

Байти (`dist/client/_next/static/chunks`, 81 файл у кожній збірці; хеші в назвах нормалізовано): відрізняються лише `SmoothScroll-*.js` — **3 409 → 3 927 B (1 494 → 1 670 B gzip -9)** — і `index-*.js`, у якому різняться тільки 31 байт ідентифікатора збірки. Chunk Lenis (`lenis-BMu0iDXx.js`, 18 610 B) — побайтно той самий. Сенсорні планшети ≥ 1181 px його більше не завантажують.

## Перевірка

| Що | Результат |
|---|---|
| `vitest run` | 98 файлів, **1542 passed** |
| `tsc --noEmit --incremental false`, `eslint .` | чисто |
| Нові e2e на збірці **main** (тести гілки, Chrome 156, 2 workers) | **7 failed**: планшети 1366 і 1194 (`html.lenis` = true), перехоплений якір і Cmd/Ctrl-клік (`scrollY` 4180 замість 0), «Обсязі робіт» (вкладки −97,7 px і −97,1 px при шапці 101), колесо над 3D (356 → 856). Контроль «миша 1440» проходить |
| `smooth-scroll.spec.ts` + `smooth-scroll-idle.spec.ts` на гілці, desktop + mobile chromium | **22 passed**, 22 skipped (desktop-тести на mobile-проєкті і навпаки), 0 failed; на main — ті самі 14 наявних тестів і контроль passed, 7 нових failed |
| E2E на гілці, desktop + mobile chromium, 2 workers: `configurator-phase4-inquiry`, `form`, `configurator-fullscreen-accessibility`, `inquiry-brief-handoff`, `configurator-inquiry-handoff`, `header-current-section`, `pr-critical` | **247 passed**, 25 skipped, 0 failed |
| E2E на гілці: `grain-planner`, `grain-planner-handoff`, `links-buttons-focus`, `configurator-3d`, `home-proof-contour` | **222 passed**, 76 skipped, 0 failed |
| Firefox і WebKit (Docker `mcr.microsoft.com/playwright:v1.62.1-noble`, arm64, ті самі збірки) | MO-02, перехоплений якір: main **784 px → гілка 0** і у Firefox, і у WebKit; звичайний якір — 784 px і `#directions` на обох збірках. MO-01 у WebKit: **500 → 0 px** під оверлеєм і після Escape. MO-03 у WebKit (емуляція iPad 13″ 1366 × 1024, touch): `html.lenis` · chunk — main так · 1, гілка **ні · 0**. У Firefox у контейнері немає 3D («Подивитися в 3D» не з’являється), тож MO-01 там не перевірено; емуляції мобільного пристрою Firefox не має. Сторінка відкривається як `http://127.0.0.1:<порт>` через TCP-переадресацію в контейнері; для WebKit з CSP документа знято лише `upgrade-insecure-requests` (на http-loopback WebKit інакше підвищує всі скрипти до https і сторінка не гідрується — і на main) |

Інші споживачі Lenis: `lenisLoop.ts` (без змін, `wake()` тепер викликає й `onAnchor`), `HangarConfigurator` і `revealAttachedBrief` (обхідні `stopPropagation` лишились; їхні e2e — у таблиці вище), `grain-planner.helpers.ts` (`clickInPageLink`; тести планувальника зелені), `aria-modal` у `ProofContour` (лише телефонний аркуш, де Lenis немає) і `AttachedBriefCta` (лише читає). У CSS сайту правил для `.lenis*` немає.

### Докази

Сирі дані й скрипти — в архіві дослідження (поза репозиторієм); SHA-256:

| Файл | SHA-256 |
|---|---|
| `mo01-main.json` | `39eb4c6c41cbfe29cd3383bac18527a6261ce5b16a277d57e031a6b44a932db2` |
| `mo01-main-lenis-off.json` | `cb213652cd7d434243f9241d35ff6974ebf5cf64595228a11fa3919cbad6e955` |
| `mo01-branch.json` | `a5c57e3cc5577a068a44f971b6ac131a388499bfaf41a53a572511556b02a570` |
| `mo02-main.json` | `73848af93d0968bb25bf265c9f11b97a4b76d64ba8356d5ed2cde35d185c39cc` |
| `mo02-main-lenis-off.json` | `13c4be18fb10d590493937f3b73878047febda83f9137562ed19b6b37fd2a7f5` |
| `mo02-branch.json` | `cc88be41f7c32239c316190923bd0f42e1748607d3db2e8cead28fc0044f0328` |
| `mo03-main.json` | `87eb76372f1fae58e54810077dd57e9b0d2cece6f93aab371a679e1fab012c4f` |
| `mo03-branch.json` | `3ac43e1c682b29867bd1c0bcead9b77ef419e148db495d4260dc717d715d7230` |
| `chunk-diff.txt` | `72ac3aa795fc1eea2afdbee066c331ec3c64d076c1c70aaf4c0e5bc4832607a9` |
| `dec18/_result.tsv` | `b9b4d050e574730b161e72825a279ea5106bc331286b16156b567b21749b61ba` |
| `e2e/main-smooth-scroll.txt` | `9bb82adf21d8cbae742e957458083970f4f1d05ba373d25fe28484719587e594` |
| `e2e/branch-smooth-scroll.txt` | `c99413ba87019487d537df563b437e6d4143c0af5337eb3d25b6d9b6d858b4f7` |
| `e2e/branch-related.txt` | `88bac35fd46f0f09089e8111ac11c3c7300ce880373b35ce45699fab167209db` |
| `e2e/branch-related-2.txt` | `5debbd0e0badc18561948c560c25a9d642c697a9816f138bd57368d2e8878fa0` |
| `xengine/firefox-main.json` | `20d168b46aeb1a51b9a96c4c68db657f6e0442a35e580098178cedbbb377dba4` |
| `xengine/firefox-branch.json` | `e98eca572f74f154539e95cba8bfcb728d41f7bd09b0974c94cc4956bdcd35cb` |
| `xengine/webkit-main.json` | `e954bda63fef66253827ab5da5ddacf1f2dfec20b94c4b0feea00e37aa6cf0b5` |
| `xengine/webkit-branch.json` | `c9b5a5dea24bae01ae505c9374d7e2b6e0b9cea92abf1ae77863221653bd3933` |
| `mo01-fullscreen-wheel.cjs` | `c0b5690c6d4e6e3115e35574b531dade9f5b3131577e18c727264295e34166e9` |
| `mo02-anchors.cjs` | `d64055cd9ce56309624f3173e4e4aa17988860a5105c7f89983cafcc21449571` |
| `mo03-tablets.cjs` | `5e98dba954c3b8a39328cc3c1c648d331a05c30414c40cce96248a69842779be` |
| `dec18-two-builds.cjs` | `f5495341c0a99f033f0f27c20f09ee6a6328feb3088cfc59ed9547a9c79beb22` |
| `xengine-probe.cjs` | `4a29c9d9453ebebf16fca8d61e5eac997bc746b6d90e624a449edacf09407d98` |
| `SHA256SUMS` | `9c1641bfde466d89047369e22d381c49e31d53fc9696368b76b0b4d19198b02c` |

## Еталони (DEC-18)

Прогноз: 42 цілі visual-chromium (`visual`, `brand-logo-visual`, `configurator-visual`, `grain-planner-visual`), зняті з main і з гілки з налаштуваннями специфікацій (reduced motion, світла тема, DPR 1, ті самі елементи) і порівняні компаратором Playwright з допуском специфікацій (threshold 0,25, maxDiffPixelRatio 0,02): **0 з 42 змінюються** (40 побайтно однакові, 2 — `homepage-real-object-mobile-375`, `homepage-hero-desktop-1440` — у межах допуску). Так і має бути: усі візуальні специфікації вмикають reduced motion, за якого Lenis не запускається ні на main, ні на гілці, тож змінений код у кадрах не виконується. Еталони не оновлено; остаточно покаже Main Regression на CI (Linux).

## Ризики

- **Пристрій з сенсором і мишею.** Умова тепер — основний вказівник. Ноутбук із сенсорним екраном, у якого основний вказівник — трекпад чи миша, лишається з Lenis; якщо браузер звітує основним вказівником сенсор (Windows 2-в-1 у режимі планшета), сторінка отримає нативну прокрутку — безпечний варіант і той самий, за якого вже вимикався щит прокрутки. iPad з трекпадом, якщо iPadOS звітує `hover: hover` і `pointer: fine`, отримає Lenis, як ноутбук. Жодне з цього на залізі не перевірено.
- **Порядок слухачів `click`.** `onAnchor` додається на `window` (bubble) при створенні Lenis, як і старий обробник. Слухач на `window`, доданий раніше і скасовує клік, тепер вимикає згладжений перехід (раніше — ні); доданий пізніше — не встигає (як і раніше). React і слухачі `document` завжди встигають. Тест якоря в `smooth-scroll-idle.spec.ts` спирається саме на це (коментар там пояснює).
- **`prevent` для `aria-modal`.** Майбутнє десктопне модальне вікно з `aria-modal="true"`, яке не заблокує прокрутку сторінки, прокрутить її колесом нативно (без згладження), а не через Lenis. Це поведінка браузера, як з `?lenis=off`.
- **Посилання з `target="_blank"` на якір цієї ж сторінки** (зараз таких немає) згладжено прокрутить і поточну сторінку — як було з `anchors: true`.

## Не перевірено

- Справжній iPad (11″, 13″) і сенсорний ноутбук — лише емуляція Chrome і WebKit.
- MO-01 у Firefox: у контейнері 3D не малюється (див. таблицю), тож колесо над оверлеєм там не відтворено (у WebKit — відтворено й виправлено). MO-03 у Firefox: емуляції мобільного пристрою немає. Справжній Safari і Firefox на macOS не запускались (на Mac їх немає).
- Hover-«спалах» щита між клацаннями колеса без Lenis (MO-04) — не входить у цей PR.
- Мілісекундні таймінги не міряв: зміна не стосується продуктивності прокрутки, крім того, що планшети ≥ 1181 px більше не завантажують chunk Lenis і не мають його блокувальних touch-слухачів. Покращення відгуку на дотик на планшеті статистично не встановлено (не міряно).

## Відкат

Після squash-merge — `git revert` коміту PR. Код — один файл (`SmoothScroll.tsx`); решта змін — коментарі й тести.
