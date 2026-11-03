# Handoff · Nightly / Main: стабільні повні перевірки

| Поле | Значення |
|---|---|
| Дата / виконавець | 03.11.2026 · Codex |
| Запит | Власник: виправити червоні Nightly і Main тести |
| Base | `main` `f4c269557879c6b3d3f31b5e78787f5741eebbfe` (містить #299) |
| Гілка | `fix/nightly-main-regressions` |
| Критерій готовності | Відтворені падіння → зелений targeted без retry; повні Main/Nightly на гілці та PR Gate зелені |
| Передача | Draft PR; merge і автоматична production-публікація потребують окремого OK власника |

## Доказ і причина

Nightly [41611697509](https://github.com/leusd100/rubikon-build/actions/runs/41611697509) на `320d4a73` мав 5 функціональних падінь, застарілі golden та глобальний timeout shard1. Новий Main [41634899596](https://github.com/leusd100/rubikon-build/actions/runs/41634899596) на `f4c26955` уже має зелені visual shards після #299, але повторює ті самі 5 функціональних падінь і timeout shard2.

1. **М’який перенос — хибне падіння вимірювання.** У `Метало\u00adконструкції` слово «конструкції» не розірване: на 1440 px Chromium додає до Range, що починається ПІСЛЯ U+00AD, ще й rect попереднього дефіса (ширина 10.375 px), а тоді rect самого слова (125.4375 px на наступному рядку). Старий детектор рахував два рядки як розрив усередині слова. Тест англійських лабораторних заголовків теж проходить решту української сторінки й натрапляв на той самий rect.
2. **Реальний дефект hover/focus.** Новий `hv2-proof-shortcut` мав `color` зі специфічністю `main[data-home] .class`, яка перекривала спільне `.link-arrow:is(:hover,:focus-visible)`. За reduced motion руху немає й посилання не відповідало візуально. Тепер використовуються наявні `--link-ink` і `--link-hover-ink`: початковий мідний колір збережений, hover/focus — світлий.
3. **Нерівномірні важкі частини.** Повний набір Playwright розподіляється послідовно за кількістю тестів, не тривалістю; configurator та engineering накопичуються в ранніх частинах. Nightly1/6: 348 passed, 2 skipped, 2 interrupted, 31 not run при global720000. Main2/6: 330 passed, 37 skipped, 1 interrupted, 16 not run при тому самому cap. Це не індивідуальний timeout цих двох сценаріїв.

## Найменші виправлення

- Два детектори геометрії відкидають тільки exact-match rect попереднього U+00AD; будь-які інші рядки слова далі означають дефект. Винесено основний детектор для повторного використання тестом-фікстурою: дозволений ручний перенос проходить, справжній примусовий розрив (і після U+00AD, і без нього) ловиться.
- Локальний hover/focus виправлено двома наявними CSS-токенами.
- Main та Nightly: 8 частин замість 6; workers2, retries/failOnFlakyTests, global720000 і job15min збережені. Actual `--list` до та після: **2304 tests = 8 × 288**, кожен ID рівно один раз. Менша частина скорочує навантаження всередині тих самих лімітів; CI має підтвердити фактичний час.

## Перевірка

| Перевірка | Результат |
|---|---|
| До: links-buttons-focus + typography + words-whole, desktop, production | 5 failed, 78 passed, 7 skipped (1.7 хв) |
| Після: ті самі + adversarial fixture, без retries | 84 passed, 7 skipped (1.8 хв) |
| lint, typecheck, production build | пройшли |
| Unit, 2 workers | 112 файлів, 1777 passed, 1 skipped |
| Фактичні списки усіх 8 частин | точний union 2304, без дублів/втрат |
| Повні Main/Nightly/PR Gate | Посилання й результати додаються до PR після виконання |

[Скриншоти hover/focus до/після, 390/1440 Light/Dark](media/nightly-main-regressions/hover-focus-comparison.png).

## Незалежне рев’ю

Read-only reviewer у свіжому контексті: **approve**, блокуючих знахідок немає; adversarial fixture незалежно пройшла. Незалежний `--list` підтвердив усі 2304 ID. Replay відомих pass/skip/retry тривалостей із Nightly логів по actual shard membership оцінює найважчу 8-way частину в 10.2 хв ідеальної роботи двох workers; це нижня оцінка без overhead/variance, не доказ CI green. 2 configurator +4 public лишали надто важкі public-частини; 2+6 складніше за плоскі8; 10 коштує ще два старти runner і поки не обґрунтовано.

## Еталони, ризики й межі

Golden PNG, тексти, зображення, залежності, CSP/consent, Lighthouse бюджети й governance не змінено. Вид у спокої той самий; змінена лише відповідь посилання на hover/focus. Метрики — локальні/CI, фізичний Safari не перевірявся. Два додаткові runner starts на повний прогін — ціна меншого tail latency. Повний CI потрібен через workflow/test infrastructure diff. Якщо8 не вкладається в ті самі cap, треба знову дослідити розподіл, а не піднімати cap.

## Відкат / control

Відкотити коміт цього PR. Даних, міграцій або нових залежностей немає. Змін control не пропонується.
