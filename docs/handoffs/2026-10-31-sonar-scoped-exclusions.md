# Handoff · Sonar · винятки з причинами

| | |
|---|---|
| Дата | 2026-10-31 |
| Виконавець | Claude Code |
| Підстава | Власник: «поправимо всі Issues SonarQube» (302 відкриті, 0 багів, 0 вразливостей, Quality Gate зелений) |
| Гілка / base | `ci/sonar-scoped-exclusions` від `main` `bc0d34ed` |
| Споріднені | Частина з п'яти незалежних PR, без stacked: `refactor/sonar-mechanical`, `refactor/sonar-complexity`, `test/e2e-no-fixed-waits`, `refactor/sonar-css-semantics`, `ci/sonar-scoped-exclusions` |

## Навіщо окремо

`CLAUDE.md`: зміна правил і обсягу Sonar лише з OK власника. Цей PR закриває 44 Issues правилами, а не кодом. Без нього вони просто лишаться відкритими; на Quality Gate це не вплине.

| Правило | К-сть | Де | Чому код правильний |
|---|---|---|---|
| S6747 | 17 | `r3f-spike/**/*.tsx` | Пропси three.js, а не DOM. Те саме виняток для `configurator/three` уже є в `main` |
| S6747 | 1 | `DirectionDetail.tsx` | `blocking` на `<link rel="expect">` є справжнім атрибутом |
| S7767 | 2 | `noiseField.ts` | Mulberry32 потребує обгортання до int32; `Math.trunc` його не робить і змінив би всі значення |
| S6845 | 4 | 4 прокручувані області | `tabIndex` вимагає axe `scrollable-region-focusable`; без нього вбік не прокрутити з клавіатури |
| S6822 | 1 | `DirectionsIndex.tsx` | `list-style: none` знімає семантику списку в Safari без явної ролі. Не перевірено на VoiceOver |
| S2925 | 2 | `smooth-scroll-idle`, `island-failure` | Час і є перевіркою |
| S9423 | 3 | `print-sheet.css` | Ізоляція друку. Необхідність кожного не перевірена, рядок 17 міг би обійтися специфічністю |
| S9423 | 8 | блоки `sonar-important-begin` у `globals.css`, `home-v2.css`, `configurator-controls.css` | Скидання reduced-motion, перебиття інлайн-стилю `useSeam`, шару Tailwind і `*` |
| S6819 | 5 | `SiteChrome`, `HangarEditorialArchitecture`, `ChangeBanner`, `FullscreenPreviewFrame` ×2 | Жоден нативний елемент не підходить за змістом; `<dialog>` оцінено читанням коду, не тестом |
| S6819 | 1 | `ConfiguratorControls.tsx` | Підказка є ціллю `aria-describedby` поля; з `<output>` опис поля втрачав її текст (`angary-configurator-data.spec.ts:284` на Main Regression) |

Правила прив'язані до файлів. Для `!important` у великих CSS-файлах використано блоки, а не файлове правило, щоб новий `!important` деінде в них і далі показувався.

## Що перевірено

`sonar.issue.ignore.multicriteria` працює: виняток `r3fIntrinsicProps` уже діє в `main`, у `configurator/three` немає S6747. `sonar.issue.ignore.block` перевірено на тимчасовому PR: `!important` усередині блоку Sonar не показав, такий самий поза блоком показав. Повний підсумок проєкту доступний лише після merge у `main`, бо тариф SonarCloud не віддає дані неосновних гілок.

Блоки `sonar-important-begin` запрацюють лише разом із `refactor/sonar-css-semantics`, де стоять самі коментарі.
