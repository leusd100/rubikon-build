# Handoff · Nightly: явна причина збою та усунення дубльованого запуску

16.10.2026. База — `main` `5040fae038d32969a3cb6d54b67d43d6f4bd48e2` (#199). Цей запис описує CI-частину стабілізації; merge і deploy не виконувалися.

## Причини й зміни

- [Nightly run 38865321196](https://github.com/leusd100/rubikon-build/actions/runs/38865321196): build зупинився на unit guard; залежні browser jobs не створили blob-звітів, але report потім упав на їх злитті. Report тепер явно залежить також від build і першим кроком завершується з поясненням, якщо build не `success`, до checkout, setup і злиття. Фінальна перевірка вимагає `success` від build, E2E, visual і Lighthouse.
- Історичне завантаження `.lighthouseci/` не знаходило файлів: `upload-artifact` за замовчуванням виключає приховані файли. Лише для Lighthouse diagnostics додано `include-hidden-files: true`.
- Окремий Nightly accessibility job повторював чотири desktop-тести двох accessibility spec, які вже входять у повну E2E-вибірку. Прибрано лише цей дубль і його залежність у report. Усі чотири тести залишаються у чотирьох E2E shards; самі тести не змінено.

## Перевірка й межі

- YAML розібрано Ruby Psych; report перевіряє build до checkout, а його залежності й фінальний результат охоплюють усі чотири потрібні jobs.
- Shell-крок build перевірено для `success`, `failure`, `skipped`, `cancelled`: лише `success` дозволяє подальшу роботу. Фінальний shell gate відхиляє кожен неуспішний результат будь-якої залежності.
- Playwright discovery на базі: 1485 desktop/mobile E2E тестів. Окрема вибірка колишнього accessibility job — рівно чотири desktop-тести; кожен присутній у повній вибірці та розподілі чотирьох shards. Discovery не виконує браузерні сценарії.
- Початкова база все ще має відомий unit guard failure: прямий API-запит у `direction-static-hero.spec.ts` обходить `getFromServer`. Ця зміна workflow його не приховує й не заявляє зелений Nightly; виправлення helper-виклику перевіряється окремо в межах стабілізації.
- Тести, assertions, retries, timeouts, config, baseline, застосунок, Hero/SW-01 і локалізація не змінювалися. Новий CI-прогін не запускався; статус майбутнього GitHub run ще не встановлено.

Відкат CI-частини: повернути попередню редакцію `nightly-full-qa.yml` і пов'язаний опис. Це поверне дубльовані чотири тести та попередню поведінку діагностики, без змін застосунку.
