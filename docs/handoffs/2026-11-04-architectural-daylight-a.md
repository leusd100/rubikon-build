> Продовження 05.11.2026: HOME FrameTour отримав світлий інженерний аркуш. Деталі — [handoff](2026-11-05-light-frame-tour.md), [галерея](../../design-assets/reviews/architectural-daylight/light-frame/index.html). Попередні згадки темного FrameTour нижче описують A/A2 до цього уточнення; ProofContour із фото лишається темним.

# Handoff · Architectural Daylight A — макет світлої теми

| | |
|---|---|
| Дата | 2026-11-04 |
| Виконавець | Codex / звичайний Work |
| Підстава | Власник погодив створення макета A, потім попросив PR для власної перевірки. |
| PR | Draft; посилання — у PR цієї гілки. Merge і production deploy потребують окремого рішення власника (DEC-30). |
| Гілка / base | `design/architectural-daylight-a` від актуального `main` `503a438b2d74f8f0d765e322c0372324e7366c1e`; SHA повторно перевірений перед PR. |
| Змінено | `app/daylight-prototype.css`; його підключення і `data-daylight="a"` в `app/layout.tsx`; офлайн-галерея та цей handoff. |
| Не змінено | Механіка тем, ThemeControl, фото/відео та preload, SVG-геометрія/внутрішні токени, тексти/атрибуція, footer, package/lock, governance, DEC-18, PR #268. |

## Що було

Більшість площі поточної Light лишається темною: header, hero, HOME EngineeringSignature і conversation. Через це зміна режиму виглядає слабкою. Production зафіксовано фактичними браузерними знімками `/`, `/angary`, `/pro-nas` при 1440×1000 і 390×844, Light та Dark (12 комбінацій, 24 PNG: повна сторінка й hero).

## Що зроблено

Один CSS-файл, усі правила потребують `html[data-theme="light"][data-daylight="a"]`:

- теплий паперовий header, графітова версія оригінального логотипа й іконок, мідний дзвінок; включно зі scroll/mobile menu;
- світла «калька» hero над поточними медіа, графітові заголовки й читабельні CTA;
- паперова зовнішня HOME EngineeringSignature; технічні FrameTour та ProofContour — темні планшети з незмінними кольорами снігу/вітру;
- існуючі картки реального ангара і команда — світлі підписи, графітова типографіка; атрибуція до створення RUBIKON та «Ілюстрація» збережені;
- світла conversation із наявним вектором контурів і читабельною формою. Псевдошар вектора живе на `.conversation-grid`, щоб не перекривати 1px вісь sheet-field.

`data-daylight="a"` навмисно активний у layout цієї гілки. Це поведінка прототипу для перегляду, а не production feature flag. Перед можливим впровадженням потрібні погодження вигляду, freeze і окреме рішення про перенесення стилів у тематичні файли.

Тимчасовий launcher `public/__daylight.html` вилучено перед PR: чинний `public-no-internal-pages` забороняє окремі HTML у public/. Тест не змінювався. Офлайн-галерея лежить у `design-assets/reviews/architectural-daylight/` і не входить до asset-публікації.

## Уточнення A2 після візуального перегляду власника

- Видалено загальний горизонтальний світлий wash HOME; тон нижньої площини hero — `#E7E2D9`. Верх медіа природніший, під текстом збережено захист.
- Header повторює нативну поведінку без нового JS/blur: 92% при top, 100% після 32px, 97% із меню. Відновлено media-mask HOME/About. П’ять падінь hero job у першому CI цієї гілки були очікуваннями цих станів; незмінений повний suite тепер проходить 68/68 локально.
- Light-ролі hero узгоджені на всіх стандартних публічних напрямах, каталозі й «Як працюємо»; legacy preview без `.phone-hero` виключено. Мідні hero CTA використовують існуючі Light action-токени.
- 10 основних сторінок × 1440/390: 20 комбінацій візуального перегляду, без переповнення/помилок сторінок. Додаткові header/menu/Dark стани Chromium/WebKit — 16/16.
- Знайдено і виправлено окремий first-visit/short-screen випадок `/napryamky`: високоспецифічний нативний overlay брав старий темний `--directions-phone-early-shade`. Його Light-відповідник не змінює геометрію 3:2 фото, тему або згоду.
- 68 вибіркових текстових рядків на 6 складних hero-сценаріях (включно зі свіжим відвідуванням 320/390) пройшли консервативну оцінку текстових прямокутників: нормальний текст ≥4,5:1, великий ≥3:1. Тло виміряне після приховування текстової групи та завершення CSS-переходів; це не глобальна WCAG-сертифікація чи перевірка кожного відеокадру.
- Typecheck/lint/build пройшли. Незалежне рев’ю не знайшло блокерів для Draft. Жодних змін тестів, еталонів, логіки тем, медіаджерел чи SVG.

Додаткові знімки: [живий hero A2](../../design-assets/reviews/architectural-daylight/home-a2-live.png), [перший показ каталогу](../../design-assets/reviews/architectural-daylight/napryamky--390-fresh.png), [«Як працюємо»](../../design-assets/reviews/architectural-daylight/process--1440.png).

## Перевірка

| Перевірка | Команда / метод | Результат |
|---|---|---|
| Лінт | `npm run lint` | pass |
| Типи | `npm run typecheck` | pass |
| Усі unit | `npm run test:unit` | 112 файлів; 1777 pass, 1 skip |
| Збірка | `npm run build` | pass; звичайне попередження про chunk >500kB |
| Критичні браузерні тести | Production build, `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173 PLAYWRIGHT_USE_PRODUCTION_BUILD=true npm run test:e2e:critical` | 60/60 pass (23,2s) |
| Цільова browser QA | Chromium 151.0.7922.34 і Playwright WebKit 27.2; не фізичний iPhone/справжній Safari | System/Light/Dark до hydration; перемикачі після hydration; reload, навігація, клавіатура й фокус — pass |
| Responsive | 320/390/430/768/1440, три пріоритетні сторінки, обидва рушії | без горизонтального переповнення; header/scroll/menu — pass |
| Контраст зміненого header/menu | Обчислення CSS-композиції, включно з мідною підкладкою | мінімум 5,03:1 для перевіреного тексту; це не повний аудит WCAG |
| Dark preservation | `/angary` 1440 і 390 з увімкненим/вимкненим prototype-атрибутом | pixel-identical і computed-style-identical в обох рушіях |
| FrameTour | 224 descendants, text/fill/stroke/custom tokens, desktop/mobile | збігаються з базою в обох рушіях |
| ProofContour | «Сніг» і «Вітер», desktop/mobile, обидва рушії | 8/8: активний стан і видимі сині/бірюзові шляхи збережені |
| Hero network | 8 cold-load сценаріїв Chromium `/angary` | рівно один правильний hero-файл |
| Reduced motion | емуляція `prefers-reduced-motion` | врахована; smooth scrolling і довга анімація вимкнені в перевіреному service-view |
| JS impact | однаковий dev-сервер, атрибут on/off | однакові JS URL і decoded bytes, дельта 0 |
| Незалежне рев’ю | окреме read-only рев’ю фінальних CSS/layout і browser evidence | блокерів для Draft PR немає; launcher вилучено |

CI для цього diff вибирає planner і hero playback (разом із theme/artwork/node ordering); їхній віддалений результат дивитися в checks PR. Локально повторно пройдено Fast Gate і 60 критичних браузерних тестів; попередня цільова QA описана вище.

Збережені фінальні скриншоти: шість аркушів у галереї, по три режими на кожному. Браузерних console/request/HTTP помилок під час захоплення не було. Відеокадри різних режимів можуть відрізнятися моментом зйомки; cookie banner нового відвідувача збережений. Аркуші — матеріали для огляду, не visual baselines.

## Еталони

Не змінювались. Це `design/*` prototype без `visual-freeze`: піксельні CI-набори відкладені штатним правилом репозиторію. Функціональні перевірки блокують як звичайно. Не додавати freeze і не переписувати еталони до рішення власника.

## Успадковані червоні перевірки

Нових підтверджених регресій у цільовій QA немає. Загальний стан усіх віддалених CI-наборів визначається checks цього Draft PR, не цим локальним звітом.

WebKit у чотирьох сценаріях зі збереженою темою, протилежною OS, запитує обидва hero-варіанти; 4/4 порівнянь без атрибута дали ту саму поведінку. Це обмеження бази, не нова регресія.

## Ризики

- Світла калька навмисно послаблює фотографічність hero. Оцінити власнику на 390 та 1440.
- Спільні header/conversation і стандартні публічні hero змінюються в Light. Основний пакет повних порівнянь — HOME, `/angary`, `/pro-nas`; інші основні сторінки також переглянуті на 1440/390 в A2.
- Релізна відсутність регресії LCP/CLS не доведена. Production baseline: 12 незадушених одиничних локальних вимірів, LCP 440–1332ms, початкові layout shifts 0. Dev-заміри прототипу не є чесною парою до production. CSS ≈3,4kB gzip; пакетів/JS застосунку не додано.
- Після погодження вигляду потрібні freeze, перевірка production performance та доступності змінених сторінок. WebKit-емуляція не замінює справжній Safari.

## Що перевірити власнику

1. [Мобільний hero: поточна Light / A / поточна Dark](../../design-assets/reviews/architectural-daylight/hero-comparison-mobile.png).
2. Усі секції трьох сторінок: [офлайн-галерея](../../design-assets/reviews/architectural-daylight/index.html); [HOME 1440](../../design-assets/reviews/architectural-daylight/home--1440.png), [HOME 390](../../design-assets/reviews/architectural-daylight/home--390.png), [Ангари 1440](../../design-assets/reviews/architectural-daylight/angary--1440.png), [Ангари 390](../../design-assets/reviews/architectural-daylight/angary--390.png), [Про компанію 1440](../../design-assets/reviews/architectural-daylight/pro-nas--1440.png), [Про компанію 390](../../design-assets/reviews/architectural-daylight/pro-nas--390.png).
3. Чи приймаємо виразно світлий hero, паперовий інженерний аркуш, світлі контакти. Альтернатива для наступної ітерації — більш фотографічний hero з локальним темним захистом білого тексту; тут послідовно реалізовано A.

Живий макет у checkout гілки: `npm run dev -- --host 127.0.0.1 --port 4175`, звичайні `/`, `/angary`, `/pro-nas`; обрати «Світла» чинним перемикачем. Для статичної галереї: `python3 -m http.server 4176 --bind 127.0.0.1 --directory design-assets/reviews/architectural-daylight`.

## Відкат

Не мерджити цей Draft до рішення власника. Локально прибрати `data-daylight="a"` — усі правила прототипу стають неактивними. Повне вилучення: прибрати CSS import/атрибут і файл стилів; робоча механіка тем не потребує відновлення.

## Пропоновані оновлення control (лише після OK)

Немає. Governance/control і налаштування GitHub/Cloudflare не змінені.
