# Handoff · 28.11.2026 · один герой у Safari для збереженої теми

**Гілка:** `fix/hero-theme-cookie` від main `a6dface4`. Draft, без merge до OK власника.

## Що було
У WebKit (Safari, усі браузери на iPhone) збережена тема, відмінна від системної, качала **обидва** герої:
5 сторінок напрямів і /napryamky, production 28.11. Зайве: +52…185 КБ на 390, +177…328 КБ на 1440. У Chromium був один файл.

Причина (перевірено, а не вичитано з коду): preload scanner WebKit читає `<source>` System-`<picture>` раніше,
ніж інлайн `HERO_THEME_SCRIPT` перемикає їх на збережену тему, і качає арт теми ОС. Коли HTML уже має
правильний `media`, WebKit качає один файл. Експеримент зроблено підміною документа на production.

## Що зроблено (власник 28.11: «Так, cookie + Worker»)
- `app/lib/theme.ts`: збережена тема — ще й cookie `rubikon-theme`.
  - Значення лише `light`/`dark`, строк рік, `Path=/`, `SameSite=Lax`, `Secure` на https.
  - Перемикач пише cookie разом зі сховищем, «Як у системі» видаляє її.
  - Head-скрипт вирівнює cookie за сховищем на кожній сторінці. Так вибір, зроблений до цієї зміни, підхоплюється з першої ж сторінки.
- `worker/hero-theme-sources.ts`: Worker переписує HTML потоком байтів, як `modulepreload-priority.ts`.
  - `<source data-dark="" media="M"` стає `<source data-dark="M" media="storedThemeMedia(M)"`.
  - Правило `storedThemeMedia` спільне зі скриптом, юніт-тест тримає їх рівними.
- `HERO_THEME_SCRIPT` спершу читає `data-dark`. Тому cookie, що розходиться зі сховищем, однаково дає арт збереженої теми.
- Політика конфіденційності: один абзац про cookie теми. `privacyVersion` **не змінено**, це рішення власника.
- `worker/bytes.ts`: спільні `join`/`matchesAt` для обох переписувачів Worker.
- e2e `hero-theme-webkit.spec.ts` (проєкт `webkit`, workflow Cross-browser).
  - На main падає: /angary, 2 файли героя.
  - На гілці проходить: 4 з 4.
- Хелпер `webkit-local.helpers.ts` винесено з `responsive-a11y-phase1.spec.ts`.

## Перевірено локально
- unit: 1950 passed.
- Chromium e2e: direction-static-hero (MD-01), directions-hero-sequence, theme, smoke, pr-critical — 253 passed. words-whole — 11 passed.
- WebKit: `hero-theme-webkit` 4 з 4.
- `responsive-a11y-phase1:180` на /metalokonstruktsii 1440 флейкує локально і на main (1 з 4), у CI на Linux зелений.

## Відкрите
- Власнику: текст абзацу в політиці і чи міняти `privacyVersion`.
- Перевірка на справжньому iPhone після deploy: Web Inspector → Network, тема ≠ системна.
