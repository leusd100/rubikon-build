# Handoff · Внутрішні review-галереї поза деплоєм (DC-02)

| | |
|---|---|
| Дата | 2026-10-29 |
| Виконавець | Claude Code |
| Підстава | Wave 02D брифу 29.10; знахідка DC-02 аудиту 27.10 |
| PR | Draft. **Merge і production deploy — лише з окремого OK Дмитра** |
| Гілка / base | `chore/review-galleries-off-deploy` від `main` `e794dc1f` |
| Змінено | `public/media/reviews/` → `design-assets/reviews/` (228 файлів, `git mv`, вміст байт у байт той самий); одне відносне посилання в `docs/handoffs/2026-10-24-mobile-hero-options.md`; новий `tests/unit/public-no-internal-pages.test.ts` |
| Не змінено | Код застосунку, сторінки, CSP, `robots.ts`, заголовки, Cloudflare |

## Що було

Перевірено 29.10 на production (лише GET):
- `rubikonbuild.com/media/reviews/creative-hero-options/`, `/mobile-hero-options/`, `/unified-mobile-heroes/` → **200 `text/html`**, `gallery.js` → 200.
- **Без `Content-Security-Policy`:** asset layer відповідає раніше за Worker.
- `robots.txt` їх не забороняє. Сторінки посилаються на preview workers.dev і на PR #243.
- Handoff-и #243 вимагали прибрати каталог перед merge; його змерджили разом із #243.

Інші внутрішні маршрути вже закриті: `/logo-variants`, `/configurator-preview`, `/r3f-spike`, `/planner-preview` → 404 на production і `Disallow` у `robots.txt`. Тут нічого робити не треба.

## Що зроблено

- Галереї перенесено в `design-assets/reviews/`: вони лишаються в репозиторії, але не деплояться. Посилання в них відносні (`screens/…`, `assets/…`), тож вони відкриваються локально з репозиторію.
- Запобіжник: `public/` не містить жодного HTML і жодного каталогу `reviews/` (на `main` тест падає).

## Перевірка

| Перевірка | Результат |
|---|---|
| `vinext build` | ок; `dist/client/media/reviews` відсутній; HTML у `dist/client` — 0 |
| `tests/unit/public-no-internal-pages.test.ts` | гілка — pass; на вмісті `main` — падає (228 файлів у `public/media/reviews`) |
| Посилання на `media/reviews` у `app/`, `scripts/`, `tests/` | 0 |

## Ризики

- Після деплою ці URL віддадуть 404. Зовнішні посилання на галереї (листи, чати) перестануть працювати. Для команди — відкривати з репозиторію або з preview-деплою гілки.
- Старий шлях лишається в історії handoff-ів #243 як опис того часу; виправлено лише відносне посилання, що вело на файл.

## Відкат

`git revert` merge-коміту.
