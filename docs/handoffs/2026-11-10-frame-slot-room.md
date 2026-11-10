# Handoff · HOME: місце для «Прикладу каркаса» з першого кадру

| | |
|---|---|
| Дата | 2026-11-10 |
| Виконавець | Claude Code |
| Підстава | Під час #313 з'ясувалося, що на HOME блок `hv2-signature` росте на 665 px (1440) і 877 px (Pixel 7) у момент гідратації. Дмитро 10.11: «давай далі» |
| PR | Draft. **Merge і deploy — лише з окремого OK Дмитра** |
| Гілка / base | `fix/frame-slot-room` від `main` `66614864` |
| Змінено | `app/home-v2.css` (висота слота в змінній `--hv2-frame-slot`, правило `@media (scripting: enabled)`), `tests/e2e/home-frame-tour.spec.ts` (+1 тест), цей handoff |
| Не змінено | `FrameTourIsland.tsx`, формули висоти, вигляд після гідратації, сторінка без JS |

## 1. Що було

`FrameTourIsland` резервує місце для туру каркаса лише після гідратації: ефект ставить `data-armed`, і CSS дає слоту висоту. Без JS слот нульовий, щоб не було порожнього блоку, і так задумано. Підпис «Приклад каркаса» теж показувався лише при `[data-armed]`.

Ціна: усе під слотом (аркуш з фото, факти, люди, форма) у момент гідратації з'їжджає вниз на висоту слота.

Продакшн, Chromium, `PerformanceObserver('layout-shift')`:

| | CLS, просто дивиться | CLS, прогорнув до блоку раніше за гідратацію (скрипти +2,5 с) |
|---|---|---|
| 1440 × 900 | 0 | **0,46** (figure.sheet 0 → 293 px) |
| Pixel 7 | 0 | **0,99** (div.hv2-proof 0 → 377 px) |

Поріг «добре» — 0,1. Те саме зміщення спричиняло промах посилання `/#inquiry`, яке виправив #313.

## 2. Що зроблено

- Три формули висоти слота (десктоп, ≤ 1180, ≤ 760) — без змін, лише перенесені в `--hv2-frame-slot`.
- `@media (scripting: enabled)`: слот має висоту й підпис видно з першого кадру, де скрипти ввімкнені.
- `[data-armed]` лишається як запасний шлях для рушія без цієї медіафічі.
- Без JS (`scripting: none`) слот, як і раніше, нульовий.

## 3. Перевірки

- Новий тест «with script the room and its label are there from the first paint»: скрипти притримано на 3 с. До гідратації слот має висоту > 200 і підпис видно; після гідратації висота і верх аркуша ті самі. **На старому CSS він падає** (слот 0 px), з виправленням проходить. desktop + mobile.
- `home-frame-tour.spec.ts` — 25 passed, зокрема «without script … no empty room» (0 px) і «at N px the tour takes exactly the room kept for it» на 7 ширинах.
- hash-landing, first-view-walks, home-directions-sheets, home-landscape, home-phone-directions, consent-pending-hero, home-proof-gallery, motion-signature — 128 passed, 34 skipped.
- `pnpm lint`, `pnpm typecheck`: чисто.
- `home-proof-contour.spec.ts` (великий) локально не ганявся, його проганяє CI.

## 4. Ризики

- Якщо код туру не завантажиться (IslandBoundary з `fallback={null}`), місце лишиться порожнім. Так було й раніше: `data-armed` ставився до завантаження туру.
- `@media (scripting)`: Chrome 120+, Safari 17+, Firefox 113+. Старіші браузери поводяться як раніше.

## 5. Що перевірити власнику

- Головна на телефоні: швидко прогорнути до «Як ми дивимося на об’єкт» одразу після відкриття. Аркуш не має стрибати.

## 6. Відкат

Повернути три `--hv2-frame-slot:` у `height:` під `.hv2-frame-slot[data-armed]` і прибрати блок `@media (scripting: enabled)`.
