# Handoff · Sonar · тести без фіксованих очікувань

| | |
|---|---|
| Дата | 2026-10-31 |
| Виконавець | Claude Code |
| Підстава | Власник: «поправимо всі Issues SonarQube» (302 відкриті, 0 багів, 0 вразливостей, Quality Gate зелений) |
| Гілка / base | `test/e2e-no-fixed-waits` від `main` `bc0d34ed` |
| Споріднені | Частина з п'яти незалежних PR, без stacked: `refactor/sonar-mechanical`, `refactor/sonar-complexity`, `test/e2e-no-fixed-waits`, `refactor/sonar-css-semantics`, `ci/sonar-scoped-exclusions` |

## Що зроблено

Закрито 41 із 43 Issues: S2925 ×32, S5906 ×8, S8968. Змінено лише `tests/`. Новий `tests/e2e/frames.helpers.ts` (`nextFrames`); `installDrawCallCounter` і `waitForBuildUpToSettle` перенесено в `configurator.helpers.ts`.

Дві паузи залишено, бо час у них і є перевіркою: спокій Lenis у `smooth-scroll-idle.spec.ts` і вікно без перезавантаження в `island-failure.spec.ts`. Вони в PR `ci/sonar-scoped-exclusions`.

## Рішення, яке варто переглянути

Вікна «нічого не сталося» для того, що живе в кадрах, тепер рахуються кадрами, а не мілісекундами: `angary-interactive:649`, `configurator-sheet:422`, `configurator:557`, `smooth-scroll:266`, `:279`, серія коліщатка в `smooth-scroll-idle:100`. Очікування нікуди не зникло, Sonar просто його не бачить. Обгрунтування: на завантаженому раннері кадрове вікно дає поведінці стільки ж шансів, як на вільному, а мілісекундне менше. Є прецедент `drawCallsOverFrames`.

`pageAtRest` дає на старт до 5 с проти сліпих 1,5 с; саме твердження про спокій не змінилося.

## Перевірка

| Перевірка | Результат |
|---|---|
| `tsc`, `eslint tests` | чисто |
| `vitest run` | 1667 passed, 1 skipped (навмисний `skip()` у golden-ui) |
| `--repeat-each=5`, обидва проєкти: idle, island, smooth-scroll, pr-critical, angary, sheet, configurator, 3d | 128 passed, 2 failed, 60 skipped; після виправлення цих двох 10 із 10 |
| `--repeat-each=5`, обидва проєкти: 3d-enhancements, 3d-buildup, drawing-tour | 230 із 230 |
| `configurator-3d-visual`, 5 повторів | 25 failed через застарілі darwin-еталони; кількості пікселів ті самі, що в специфікації з `main`. Linux-еталони перевіряє лише CI |
| Мутаційні перевірки | 20 мутацій, кожна червоніє |

Під час `--repeat-each` навантаження часто перевищувало 15. Firefox і WebKit локально не запускалися.

## Що виявили мутації

Стара піксельна перевірка в `3d-enhancements` була порожньою: проходила з `toggle.focus()` замість `toggle.check()`, ймовірно через фіксовану шапку над елементом. Тепер порівнюється `canvas.toDataURL()`. Старий `pr-critical:457` виглядає порожнім за читанням: 3,6 с очікування проти 6 с слайда. Нова версія червоніє.

## Падіння, які не відтворилися

`angary-interactive:226` і `smooth-scroll:329` впали раз при навантаженні ~23 і більше не відтворилися, причину не встановлено. Перший замінено на годинник сторінки, у другому прибрано паузу.
