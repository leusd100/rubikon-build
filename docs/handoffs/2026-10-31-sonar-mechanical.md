# Handoff · Sonar · механічна чистка

| | |
|---|---|
| Дата | 2026-10-31 |
| Виконавець | Claude Code |
| Підстава | Власник: «поправимо всі Issues SonarQube» (302 відкриті, 0 багів, 0 вразливостей, Quality Gate зелений) |
| Гілка / base | `refactor/sonar-mechanical` від `main` `bc0d34ed` |
| Споріднені | Частина з п'яти незалежних PR, без stacked: `refactor/sonar-mechanical`, `refactor/sonar-complexity`, `test/e2e-no-fixed-waits`, `refactor/sonar-css-semantics`, `ci/sonar-scoped-exclusions` |

## Що зроблено

Закрито 145 з 170 Issues цієї частини. Решта 25 це хибні спрацювання в PR `ci/sonar-scoped-exclusions`.

- S6759 ×71: пропси `Readonly<…>` (кодмод за TS AST).
- S3358, S4624, S7778, S7755, S7761, S7762, S6606, S6582, S2004, S2234, S4782, S6594, S6397, S7773, S1135, S3735, S1077.
- `classNames` винесено зі `DirectionDetail.tsx` у `app/lib/classNames.ts`, з тестом.
- S6479 ×26: ключі списків. У схемі ангара лінія й поверхня отримали `id` за змістом деталі: рама, бік, панель, діагональ. У `technicalSceneModel` брекети отримали `diagonal`, а покрівельні ще й `panelIndex`. У `ProofFrame` дані статичні, тож ключ береться з геометрії.

## Чому не індекс і не геометрія в схемі ангара

Ключ із геометрії змінювався б з кожним рухом повзунка розміру й перемонтовував би всі лінії. Ключ за змістом зберігає DOM-вузол рами при зміні розміру. Тест знайшов реальну помилку першої версії: `roofBracing` дублював id у 80 із 80 конфігурацій без `panelIndex`.

## Перевірка

| Перевірка | Результат |
|---|---|
| `tsc`, `eslint` | чисто |
| `vitest run` | 1672 passed |
| Унікальність ключів `ProofFrame` на реальних даних | 0 дублів |
| Dev-збірка, 5 сторінок, попередження React про ключі й гідратацію | 0 |
| e2e desktop: configurator, sheet, phase4, hero-video, analytics, key-plan, pr-critical, grain-planner | 230 passed |
| e2e mobile: configurator, hero-video, analytics, pr-critical | 148 passed, 21 skipped |
| `home-proof-contour` desktop | 48 passed, 6 skipped |
| Локальний `eslint-plugin-sonarjs` на `app` і `radar-prototype/src` | 0 знахідок по S3776, S3358, S4624, S6759, S2004 |

Зміни DOM: у `DirectionsKey` на `<svg>` додано `aria-hidden`, бо це ілюстрація без текстової альтернативи. У `queueGoogleCommand` змінено лише форму оголошення, у `dataLayer` так само йде об'єкт Arguments.

## Ризики

Ключі за змістом можуть перемонтувати брекет, коли змінюється `bayIndex`. `.hc-buildlayer` має переходи, а не keyframes, тож це не програє анімацію. Перевірено читанням CSS, не окремим тестом.
