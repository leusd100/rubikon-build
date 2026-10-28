# Handoff · Мертві компоненти HOME Slice 02 і /napryamky та їхній CSS

| | |
|---|---|
| Дата | 2026-10-27 |
| Виконавець | Claude Code |
| Підстава | Engineering Excellence brief 27.10, знахідки DC-03, DC-04 (з поправками незалежної перевірки) |
| PR | [#259](https://github.com/leusd100/rubikon-build/pull/259), ready for review (позначено власником 27.10). Merge — за OK Дмитра 28.10 «як тести будуть проходити»; merge у `main` запускає production-деплой (Workers Builds) |
| Гілка / base | `chore/dead-css-components` від `main` `9079f47` |
| Коміти | **`010e9ab`** — код і тести · `536b277` — два застарілі коментарі в `globals.css` · наступний — цей handoff |
| Змінено | Видалено `app/components/HomeSections.tsx` (149 рядків). З `app/components/DirectionCards.tsx` — `EngagementFormatCards`, `EntryPointsNote`, `DirectionRouteList`, `formatIcons` і їхні імпорти (лишився живий `DirectionImageCards`). CSS, який малював лише їх: 80 правил і один селектор (`.cost-grid h3` у спільному правилі з `.use-case-grid h3`) у `app/globals.css`. DC-03: `.entry-points-list` (7 правил) і `.promise-visual img` / `:hover img` у `globals.css`, `.hv2-contour-chips` (2) у `app/home-v2.css`, `.angary-structure` (3) у `app/angary/angary-editorial.css`, `.about-story-section .promise-visual:hover img` у `app/pro-nas/about.css`; токени руху `--site-for-photo-zoom` і `--site-for-photo-tint`, які читало лише `.promise-visual img`. Застарілі коментарі про `.cost-grid` і `.promise-visual img` (`globals.css`, `DirectionDetail.tsx`, `ResponsiveImage.tsx`) і рядок у `docs/ui-system-v1.md`. Тести: `tests/unit/home-proof.test.ts`, `tests/unit/public-service-claims.test.ts` |
| Не змінено | `logo-lab`, `.detail-steps`, утиліти Tailwind і шар `@property` (DC-06, DC-08 — рішення власника). `GhostWord` / `.ghost-word`, `.copy-column`, `entryPoints()` (див. «Ризики»). Живі класи поруч із мертвими: `.route-service`, `.route-service-list`, `.card-icon`, `.promise-visual`. Візуальні еталони |

## Що було

**Мертві компоненти (DC-04).** `HomeSections.tsx` — чотири блоки HOME Slice 02: `HomeCapability` (з `ContactBridge` усередині), `HomeFirstConversation`, `HomeProofSlot`. Жоден маршрут не імпортує файл з #125 (HOME v2, `e1172cd`, 30.09); `HomeProofSlot` тримав лише `tests/unit/home-proof.test.ts`, а сам файл — ще список у `public-service-claims.test.ts`. У `DirectionCards.tsx` `EngagementFormatCards` і `EntryPointsNote` не мають виклику з #124 (`16bf52cc`, 29.09), `DirectionRouteList` — з #134 (`56a5bd48`, 01.10). Їхній JS збирач уже викидав (текст цих блоків — у 0 файлах `dist` і на main), а CSS не викидається: 80 правил `globals.css` їхали в `index.css`, який блокує рендер на кожній сторінці.

**Правила без елемента (DC-03).** JSX пішов, правила лишились: `.entry-points-list` (#181), `.hv2-contour-chips` (#165, e2e і так перевіряють, що його 0), `.angary-structure` (#158). `.promise-visual img` і `:hover img`: під `.promise-visual` на /pro-nas — лише SVG-креслення (`div`, `svg`, `path`, `g`, `text`, `circle`), `<img>` немає.

**Тест «без порожньої рамки».** Правило «поки немає схваленого об’єкта — жодної рамки й жодного «незабаром»» перевірялось лише на мертвому `HomeProofSlot`; живий `EngineeringSignature` (HOME) такого unit-тесту не мав. Тести запису `homeProofCase` у тому самому файлі — живі: цей запис показують HOME і /angary.

## Що зроблено

- **Видалено** `HomeSections.tsx` і три функції `DirectionCards.tsx` з `formatIcons` та імпортами (`lucide-react`, `entryPoints`, `formatCards`, `DeliveryFormatId`).
- **CSS — рівно список перевірки DC-04** (26 класів, 80 правил і один селектор у `globals.css`) плюс 15 правил DC-03. Скрипт порівняння правил джерела (postcss, multiset main ↔ гілка) показує: інших видалень і додавань немає; дві «зайві» відмінності — це прибрані токени в `:root` і обрізаний селектор.
- **Токени** `--site-for-photo-zoom` і `--site-for-photo-tint` з коментарем: єдиним читачем був `.promise-visual img`. `motion-tokens.test.ts` їх не вимагає.
- **`home-proof.test.ts`:** два тести на живому `EngineeringSignature`. Без запису: секція `#engineering` є, `#real-object` немає, немає `figure` / `picture` / `img`, немає «Фото об’єкта», «об’єкт до створення», «незабаром», «скоро», «coming soon». Зі схваленим записом: є `#real-object`, атрибуція, кожен рядок складу робіт, і немає `caseId`. Тести запису `homeProofCase` — без змін. Чотири тести розкладки `HomeProofSlot` пішли разом із ним; розкладку живого листа перевіряють `home-proof-contour.spec.ts` і `pr-critical.spec.ts`, а «роботи до створення RUBIKON BUILD, не «Виконала наша команда»» — `pr-critical.spec.ts:256-257` (HOME) і `angary-real-object.test.ts` (/angary).
- **`public-service-claims.test.ts`** сканує живий текст HOME — `app/components/home-v2/*.tsx` — замість видаленого файлу. Незалежна перевірка вже звірила ці файли з усіма вісьмома забороненими формулюваннями; повний `vitest` це підтверджує.
- **Коментарі**, що називали `.cost-grid` і `.promise-visual img` живими: `globals.css` (3), `DirectionDetail.tsx`, `ResponsiveImage.tsx`, `docs/ui-system-v1.md`. Зібраний `index.css` від цього не змінюється (той самий хеш `index.CEu_gz-G.css`).

## До / після

Детерміновані байти: `main` `9079f47` (локальна збірка) проти гілки, усі стилі, які сторінка підключає; raw / gzip -9 / brotli q11 (node zlib).

| Файл | main | гілка | Δ |
|---|---|---|---|
| `index.css` (усі сторінки) | 155 599 / 28 653 / 23 874 | 146 992 / 27 171 / 22 784 | −8 607 / −1 482 / **−1 090** (−4,6 % br) |
| CSS сторінки HOME | 90 986 / 14 889 / 12 913 | 90 673 / 14 845 / 12 881 | −313 / −44 / −32 |
| CSS сторінки /angary | 8 786 / 2 277 / 1 964 | 8 580 / 2 237 / 1 935 | −206 / −40 / −29 |
| CSS сторінки /pro-nas | 27 773 / 5 909 / 5 266 | 27 711 / 5 902 / 5 257 | −62 / −7 / −9 |
| Усі стилі: HOME · /angary · /pro-nas · решта 7 сторінок | | | br −1 122 · −1 119 · −1 099 · −1 090 |

Це збігається з прогнозом обох перевірок (DC-04: br 23 874 → 22 917 лише для свого набору; DC-03: −122 / −32 / −29 / −9 br). Час завантаження не вимірювався: ~1,1 KB br на файлі з immutable-кешем — близько 5 мс холодного завантаження при 1,6 Мбіт/с (розрахунок). **Покращення часу статистично не встановлено**; користь — супровід.

## Перевірка

Середовище: `main` `9079f47` і гілка, локальні `vinext build` + `vinext start`, Chrome 156 (headless, `channel: 'chrome'`), macOS; машину одночасно навантажували інші агенти (load average 70–240), тож час тестів орієнтовний, а лічильники, байти й тексти — детерміновані.

| Що | Результат |
|---|---|
| Елементи під кожним видаленим класом і селектором (29 класів + `.promise-visual img`, `:hover img`, `.about-story-section .promise-visual:hover img`, `.angary-structure + .angary-real`), 10 сторінок × 2 ширини (1440, 390), main і гілка, прокрутка до кінця | **0** у всіх 40 завантаженнях |
| Скрипт перевірки DC-03 (7 сторінок × Pixel 7 / 1440), main і гілка | 0 для всіх 18 селекторів; під `.promise-visual` — лише `div svg path g text circle`; лічильники однакові |
| Скрипт перевірки DC-03 з MutationObserver від початку документа (8 завантажень), main і гілка | жоден видалений клас ні разу не з’являється; з 52 утиліт Tailwind — лише `sr-only`; однаково |
| Скрипт перевірки DC-04 (10 сторінок + 404 × 2 ширини), main і гілка | 0 елементів з 26 класів; кількість вузлів однакова 22 / 22 |
| `innerText`, будова DOM (тег + клас кожного елемента), кількість вузлів, живі контролі (`.promise-visual`, `.route-service`, `#real-object`, `.angary-real`, `.hv2-contour-legend`) | однакові в 20 / 20 парах |
| `body.textContent` разом із вбудованим RSC | однаковий 10 / 10 після маскування хешів імен файлів (відрізняється лише `index.CPuWptCy.css` → `index.CEu_gz-G.css`); контроль main ↔ main — однаковий без маскування |
| Текст видалених блоків у `dist` («Що підготувати до першої розмови», «Можна почати з того, що вже є», …) | 0 файлів і на main, і на гілці; живий контроль «Як ми дивимося на об’єкт» — 1 і 1 |
| Видалені класи й токени в `dist` | 2 файли (клієнтський і серверний `index.css`) → 0 |
| Клієнтський JS | 84 ↔ 84 файли, 2 031 717 ↔ 2 031 717 B; кожен однаковий після маскування хешів і ідентифікатора збірки |
| Серверний JS (у браузер не йде) | 2 855 031 → 2 854 930 B: без іконок lucide з `DirectionCards` збирач розбив один спільний чанк інакше; HTML однаковий (рядки вище) |
| `motion-diff --base 9079f47` | 1 відмінність у 41 файлі — перехід видаленого `.promise-visual img` |
| `vitest` | 98 файлів, **1540 passed** (main: 1542 — −4 тести розкладки `HomeProofSlot`, +2 на `EngineeringSignature`) |
| Мутація 1: без запису `EngineeringSignature` малює `<figure id="real-object">` з «Фото об’єкта — незабаром» | тест «draws no proof…» падає (1 failed з 5) |
| Мутація 2: `ProofStage` друкує `caseId` | тест «…never prints the internal case id» падає (1 failed з 5) |
| `tsc --noEmit --incremental false`, `eslint` | exit 0, exit 0 |
| E2E локально, desktop + mobile chromium: `smoke`, `pr-critical`, `home-proof-contour`, `editorial-focus`, `angary-editorial` (344 тести) | **не доказ**: прогін перервано на перевантаженій машині (load ~100, воркер примусово зупинено); 172 passed, 31 failed — повільні/таймаутні тести `home-proof-contour`, `smoke`, `public-service-claims`, `pro-nas-practice` (`e2e-A-branch.txt`, SHA-256 в архіві) |
| CI PR Gate на `536b277` | **усі обрані набори зелені**: Fast Gate, Changed-area visual regression (Linux-еталони), Hero playback, Planner 1–2/2, Configurator 1–2/2; Inquiry і Leads — пропущені за класифікацією |
| Повний e2e | Main Regression на гілці — запущено 28.10, результат у PR |

## Еталони (DEC-18)

Локальний прогноз на macOS не завершено (прогін перервано разом з e2e). Повносторінкові знімки HOME і /angary main ↔ гілка відрізняються не більше, ніж main ↔ main (максимальна різниця каналу 11–20 проти 10–15, пікселів зі зсувом > 64 — 0). **CI: Changed-area visual regression на Linux-еталонах — pass** на `536b277`; повний visual — у Main Regression. Еталони не оновлено.

## Ризики

- **Дуже низькі для сайту.** Видалені правила не мали елемента в жодному перевіреному стані; тексти, DOM і клієнтський JS однакові. Якщо колись повернуть `<img>` у `.promise-visual` або клас `.cost-grid`, він прийде без стилю — це навмисно.
- **Токени M1-1.** Handoff M1-1 залишав `--site-for-photo-zoom` і `--site-for-photo-tint` «на рішення власника»; незалежна перевірка радить прибрати їх у цьому PR. Потрібне коротке «так» — або повернути два рядки в `:root`.
- **Що лишилось мертвим.** `GhostWord` (`SiteChrome.tsx`) і 7 правил `.ghost-word` (одне — у спільному селекторі), `.copy-column` (6 правил, частина — у спільних селекторах) і `entryPoints()` викликав лише видалений код. До списку перевірки DC-04 вони не входили — окремим кроком (e2e уже перевіряють, що `.ghost-word` 0).
- **Тест на справжньому записі.** Другий тест `EngineeringSignature` бере `homeProofCase` — те, що HOME публікує насправді (його `caseId`, атрибуцію й склад робіт), а не синтетичний кадр. Якщо запис колись приберуть, тест упаде — так само, як уже впаде третій тест файлу, що вимагає саме цей запис.

## Не перевірено

- Firefox, WebKit, справжній Safari й пристрої — не запускались (правило без елемента нічого не малює в жодному рушії).
- Еталони Linux (CI) — прогноз знято в Chrome на macOS; остаточно — Main Regression.
- Lighthouse і час завантаження — не мірялись: ~1 KB br тоне в шумі навантаженої машини.
- Повний e2e (89 специфікацій) — лише ті, що згадують видалене, і `smoke`.
- Production — не розгортався.

## Відкат

Після squash-merge — `git revert` коміту PR. Видалений код відновлюється з історії: `git show 9079f47:app/components/HomeSections.tsx`.
