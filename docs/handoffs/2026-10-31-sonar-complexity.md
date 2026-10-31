# Handoff · Sonar · когнітивна складність

| | |
|---|---|
| Дата | 2026-10-31 |
| Виконавець | Claude Code |
| Підстава | Власник: «поправимо всі Issues SonarQube» (302 відкриті, 0 багів, 0 вразливостей, Quality Gate зелений) |
| Гілка / base | `refactor/sonar-complexity` від `main` `bc0d34ed` |
| Споріднені | Частина з п'яти незалежних PR, без stacked: `refactor/sonar-mechanical`, `refactor/sonar-complexity`, `test/e2e-no-fixed-waits`, `refactor/sonar-css-semantics`, `ci/sonar-scoped-exclusions` |

## Що зроблено

Закрито всі 37 Issues в 11 файлах, зокрема 11 × S3776.

| Функція | Складність, було → стало |
|---|---|
| `HangarPreviewModes` | 57 → 14 |
| `explainChanges` (`changes.ts`) | 54 → ≤ 15 |
| `handleLead` (`app/api/leads/route.ts`) | 39 → 9 |
| `ProofContour` | 32 → ≤ 8 |
| `handleSubmit` (`ProjectInquiryForm`) | 19 → 11 |
| `layerLifecycle`, `threeSceneModel`, `candidates`, `diagram`, `state`, `understanding` | 19–21 → ≤ 15 |

Нові файли: `app/lib/inquiry/submitAttempt.ts` і його тест.

## Перевірка

| Перевірка | Результат |
|---|---|
| `tsc`, `eslint` | чисто |
| `vitest run` | 1678 passed |
| Покриття нових рядків `.ts` | 170 із 176 = 96,6 % (на `cc70cf8c`; наступні коміти не змінюють `.ts`) |
| Порівняння старого й нового коду, тимчасово, не в репозиторії | збіг на 40 000 відповідей, 40 000 мутованих станів, усій таблиці життєвого циклу й 600 3D-сцен, разом із порядком масивів |
| e2e форми, заявки, аналітика | 211 passed, 23 skipped |
| e2e конфігуратор, 11 специфікацій | 208 passed, 3 failed, 55 skipped. Усі 3 при навантаженні ~22; наодинці 9 із 9 |
| e2e планувальник | 86 passed, 16 skipped |
| `home-proof-contour` + `responsive-a11y-phase1` | 111 passed, 2 failed, 33 skipped |

Два падіння `home-proof-contour:2360` (desktop) і `:2747` (mobile) є і на незміненому `bc0d34ed`: 6 із 6 і 5 із 6 на `main` проти 5 із 6 і 4 із 6 на гілці. Порівнювалися лише кількості падінь. Вони падають при навантаженні 3–6 і проходять при ~15, тож схожі на залежність від таймінгу.

`route.ts` рядок за рядком звірив окремо від виконавця: порядок перевірок, статуси, тіла відповідей і побічні ефекти ті самі.

## Де поведінка може відрізнятися

- `<output>` замість `div` у завантаженні превʼю, `<fieldset>` замість `span` у `.hv2-contour-layers`. Сусідній `.hv2-contour-nodes` уже `<fieldset>`; явний скид стилів додано. Геометрія збігається на 6 ширинах.
- `value()`: елемент-файл дає `''` замість `'[object File]'`. Недосяжно, у формі немає поля файлу.
- `ContactMethodIcon`: невідомий спосіб тепер кидає помилку, а не показує Viber. Недосяжно, тип вичерпний.
- `useId` під новими шарами `HangarPreviewModes` може дати інші значення. Це внутрішні посилання; не вимірювалося.

Можливий дрібний конфлікт із незакоміченою роботою Turnstile у `ProjectInquiryForm.tsx` біля рядків імпорту.
