# Handoff · Внутрішні прототипи — 404 на production (X-01: PDO-29)

| | |
|---|---|
| Дата | 2026-10-24 |
| Виконавець | Claude Code |
| Підстава | Власник 24.10: «давай летіти далі» після пропозиції почати з X-01. Варіант — рекомендація OD-PX-33 (a) для всіх чотирьох маршрутів і canonical на саму сторінку. Якщо потрібен інший варіант — змінюється список у `proxy.ts` |
| PR | Draft. **Merge і production deploy — лише з окремого OK Дмитра** (DEC-30) |
| Гілка / base | `fix/hide-prototypes-production` від `main` `0949cca` |
| Коміти | **`ce28e6a`** — код і тест · цей handoff |
| Змінено | `proxy.ts`; metadata `app/configurator-preview/page.tsx`, `app/logo-variants/page.tsx`, `app/r3f-spike/page.tsx`. Тест: новий `tests/unit/security/production-hidden.test.ts` |
| Не змінено | Код самих сторінок; `robots.ts` (заборона лишається); sitemap; локальний перегляд, тести й preview-збірки |

## Що зроблено

- **404 на production.** На домені `rubikonbuild.com` чотири внутрішні маршрути віддають 404 зі сторінкою сайту «Сторінку не знайдено»: `/planner-preview`, `/configurator-preview`, `/logo-variants`, `/r3f-spike`. Це стосується й будь-якої адреси під ними. `www` і далі спершу перенаправляє на основний домен.
- **Навіщо.** Ці сторінки відкривались на production з `noindex`. Але `robots.txt` забороняє пошуковикам їх читати, тож `noindex` вони не бачать. До того ж `/planner-preview` показує варіант «безкаркасне арочне» при відкритому бізнес-рішенні D-04.
- **Як.** `proxy.ts` переписує запит на маршрут, якого немає (`/_hidden-prototype`). Сторінку не знайдено віддає сам сайт: статус 404, ті самі заголовки безпеки (CSP, X-Frame-Options тощо). Код прототипів лишився, тож локально (127.0.0.1), у тестах і на preview-збірках (`*.workers.dev`) вони відкриваються як раніше.
- **Canonical.** `/configurator-preview`, `/logo-variants` і `/r3f-spike` успадковували canonical головної («/») від layout, тобто сторінка з `noindex` вказувала на головну. Тепер canonical кожної — на саму сторінку. У `/planner-preview` він уже був.

## Перевірка

| Що | Результат |
|---|---|
| `production-hidden.test.ts` (новий) + `csp.test.ts` | 13 passed |
| Локальний production build, `curl` з `Host: rubikonbuild.com` | 4 прототипи → 404, title «Сторінку не знайдено», CSP і X-Frame-Options на місці; `/`, `/angary` → 200 |
| Той самий build без заголовка (127.0.0.1) | 4 прототипи → 200 |
| Canonical `/configurator-preview` | `https://rubikonbuild.com/configurator-preview` |
| 9 специфікацій: `grain-page`, `grain-planner`, `grain-planner-handoff`, `grain-planner-mobile`, `grain-planner-stabilization`, `pr-critical`, `r3f-spike`, `smoke`, `ux-conversion-phase2` (усі на 127.0.0.1) | 268 passed, 47 skipped, 1 failed — `grain-planner-handoff:164` (mobile) під навантаженням; окремо ×3 — інший тест цього файлу (`:147`) раз упав, `:164` пройшов: нестабільність планувальника, для 127.0.0.1 проксі поводиться як на `main` |
| `vitest` | 1446 passed |
| `tsc`, `eslint` | чисто |
| CI | у коментарі PR |

Що перевіряє `production-hidden.test.ts`:

- кожен із чотирьох маршрутів на `rubikonbuild.com`, з `/` у кінці й із параметрами, переписується на `/_hidden-prototype`, і заголовки безпеки лишаються;
- на `127.0.0.1`, `localhost` і preview-хості `*.workers.dev` переписування немає, на публічних сторінках production теж (зокрема `/planner-preview-notes`, `/logo`);
- `www.rubikonbuild.com/planner-preview` — 308 на основний домен.

## Після деплою (власник)

```
curl -s -o /dev/null -w '%{http_code}' https://rubikonbuild.com/planner-preview
```
→ `404`. Якщо хтось у команді показує ці адреси клієнтам — вони тепер відкриваються лише на preview-збірці.

## Еталони (DEC-18)

Не зачеплено: `configurator-visual`, `brand-logo-visual` і `grain-planner-visual` знімають ці сторінки локально (127.0.0.1), де вони відкриваються як раніше.

## Відкат

`git revert ce28e6a`.
