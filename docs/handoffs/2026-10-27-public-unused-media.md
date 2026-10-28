# Handoff · public/: без медіа, яких сайт не запитує

| | |
|---|---|
| Дата | 2026-10-27 (усі перевірки повторено 2026-10-28) |
| Виконавець | Claude Code |
| Підстава | Engineering Excellence brief 27.10, знахідки DC-01, MD-08, DC-02. DC-01 (звіт 03 «Codebase and dead code») — незалежна перевірка PARTIAL з поправками, їх застосовано. MD-08 (звіт 07 «Media delivery») — частина про майстри генераторів. DC-02 — не чіпаємо, рішення власника |
| PR | [#260](https://github.com/leusd100/rubikon-build/pull/260), Draft. **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `chore/public-unused-media` від `main` `9079f47` (#256) |
| Коміти | **`f2e823e`** — файли, скрипти й тест · наступний коміт — цей handoff |
| Змінено | Видалено з `public/` 138 файлів: групи аудиту D, E, G, H, J (128 файлів, 47,03 MiB) і 10 PNG-майстрів `public/media/direction-hero-source/`, `public/media/directions-sequence-source/` (25,60 MiB). Майстер `/yak-pratsyuiemo` перенесено: `public/media/process-hero-source/yak-pratsyuiemo.webp` → `design-assets/process-hero/` (байти ті самі). `scripts/generate-direction-hero-images.py` — без наборів `direction-hero` і `directions-sequence`, `process-hero` читає з `design-assets/`. Видалено `scripts/generate-home-v2-crops.py`, `scripts/generate-phone-hero-stills.py`, `scripts/capture-angary-editorial-assets.mjs`. `tests/unit/home-hero-media.test.ts` — без двох phone-монтажів. `app/data/processHeroImage.ts` — лише шлях майстра в коментарі |
| Не змінено | Код застосунку: компоненти, маніфести, CSS, `proxy.ts`, `worker/`, конфіги. Група B — `public/media/reviews/` (DC-02, рішення власника). Група F — бренд-кіт `public/brand/` (його читає `tests/unit/brand-assets.test.ts`, а зовнішні посилання невідомі). Favicons (I). Жоден файл, на який є хоч одне runtime-посилання. Історичні документи в `docs/`, що згадують видалені файли. Тести, бюджети, CSP, еталони DEC-18 (0 PNG). Залежності (0 нових) |

## Що було

**Мертві медіа в деплої.** На `9079f47` у `public/` 719 файлів, 148 701 756 байт. Аудит DC-01 знайшов 367 з них (86,0 MiB), які Wrangler деплоїть, production віддає з 200, але жодна сторінка не запитує (0 запитів у 20 завантаженнях аудиту). Причина — генератори пишуть у `public/`, а коли медіа замінювали, старі виходи й майстри лишались: phone-монтажі HOME і /pro-nas пішли зі сторінок у #136 (02.10) і #141 (03.10), `direction-hero-*` — у c03bd8f (#190, 13.10), кліпи `-v2` — у #197 (16.10), phone-ілюстрації — у #243 (24.10), а `competence-*`, `/images/*`, `directions-montage.mp4` — ще в серпні–вересні. Вплив на відвідувача нульовий (сторінки цих файлів не завантажують), тому перевірка понизила вагу P2 → P3. Користь — у порядку: видно, який файл живий; повний прогін генератора героїв більше не відтворює 60 мертвих файлів; внутрішні майстри по 2,5 MB перестають бути публічними URL; деплой і кожен checkout CI легші.

Групи аудиту (класифікація `public-categories.json`), які прибирає цей PR (байти — з `git ls-tree` на `9079f47`):

| Група | Що це | Файлів | Байт |
|---|---|---:|---:|
| D | застарілі mp4: phone-монтажі HOME і /pro-nas, кліпи `-v2` до SW-01, кліпи /pro-nas до ретайму, `directions-montage.mp4`, `hero-steel-frame.mp4` | 14 | 28 167 570 |
| E | витіснені Phase 6 responsive-варіанти `direction-hero-<напрям>-*` і `directions-sequence-<напрям>-*` | 60 | 7 271 630 |
| G | старі stills і постери (`hero-h1-*`, `hero-mobile-band-*`, `about-p5-*`, `about-phone-*`, `hangar-wide/narrow-*`, `architect*`, постери монтажів) | 23 | 5 235 942 |
| H | 4 знімки конфігуратора `/media/angary/*.jpg` | 4 | 133 778 |
| J | медіа серпня–вересня без посилань (`/images/*`, `competence-*`, `hero-steel-frame.*`, `steel-*` …) | 27 | 8 507 716 |
| C | майстри генератора: 10 PNG двох непотрібних наборів (видалено) + `yak-pratsyuiemo.webp` (перенесено) | 11 | 27 053 607 |
| | **разом з `public/`** | **139** | **76 370 243** |

**Тест, що стеріг мертві файли.** `tests/unit/home-hero-media.test.ts:7,9` перевіряв 5 MB-бюджет `home-phone-montage.mp4` і `about-phone-montage.mp4` — файлів, яких сайт не віддає з #136 / #141: телефони HOME (≤ 760 px) і /pro-nas (≤ 600 px) отримують still. Без правки тесту видалення групи D валить unit-job PR-гейта: версія тесту з `main` на дереві гілки — 2 × ENOENT.

**Генератори, що повертали б мертві файли.** `generate-direction-hero-images.py` генерував два набори, з яких сайт не бере жодного файла (60 файлів групи E), з майстрів у `public/media/*-source/`. `generate-home-v2-crops.py` — усі три його JOBS пишуть групу G (і читав `public/media/directions-sequence-source/angary.png`). `generate-phone-hero-stills.py` пише лише `hero-h1-*` і `about-p5-*` (група G). `capture-angary-editorial-assets.mjs` перезаписував групу H у `public/media/angary/`.

## Що зроблено

- **Видалено 138 файлів** груп D, E, G, H, J і 10 PNG-майстрів C. Перед видаленням кожен файл перевірено ще раз (див. «Перевірка»): 0 посилань у коді застосунку, у зібраних `dist/server` і `dist/client`, у HTML 18 шляхів; 0 запитів у 60 завантаженнях Chrome.
- **Майстер `/yak-pratsyuiemo` — у `design-assets/process-hero/`**, як майстри Phase 6 (`design-assets/direction-hero-photo-variant/`, `direction-hero-blue-hour/`, `directions-sequence-concepts/`), щоб не деплоївся. Коментар у `processHeroImage.ts` вказує новий шлях.
- **Генератор героїв** не має наборів `direction-hero` і `directions-sequence`; прибрано їхній словник `SEQUENCE_PORTRAIT_POSITIONS` і гілку, яка його обирала (портрети /napryamky беруть `SEQUENCE_CONCEPT_PORTRAIT_POSITIONS`, як і раніше для обох живих наборів). `DIRECTION_HERO_PORTRAIT_POSITIONS` лишився — його звіряє `direction-hero-portrait.test.ts`. Docstring: усі майстри — у `design-assets/`.
- **Скрипти, які писали тільки видалені файли, прибрано** разом із виходами: `generate-home-v2-crops.py`, `generate-phone-hero-stills.py`, `capture-angary-editorial-assets.mjs`. Живі `hangar-retouched-*`, описані в docstring `generate-home-v2-crops.py` як зроблені вручну, мають власний опис походження в `app/data/homeProofContour.ts` і хеші в `home-proof-contour.test.ts`; вони не змінені. Скрипти лишаються в git-історії.
- **Тест** `home-hero-media.test.ts`: прибрано два рядки phone-монтажів і дописано, чому лишились лише планшетні. Бюджети планшетних монтажів і desktop-кліпів `-v3` — без змін. Це не послаблення: тест стеріг файли, яких сайт не показує, тобто давав хибне запевнення.
- **Не зроблено (рішення власника).** `public/media/reviews/` (228 файлів, 13,16 MiB) — DC-02: handoff-и #243 просили «перед merge прибрати або окремо погодити збереження», а чи погоджено — з репозиторію не видно. Brand-кіт F (1,78 MiB) — лишився. MD-08 радив «відео не видаляти без рішення власника»: 14 mp4 групи D видалено за перевіреною рекомендацією DC-01, тож merge цього PR і є тим рішенням (див. «Ризики»).

## До / після

Середовище: Mac (arm64, 8 ядер), Node 24, vinext 1.0.0-beta.3, Chrome 156 (`channel: 'chrome'`, headless). `main` = production build `9079f47` на 127.0.0.1:4400; гілка = production build `f2e823e` на 127.0.0.1:4417. Машину одночасно навантажував інший агент (load average 15–70 на 8 ядрах), тож мілісекунди не міряли: усі числа нижче — байти, кількості й списки, вони детерміновані (n = 1 на кожну величину). Швидкість сторінок цей PR не змінює і не заявляє: HTML і набір запитів однакові — покращення швидкості статистично не встановлено.

| Що | `main` `9079f47` | гілка |
|---|---:|---:|
| `public/` у git: файлів / байт | 719 / 148 701 756 | 580 / 72 331 513 |
| `git archive` усього дерева, байт | 265 431 040 | 189 153 280 (−76 278 760; коміт коду) |
| `dist/client`: файлів / байт | 843 / 151 592 922 | 704 / 75 222 679 (−76 370 243, −72,83 MiB) |
| `dist/client/_next` (JS, CSS, шрифти), байт | 2 860 483 | 2 860 483 |
| `dist/server`, байт | 3 654 249 | 3 646 258 (−7 991: список статичних файлів 719 → 580, мапа довжин mp4 26 → 12) |
| HTML 18 шляхів (10 сторінок sitemap, 4 прев’ю, 404, sitemap, robots, webmanifest) | 18 × статус і розмір | ті самі статуси й розміри; байт у байт після нормалізації хешів чанків, UUID і nonce |
| Медіа-запити, 60 завантажень у Chrome | 56 різних медіафайлів (306 у сумі по завантаженнях), 3 878 запитів до свого origin | ті самі 56 / 306 / 3 878; набір медіа кожного з 60 завантажень однаковий |
| Запити до 139 прибраних файлів / відповіді ≥ 400 | 0 / 0 | 0 / 0 |
| HEAD на кожен із 139 прибраних URL | 139 × 200 | 139 × 404 |

JS і CSS не змінились: з 305 груп файлів `dist/client/_next` + `dist/server` 275 байт у байт; решта 30 однакові після нормалізації імен чанків (10 клієнтських чанків мають інші хеші в іменах лише тому, що імпортують одне одного), UUID і ідентифікаторів збірки, 64-hex секретів збірки й абсолютного шляху робочої копії. Єдина змістовна різниця — у `dist/server/index.js`: vinext-список статичних файлів (−139, +0) і мапа довжин mp4 (−14, +0).

Зменшення деплою — лише в статичних файлах, яких ніхто не запитує, тож швидкість сторінок не змінюється. Git-історія не зменшується.

## Перевірка

| Що | Результат |
|---|---|
| Склад видалення проти `public-categories.json` аудиту | D 14, E 60, G 23, H 4, J 27 — усі 128 видалено; C — 10 видалено, 1 перенесено; A, B, F, I — 0 зачеплено |
| Посилання на 139 прибраних файлів, `main` (`refcheck.cjs` за методом перевірки DC-01: URL-шлях, URL-encoded, без `/`, ім’я файла, 8-hex хеш, корінь без ширини) | runtime-корпуси — `app/` + `worker*`, `proxy.ts`, конфіги (332 файли); `dist/server` без списку статичних файлів і мапи mp4 (186); `dist/client` без копій `public/` (106); HTML 18 шляхів: **0** для D, E, G, H, J; для C — 1, коментар у `processHeroImage.ts` |
| Те саме — гілка | runtime: 0, крім імені `yak-pratsyuiemo.webp` у тому самому коментарі (тепер зі шляхом `design-assets/`). Поза runtime: `retime-hero-clips.py` (читає кліпи з git-історії через `git show <rev>:…`, видалення його не ламає), `asset-cache-policy.test.ts` (`/media/hero-steel-frame.*` — синтетичні шляхи для класифікатора кешу; його перевірка хешів читає `public/media-responsive` і проходить), `hero-video.spec.ts` (перевіряє, що старі сімейства **не** запитуються), `generate-roof-phone-crop.py` (ім’я `pokrivelni-roboty.png` у `design-assets/`), історичні `docs/` |
| Відтворення генератора героїв (Pillow 12.3.0, Python 3.12) на джерелах `9079f47` і гілки | версія `main`: 204 файли, усі 204 байт у байт = `public/media-responsive`; версія гілки: 144 файли, усі = файлам гілки; не генерує лише 60 файлів префіксів `direction-hero` і `directions-sequence` = група E; нових виходів 0; `process-hero` з `design-assets/` — ті самі 4 файли, що й з `public/media/process-hero-source/` |
| `vitest run` | 98 файлів, **1540 passed** |
| `home-hero-media.test.ts` у версії `main` на дереві гілки | 2 failed (ENOENT на обидва phone-монтажі), 12 passed — правка тесту потрібна |
| `tsc --noEmit --incremental false` | чисто |
| `eslint .` | чисто |
| E2E на збірці гілки, desktop + mobile chromium (Chrome 156), 2 workers: `hero-video`, `smoke`, `consent-pending-hero`, `home-landscape`, `direction-static-hero`, `directions-hero-sequence` | **256 passed**, 68 skipped (умовні `test.skip` специфікацій за проєктом або шириною viewport: 66 на mobile, 2 на desktop), 0 failed; 12,0 хв |

## Еталони (DEC-18)

Прогноз `dec18-two-builds.cjs` (42 цілі visual-chromium, header/footer logo, configurator, grain planner; знято як у специфікаціях — той самий елемент, viewport, правило шапки, reduced motion, mp4 перервано, постер замість відео; порівняно компаратором Playwright з допуском специфікацій 0,25 / 0,02) — `main` `9079f47` проти гілки: **0 з 42 змінюються** (27 байт у байт, 15 у межах допуску). Той самий метод `main` проти самого себе дає 24 і 18 — «у межах допуску» тут шум рендера, а не зміна. Еталони не оновлено.

## Ризики

- **Після деплою 139 URL віддаватимуть 404** (зараз — 200). Зовнішні посилання на них невідомі (MD-08): доступу до логів Cloudflare чи GSC немає. Сторінки сайту їх не запитують; вплив на Google Images мізерний. Рішення — за власником під час merge.
- **14 mp4 і 10 PNG-майстрів видалено, а не перенесено.** MD-08 радив відео без рішення власника не видаляти; DC-01 після перевірки — видалити. Повернути будь-який файл — `git show 9079f47:public/<шлях>`. Консервативна альтернатива — перенести майстри в `design-assets/` (+25,6 MiB у репозиторії, поза деплоєм); генератор лишається без цих наборів так само.
- **Прибрані скрипти** — у git-історії. Якщо знімки конфігуратора `/angary` знову знадобляться, `capture-angary-editorial-assets.mjs` треба повертати з виходом поза `public/` і перевіряти його селектори на чинному конфігураторі.
- **Історичні документи** згадують видалені файли як свідчення й не оновлені: `docs/performance/2026-10-09-media-delivery.md` (команда Range-запиту на `straight-line-14377591-v2.mp4` — для повтору тепер потрібен `-v3`), `docs/design/2026-10-13-phase6-photo-variant.md` («Edit targets: `public/media/direction-hero-source/…`»), `docs/design/2026-10-16-mobile-first-impression.md` (запуск `generate-phone-hero-stills.py`), handoff-и 18.10 і 24.10.
- **Розмір клону не зменшується** (історія та сама); `pr-gate` (один job) і `sonarcloud` беруть повну історію (`fetch-depth: 0`). Решта checkout-ів CI стають меншими на ~72,6 MiB робочого дерева (−72,83 MiB у `public/`, +0,2 MiB у `design-assets/`).

## Не перевірено

- Production deploy: що Wrangler справді прибере ці assets (очікувано — так, деплой несе лише файли з `dist/client`).
- Firefox і WebKit, реальні iPhone/Android: HTML і набір запитів не змінені, тож різниці між браузерами не очікується.
- Візуальні еталони на Linux CI (прогноз — macOS Chrome).
- Зовнішні посилання на прибрані URL.

## Відкат

Після squash-merge — `git revert` коміту PR: файли повертаються з тими самими байтами й URL, генератор — з двома наборами, скрипти — на місце.

Сирі дані — поза репозиторієм (SHA-256):

| Файл | SHA-256 |
|---|---|
| `2026-10-28/removed-from-public.txt` | `340bab485dbc802b12de79806523248bc908396151766e9f83b856c1301fedfd` |
| `2026-10-28/refcheck-main.json` | `e104681f77a115491dbf165eaa0e984bd11393fc4907377dc3b7438b0d4a9415` |
| `2026-10-28/refcheck-branch.json` | `cd7cf0be9495c53ca57239923a5dc9da5724df2d3d7dad2da2c4e7aaf462c367` |
| `2026-10-28/html-compare.tsv` | `4e94d00c561f9d9cd4b0fd62444cf51c54054d33c77b66a4521da44bfab745be` |
| `2026-10-28/head-probe.tsv` | `0e427a4b7ee06ee57d5191d24ebd6143d4d2544ff50a980b9d1d6355c61e14cd` |
| `2026-10-28/build-compare.txt` | `1a0e2b4b384afd2cd2bc8b30d139494bafc4123d8a8c0779f49801d2142f4e09` |
| `2026-10-28/git-archive.txt` | `9e7a6f6a8eecea630f9b7565ba5191f12184ee94d95278e15fa1e6953d872eb8` |
| `2026-10-28/crawl-main-4400.json` | `c9e0755545f91ce8b8e268ab4ac6cff66ffab79768d2249ac9381dce3bc7fa7a` |
| `2026-10-28/crawl-branch-4417.json` | `e097adc669712deb6f10e9560868669f2ab2a1e082aa133b7d6070b4dd8515a4` |
| `2026-10-28/crawl-compare.txt` | `8d9dad80ec307fdace820a23607b68208e44410064443f08d17760e21b0e1183` |
| `2026-10-28/generator-reproduction.txt` | `8dea96a3124d2bc0fac1086766a153d80534459d35c43a6d4dd1e1312246245e` |
| `2026-10-28/dec18/_result.tsv` | `d3187f8ca0725fa450f0d600b01ebc5a3c56c0ef5c0baaa208b845a0d67467c7` |
| `2026-10-28/dec18-main-vs-main/_result.tsv` | `ef9d02fb72fb766992c42a9668c7da431c8339ec2e504fe708c97761caa355ed` |
| `2026-10-28/vitest.txt` | `0429486f73db1082ba43fe0263c1794751ae3bd1dbd0f8fc0479479e631b8951` |
| `2026-10-28/home-hero-media-main-version-on-branch.txt` | `89abf9041f75928fe97c6f6812170d73c08fba7ad03e7f368de6a5357b5f7176` |
| `2026-10-28/tsc.txt` | `6e56e6343ed0e37ee0d01f34a3a90d76a70c6948bf7043ee5937791466079e15` |
| `2026-10-28/eslint.txt` | `59ab6cba83889efaa49426992b9657a6be14abcd62776be1fc98f51bc0c1ba40` |
| `2026-10-28/e2e-branch.txt` | `9c56fb55da483d4abb00f8b7044c78de6531dca20ae58437b7c96f2ac910c453` |
