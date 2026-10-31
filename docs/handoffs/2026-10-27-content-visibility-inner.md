# Handoff · content-visibility на довгих внутрішніх сторінках — прототип, НЕ мержити (MT-03)

| | |
|---|---|
| Дата | 2026-10-28; follow-up рев'ю — 2026-10-29 |
| Виконавець | Claude Code |
| Підстава | Engineering Excellence brief 27.10, знахідки MT-03 (05b, RC-5; 01, §7–8 — DebugBear раунди 3–4) |
| PR | [#268](https://github.com/leusd100/rubikon-build/pull/268), Draft. 28–29.10 його кілька разів позначали ready for review; станом на 29.10 12:44 UTC він знову Draft. Ruleset `main` не вимагає ні схвалень, ні зелених перевірок, тож червоні Fast Gate і PR Gate merge не блокують. **Від merge захищає лише стан Draft.** **Прототип для рішення власника. Не мержити:** ламає приземлення плавних переходів за якорями в Chrome, Firefox і WebKit. Без перевірки на справжньому iPhone/iPad Safari не мержити в жодному разі. Merge — лише в черзі основної сесії (28.10, черга A); merge у main = production deploy через Workers Builds |
| Гілка / base | `perf/content-visibility-inner` від `main` `9079f47` (main відтоді пішов до `aa08d45`; конфліктів у `app/globals.css` немає) |
| Коміти | **`ff1b04b`** — код і тест · `0e02e0c` — handoff · **`6543f40`** — follow-up рев'ю: тест reload і коментар тесту · follow-up handoff — наступний коміт |
| Змінено | `app/globals.css`: одне правило — `content-visibility: auto; contain-intrinsic-size: auto 1000px` для `.inner-page > section:nth-of-type(n + 3)` і `.inner-page ~ footer`. Новий `tests/e2e/anchor-landing.spec.ts`: 2 тести на те, куди приходить плавний перехід за якорем, і 1 — на повернення до того самого блоку після reload. **На main вони проходять, на цій гілці падають** — так і задумано: тест фіксує блокер |
| Не змінено | HOME (у `<main>` HOME немає `.inner-page`), блок одразу під героєм, `/configurator-preview`, `scroll-behavior`, Lenis, JS, бюджети Lighthouse, CSP, еталони |

## Що було

- **RC-5 (05b).** На /yak-pratsyuiemo, /angary, /pro-nas і /zernoskhovyshcha найбільша окрема задача — перший повний layout сторінки. На /yak у ньому 1 099 об'єктів (mobile, CPU ×4).
- **DebugBear, 27.10, 8 з 8 пар.** Правило `main#main-content > section:not(:first-of-type), footer { content-visibility: auto; contain-intrinsic-size: auto 1000px }` на mobile дало Style & Layout −250…−425 мс і TBT −170…−500 мс. На HOME ефекту немає. На /angary LCP гірший на 40–205 мс.
- **Ризики з брифу:** якорі, пошук на сторінці, стрибки скролбару, друк A4, Lenis на desktop.

## Що зроблено

1. **Вузький обсяг.** Правило діє лише на сторінках з `.inner-page`: /yak, /pro-nas, /napryamky, сторінки напрямів (разом з /angary і /zernoskhovyshcha), /planner-preview, політика і 404. Воно охоплює секції `<main>`, починаючи з третьої, і footer. HOME, герой і блок одразу під героєм не охоплені.
2. **Чому без блоку під героєм — можливий механізм /angary LCP.** Цей блок починається на ~1 екран нижче, тобто завжди всередині зони, яку браузер рендерить при завантаженні (~2,5 екрана). Пропустити його неможливо, а правило на ньому лише змушує перший кадр робити layout двічі:
   - перший прохід — з пропущеним блоком;
   - потім Chrome бачить, що блок близько, «розблоковує» його і повторює стиль і layout до першого малювання.

   Трейс /angary, mobile 412×823, CPU ×4, 150 мс RTT, 1,6 Мбіт/с, по 3 прогони. Задача першого кадру — та, що малює (~3,2 с):

   | Варіант | Перерахунків стилю | Layout-проходів у задачі першого кадру |
   |---|---|---|
   | main | 1 | 2 (196–684 об'єкти + 1), 3/3 |
   | правило DebugBear | 2 | 3 (49 → 1 → 152–253 об'єкти), 3/3 |
   | ця гілка | 1 | 2 (186–301 + 1), як на main, 3/3 |

   - Після неї до FCP буває ще одна задача з одним layout: main 277–765 об'єктів (3/3), гілка 111–130 (2/3). Якщо брати найбільшу задачу до FCP, на main це 1–2 layout.
   - Подвійний прохід правила DebugBear зачіпає менше об'єктів (49 + 152…253), ніж один прохід main (196–684). Тож як пояснення пізнішого LCP він слабкий.

   - Чи це вся різниця LCP у DebugBear, локально не встановлено. Локальні FCP у шумі, LCP-вузол інший (H1 замість ліду), Lighthouse я не запускав.
   - На /yak третій блок (#etapy, 1 697 px на телефоні) теж у цій зоні. Коли він потрапляє в перший кадр, подвійний прохід лишається (2 з 2 прогонів, де перший кадр його містить).
3. **Поведінкова перевірка (main ↔ гілка, однакові налаштування).** Саме вона показала, що прототип небезпечний (нижче).

## До / після (детерміновано)

Кількість об'єктів layout від навігації до load + 3 с. Chrome 156, без мережевого обмеження, аналітика заблокована, по 2 прогони. Подано: найбільший окремий layout, «брудні» об'єкти · усі об'єкти layout · елементи перерахунку стилю.

| Сторінка | mobile 412×823, CPU ×4: main → гілка | desktop 1440×900: main → гілка |
|---|---|---|
| /yak-pratsyuiemo | 1 099 → 343 (−60 %) · 1 372 → 802 (−42 %) · 3 142 → 1 384 (−56 %) | 1 478 → 355 (−76 %) · 2 528 → 961 (−62 %) |
| /angary | 1 121 → 413 (−63 %) · 2 390 → 966 (−59 %) · 3 086 → 1 625 (−48 %) | 1 346 → 460 (−66 %) · 2 682 → 1 195 (−55 %) |
| /pro-nas | 595 → 223 (−63 %) · 794 → 543 (−32 %) · 2 674 → 1 070 (−59 %) | 768 → 230 (−70 %) · 1 106 → 828 (−25 %) |
| /zernoskhovyshcha | 1 147 → 403 (−65 %) · 2 422 → 977 (−60 %) · 3 121 → 1 280 (−57 %) | 1 416 → 486 (−66 %) · 2 855 → 1 293 (−55 %) |
| /metalokonstruktsii | 717 → 262 (−63 %) · 1 545 → 567 (−63 %) | — |
| /betonni-roboty | 720 → 172–271 (−69 %) · 1 529 → 474–575 (−66 %) | — |
| /pokrivelni-roboty | 644 → 117–122 (−81 %) · 824 → 307–311 (−62 %) | — |
| /napryamky | 586 → 309 (−47 %) · 1 304 → 716–827 (−41 %) | — |

- **Порівняння обсягів** (впорскування правила в `<style data-vinext-fonts>` збірки main, mobile, n = 2): «з третього блоку» зберігає всю економію правила DebugBear, а на /angary і /zernoskhovyshcha дає навіть трохи менше об'єктів. «З четвертого» втрачає частину: /angary 413 → 506, /zernoskhovyshcha 403 → 523.
- **Лише footer** — неперевірений кандидат. Це єдина підмножина, що не стоїть між сторінкою і жодною ціллю якоря. Дає −6…−15 % найбільшого layout (/yak — у шумі, +5 %). Поведінку цього варіанта не перевіряв; рішення цього не варте.

## Заміри часу

Не виміряно. TBT, Style & Layout і LCP на цій гілці ніхто не міряв: серійного Lighthouse-заміру немає. Покращення часу не встановлено.

## Перевірка

Main = локальна production-збірка `9079f47`; гілка = та сама база плюс правило. Chrome 156 на Mac. Firefox і WebKit — Docker `mcr.microsoft.com/playwright:v1.62.1-noble` через `host.docker.internal`. Телефон 390×844, desktop 1440×900. Плавна прокрутка увімкнена, як у звичайного відвідувача; згода «лише необхідні».

| Що | Результат |
|---|---|
| **Плавні переходи за якорем (CSS `scroll-behavior: smooth`, Lenis `anchors` від 1181 px, `scrollIntoView` smooth): відстань верху цілі від її `scroll-margin-top` після зупинки** | **Блокер.** Chrome, клік або посилання з шапки: main 22/22 точно (0 px); гілка — 18 з 22 мимо на −1 010…+1 870 px. Chrome, хеш при завантаженні: 14 з 18 мимо. Main при завантаженні з хешем теж буває мимо: /pro-nas#inquiry 53 px (телефон) і 37 px (desktop), #inquiry на /zernoskhovyshcha і /metalokonstruktsii — 11 px на телефоні; WebKit /yak#etapy на телефоні — 1 604 px. Firefox, клік: 12 з 16 мимо (−773…+2 871 px). WebKit: клік 12 з 16, хеш 10 з 13 мимо (−524…+1 842 px). Влучають близькі цілі (#etapy, #configurator) і більшість хеш-переходів у Firefox. Причина: плавна прокрутка фіксує кінцеву точку на старті, поки блоки по дорозі мають висоту-заступник 1 000 px. Коли блоки малюються, їхня справжня висота зсуває ціль, а прокрутка вже не переціляється. Приклади: «Контакти» в шапці /yak на телефоні — #inquiry за 1 870 px нижче шапки; /yak#koshtorys з інших сторінок на desktop — за 882 px |
| Миттєві переходи (prefers-reduced-motion) | Влучають: Chrome 16/16, WebKit 10/10. Firefox: 1 випадок (−459 px на /yak#inquiry, desktop) |
| Прокрутка вгору півекранними кроками після миттєвого переходу до далекої цілі: на скільки вміст зсунувся більше за крок | Chrome: 0–1 px (scroll anchoring). **WebKit: до 1 856 px за крок** (телефон, /yak#inquiry; на main 0). У WebKit немає scroll anchoring, тому на iPhone/iPad це видимий стрибок вмісту. Firefox: 0 після миттєвого переходу, але після плавного — до 557–873 px на телефоні (на main 0–181) |
| **Reload і Back** (Back після посилання з footer завантажує документ заново): верх блоку до → після. Chrome 156, телефон 390×844 з дотиком і desktop 1440×900. Два незалежні прогони (рев'ю і follow-up) дали байт-у-байт ті самі дані | **Регресія.** Main: 0 px; виняток — /pro-nas#inquiry на телефоні, 14 px (на гілці там 0). Гілка: /yak#inquiry +474 px (телефон) і +882 px (desktop); /zernoskhovyshcha#inquiry −150 і −480 px. /yak#koshtorys, /angary#process, /pro-nas#inquiry — 0. Reload і Back дають однакові числа. Браузер повертає scrollY у пікселях, а блоки над ним ще мають заступник 1 000 px, тож на екрані інший вміст |
| Колесо вгору з Lenis (desktop) після переходу до #inquiry | Chrome 0; **Firefox до 1 033 px, WebKit до 862 px** за крок (main 0) |
| Lenis ≥1181: дно сторінки досяжне, межа оновлюється | Так, усюди: Chrome, Firefox і WebKit, /yak і /angary (Chrome ще й /pro-nas). Footer внизу екрана |
| IntersectionObserver (ProcessMotion, DrawingSheet) | Без змін: `[data-motion]` 5/6 · 6/6 · 2/2 увімкнено після прокрутки, аркуші 1/1 · 3/3, на main так само (Chrome, телефон і desktop) |
| Sticky у блоках (`.rm-head`, `.faq-heading`, `.conversation-intro`) | Положення відносно блоку під час проходу — як на main (Chrome, desktop) |
| `position: fixed` у блоках із правилом | 0 на 10 сторінках × 2 ширини. На load фіксовані лише skip-link, scroll-shield, шапка й банер згоди — усі поза `<main>`. CTA «До заявки» (/angary, планувальник) — сусіди `<main>`; аркуш друку і повноекранне 3D — портали в `<body>`; блок #configurator під правило не потрапляє |
| **Номери полів аркуша** (`sheet-field.css`, ≥1200 px, `counter-increment` на секціях) | Chrome і Firefox: номери ті самі (різниця — згладжування, ≤120 px кадру 160×60). **WebKit: у кожному блоці з правилом «0» замість 2, 3, 4…** Style containment обмежує лічильник блоком. На main у WebKit номери правильні |
| **Друк A4** (Chrome `page.pdf`, 1280 px) | Сторінок стільки ж: 11 / 10 / 8 / 9 / 8 / 5. Текст однаковий на /angary, /pro-nas, /zernoskhovyshcha, /napryamky; на /metalokonstruktsii — той самий, інший порядок. **/yak: на гілці зникають 22 слова** блоку «Відповідальність» — підзаголовок перемикача «Потрібно звести об'єкт комплексно…» і «координує об'єкт / замовник» у шапці таблиці. Відтворено двічі |
| `vitest` | 98 файлів, 1 542 passed |
| `tsc --noEmit`, `eslint .` | чисто |
| E2E на збірці гілки, desktop + mobile chromium, 2 workers (Chrome 156): `anchor-landing`, `smooth-scroll`, `smooth-scroll-idle`, `section-rhythm`, `shorter-pro-nas-yak`, `phase3-shorter-pages`, `angary-editorial`, `angary-route-phone`, `direction-editorial-rhythm`, `direction-route-cards`, `decor-backgrounds`, `sheet-field`, `footer-composition`, `header-current-section`, `grain-page`, `grain-planner-handoff`, `configurator-inquiry-handoff`, `inquiry-brief-handoff`, `configurator-phase4-inquiry`, `ux-conversion-phase2`, `pr-critical`, `yak-formats-scope`, `editorial-focus` | **400 passed, 18 failed**, 126 skipped (10,8 хв); ті самі 18 тестів на main — 18 passed. Список падінь — під таблицею |
| E2E рев'ю: ще 20 специфікацій внутрішніх сторінок, ті самі проєкти, 2 workers | 348 passed, **2 failed**, 180 skipped. Падає `inquiry-error-focus:90` (light і dark, desktop); follow-up відтворив: на гілці 2 з 2 падають з 30-секундним тайм-аутом у `look()`, на main 2 з 2 проходять |
| Повний e2e | Локально не запускав. Main Regression на гілці (`6543f40`) запущено 29.10, результат не чекав: [run 40876619048](https://github.com/leusd100/rubikon-build/actions/runs/40876619048) |
| `anchor-landing.spec.ts` на main | 3 passed (desktop 2, mobile 1; «Контакти» на телефоні пропущено) — разом з рештою 18 тестів, що падають на гілці. Follow-up з тестом reload: main 5 passed, 1 skipped; гілка 4 failed (koshtorys 882 і 388 px, «Контакти» 508 px, reload 882 px на desktop), 1 passed (reload на Pixel 7). Обидва прогони — лише на збірці `9079f47` |

**E2E на гілці — що падає**

- `anchor-landing` ×3 — 882 / 508 / 388 px мимо;
- `smooth-scroll-idle:120` — якір з Lenis мимо на 922 px;
- `grain-page:231/:239` — бюджет висоти: 12,7 екрана при межі 9,15 і 13,9 при межі 12,6; специфікація є в PR-gate;
- `phase3-shorter-pages:56` ×8 — висота /napryamky 7 053–7 299 px при межі 6 600 / 6 200;
- `section-rhythm:59` ×2 — шов cost → FAQ /metalokonstruktsii 300 і 167 px мимо;
- `pr-critical:802` ×2 — /yak без JS: клік по FAQ не вдається 30 с, бо поки блок не намальований, вказівник перехоплює секція;
- `inquiry-error-focus:90` ×2 (знайшло рев'ю) — поля форми /pro-nas, поки вона за межами екрана: тест чекає `animation.finished` переходів полів, а в пропущеному блоці вони стартують лише при примусовому стилі. На main через 300 мс після `checkValidity()` переходів уже немає, на гілці 5 переходів стоять на 0 мс.

Разом **щонайменше 20** тестів, що падають на гілці (без нових `anchor-landing`); повний набір локально не запускав, див. Main Regression вище. Висоти, шов, клік і переходи падають, бо тест міряє блок, який ще не намальовано. Щоб змерджити, ці тести довелося б міняти; я їх не чіпав.

Пошук на сторінці (Ctrl+F) автоматично не перевіряється. Chrome за специфікацією розкриває `content-visibility: auto` для find-in-page, але це не перевірено, а WebKit/Firefox — тим паче.

## Еталони (DEC-18)

Прогноз: специфікації `visual.spec.ts` і `grain-planner-visual.spec.ts`, 37 цілей. Кадри main знято як еталон, гілку порівняно компаратором Playwright з допуском самих специфікацій.

- **Змінюються 2 з 37:** `direction-faq-mobile-375` (ratio 0,04) і `direction-faq-desktop-1440` (0,03) при допуску 0,02 — FAQ /angary.
- Різниця — субпіксельний зсув ліній і тексту (≤1 px). Блок стоїть на іншій дробовій позиції, бо блоки над ним мали заступник 1 000 px.
- Main проти main для цих трьох цілей — 0 змін.

Еталони не оновлено.

## Ризики (чому не мержити)

1. **Якорі — блокер.** «Контакти» в шапці, «Обговорити…», посилання на /yak#koshtorys і #vidpovidalnist з інших сторінок, `revealAttachedBrief` / `scrollIntoView` до форми — у трьох рушіях приземляються на сотні пікселів мимо. Ліків на рівні CSS немає: плавна прокрутка не переціляється після зміни висот на шляху.
2. **iPhone/iPad Safari** (WebKit):
   - стрибки вмісту при прокрутці вгору (немає scroll anchoring);
   - «0» у номерах полів аркуша.
3. **Друк /yak** втрачає частину таблиці відповідальності.
4. **/yak:** третій блок (#etapy) у зоні першого кадру, тож подвійний layout першого кадру лишається, коли він уже розібраний.
5. **Скролбар:** висота документа на старті інша, бо заступники по 1 000 px. Повзунок «плаває», поки блоки малюються вперше.
6. **Reload і Back повертають до іншого вмісту.** /yak#inquiry — на 474 px (телефон) і 882 px (desktop) нижче; /zernoskhovyshcha#inquiry — на 150 і 480 px вище. Сайт переходить між сторінками повним завантаженням документа, тож це кожен Back. Варіанти (б) і (в) цього не лікують: вони стосуються лише переходів за якорями.
7. **JS, що чекає `transitionend`, `animationend` або `animation.finished` у блоці з правилом, може не дочекатися, поки блок за межами екрана.** Так падає `inquiry-error-focus:90`: `finished` не настав за 30 с. Коли стан переходів читають явно (`currentTime`, `playState`), вони вже завершені через 1,5 с. Зараз такого коду в блоках з правилом немає: `ConfiguratorSummary` — у #configurator, поза правилом; `ScopeCells` — на HOME.

**Варіанти для власника:**
- (а) не робити MT-03 зараз — рекомендую. MT-01/MT-04 (#262) уже знімають частину роботи стилів;
- (б) миттєві переходи за якорями — дизайнове рішення. На main з #261 Lenis уже має `anchors: false`, а плавний перехід робить onAnchor у SmoothScroll через Lenis `scrollTo`. Тож (б) — це `scroll-behavior: auto` плюс onAnchor без плавності. Питання WebKit (2, 3) і reload/Back (6) лишаються;
- (в) JS, що малює блоки на шляху перед плавним переходом або доцілює після нього — нова логіка на кожному шляху прокрутки, ціна layout переходить у момент кліку (INP). Reload/Back (6) лишається;
- (г) лише footer — неперевірений кандидат, −6…−15 %.

Будь-яка майбутня спроба MT-03 має проходити `anchor-landing.spec.ts`, разом з тестом reload.

## Не перевірено

- Справжні iPhone/iPad Safari, Android.
- Пошук на сторінці.
- Ширини 768–1180 і темна тема.
- Linux CI (еталони) — прогноз зроблено на macOS.
- Час (TBT / S&L / LCP) — не виміряно.
- Повний e2e — лише Main Regression на гілці, результат не чекав.
- `anchor-landing.spec.ts` — лише на збірці `9079f47`. На збірці поточного main (Lenis `anchors: false` + onAnchor з #261) не запускав. Зробити це перед перенесенням тесту в main.
- Reload і Back у Firefox і WebKit.
- Повноекранне 3D: відкривав лише за кодом (портал у `<body>`), кліком 3D не вмикав.
- Firefox/WebKit перевірено лише на /yak, /angary і /pro-nas.

## Докази

Сирі дані й скрипти — в архіві дослідження (`implementation/content-visibility-inner/`, `SHA256SUMS` там же). Ключові файли:

| Файл | SHA-256 |
|---|---|
| `raw/cvcheck-chrome.jsonl` — якорі, Lenis, рух, sticky, Chrome | `80059cce829e9fd52946f1ed0bfcaf10b2847b0063fa744b33d81d985cb4f054` |
| `raw/cvcheck-chrome-reduced.jsonl` — миттєві переходи і прокрутка вгору, Chrome | `c6c50c9d7b963f4362bd3f6aa220fbe3a78790a4656040511eefa89f65fbb393` |
| `raw/cvcheck-firefox.jsonl` | `d3a8b52f9ffebf81ec5976b8b645490a41eb978736ae1bbe9a31b515c4fa6760` |
| `raw/cvcheck-webkit.jsonl` | `0d369fb8e0bca92fd9c0cb0cde3a9979a51fdde15e23fa26b1d63b34a0661d85` |
| `summary-behaviour.txt` — зведення трьох рушіїв | `11de76e99017860ee64af8e225243fe5073bb623ecf0537bfe666242d8da97e3` |
| `raw/layout-build-mobile.jsonl` | `3b085857e184f75c0c62186dbee816a83bfa87831869016007a4d250eae4dd31` |
| `raw/layout-build-desktop.jsonl` | `2bf10d125819e9244fd13d60745dbbfa9fde8aa345882538d1e2a5f331946019` |
| `summary-layout.txt` | `9f8fa7ae613ee4fcf9bc71e2680c64acffb4b750140467f85ea4cd82e1672045` |
| `raw/scope-mobile.jsonl` — порівняння обсягів | `64c1744d40e34317eb40360f29ba6a93ecb70f90ac69352c10d75fff10d3cbe8` |
| `raw/fcpframe-angary.jsonl` — FCP-задача /angary | `20c48b0728e16a9a9248b56ec773f351d4472ef810875cea2ba942f64b0f5539` |
| `raw/fcpframe-yak.jsonl` — FCP-задача /yak | `1424522a363acf48c6d3017a2b19d3dd75bcd9ea6ca7992906764138bd61b598` |
| `raw/fixedscan-branch.jsonl` — `position: fixed` проти блоків з правилом | `76005435b02faa5c24580592771063fa7bd95efece77e93d7c0363417a3697e9` |
| `raw/print.jsonl` | `4afad49c50e85b0966e4658f7135486dfe20982bc3dec0fe8f689d63d95f645f` |
| `print/print-main-yak-pratsyuiemo.pdf` | `1bd31e61fa81fb9d198ceb108c826e6c231c87cc4197988f8d8f4ca3aaf6a7a5` |
| `print/print-branch-yak-pratsyuiemo.pdf` | `a8edbe6f68b0c0f5181ca3782a97a4ad8efeebc6769b0907c771f4a542ab5f41` |
| `shots/webkit-main-bubble-yak-pratsyuiemo-4.png` — «4» | `a17dae3dc3c599328a916fdafc377fb89c7322fb76564ab15d55db374810cc70` |
| `shots/webkit-branch-bubble-yak-pratsyuiemo-4.png` — «0» | `df8b3b23b6b531a5b69358c17616b20767bede5430aecba1d04b7d6c3fa52a81` |
| `visual/…/direction-faq-desktop-1440-diff.png` | `d0a54b6701220acea3ea8a8d69002d9d263496cb731eec87c9f372b5aed6af81` |
| `e2e/e2e-branch.log` | `a4fda2f9d1c9d6a0ee58746feb49cac9446bb5d3cc75ce5e73284aba1dd4be12` |
| `e2e/e2e-main-failing.log` | `aa82f9203c5618365db979d771a84e8ed58460da851b7352478b61e41a31f84f` |
| `raw/restore-followup.jsonl` — reload і Back, Chrome (той самий SHA, що в рев'ю) | `b824a92e0772685ca1124603c02521c5329c6aad98bc61f5a6cbc8a662b6bbb2` |
| `raw/anim-followup.txt` — переходи полів /pro-nas #inquiry | `8f5302533fdfb9ec8a84fc0e70a5f1b9e0c91301fd1785d51ddd0c2ac6104b65` |
| `e2e/e2e-inquiry-error-focus-90.log` — гілка, потім main | `cf001dca209f3b6aeb4dce684b435147148e9461a1364ac7fce75408b211b76f` |
| `e2e/e2e-anchor-landing-followup.log` — гілка, потім main | `eb7473b56498eee91af53d4e22a9791ea230a12c5fe49d9e56b78365d510cb1f` |
| `e2e/e2e-branch-extra.log` у доказах рев'ю — 20 додаткових специфікацій | `98bb7bcace2329e40f8ba14adfa296a28215adb5bf3aee40d43e19264de00ba6` |

## Відкат

PR тримається в Draft. Ruleset merge не блокує, тож Draft — єдиний запобіжник. Якщо колись злито — `git revert` коміту PR. Тест `anchor-landing.spec.ts` варто перенести в main окремо: він проходить на збірці `9079f47` і стереже будь-яку майбутню спробу MT-03. Перед цим його треба прогнати на збірці поточного main.
