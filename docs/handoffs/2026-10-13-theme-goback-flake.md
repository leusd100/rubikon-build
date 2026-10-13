# Handoff · flaky-тест «назад на HOME» у `theme.spec.ts` (PR #188)

| | |
|---|---|
| Дата | 2026-10-13 |
| Виконавець | Claude Code (реалізація) |
| Рев'ю | ChatGPT (незалежне), Дмитро (рішення) |
| PR | https://github.com/leusd100/rubikon-build/pull/188 · **Draft** |
| Гілка | `fix/theme-goback-flake` |
| Base | `main` `7679561` (#182) |
| Статус | IMPLEMENTED у гілці · REVIEW-READY · не злито, не розгорнуто |
| Рішення | Не потрібне: змінено лише тест. Продукт не змінено |

Цей файл — канонічний handoff для обох агентів. Приватних даних тут немає, бо репозиторій публічний.

## 1. Мета й обсяг

Крок «flaky-тести» фази оптимізації тестів (handoff #186, §5 і §7 п. 5).
- Тест: `tests/e2e/theme.spec.ts:145` «the choice persists HOME → service page → back», desktop-chromium.
- Де впав: Main Regression [run 38299705842](https://github.com/leusd100/rubikon-build/actions/runs/38299705842) (`workflow_dispatch` гілки PR #186), job «Main E2E (2/4)».
- Перша спроба впала в рядку 154 (`page.evaluate: Execution context was destroyed, most likely because of a navigation`), повтор пройшов. Через `failOnFlakyTests` це failure.

Завдання: знайти справжню причину й зробити так, щоб тест чекав справжнього кінця переходу назад. Без skip, без послаблення перевірки, без фіксованих пауз (SonarCloud S2925). Якщо гонка в продукті — повідомити, а не змінювати поведінку мовчки.

## 2. Джерела

- Trace першої спроби з blob-артефакту `main-e2e-blob-2` (зберігається 7 днів). На CI: Playwright 1.62.1, Chromium 151 headless, production-збірка.
- Код: `vinext` 1.0.0-beta.3 (`app-browser-entry.js`, `app-browser-history-controller.js`), `playwright-core` 1.62.1 (`page.goBack`, `frame.waitForNavigation`), `react-dom` 19.2.6.
- Локально:
  - production-збірка цього дерева;
  - системний Chrome 155 через обгортку конфігурації з `channel: 'chrome'`;
  - порти 4593/4594, `--retries 0`.
- Повільний CI-runner імітує CDP `Emulation.setCPUThrottlingRate`, тобто сповільнення процесора лише для сторінки.

## 3. Корінна причина

**Гіпотеза з постановки не підтвердилась.** Клік по картці не є клієнтською навігацією (`pushState`):
- `DirectionCards.tsx:61` рендерить звичайний `<a href>`.
- У trace це документний `GET /metalokonstruktsii` з `Referer: /`, без заголовка `RSC`.
- Назад — теж документний `GET /`. Playwright запускає Chromium з `--disable-back-forward-cache`, тож у тестах HOME після «Назад» завжди завантажується заново. Це властивість тестового браузера, а не продукту.

**Справжня причина — три факти разом:**

1. **`goBack()` у Playwright чекає першої навігаційної події кадру, зокрема й події в тому самому документі.**
   - У 1.62.1 це `waitForNavigation(progress, false /* requiresNewDocument */)`: крок історії може лишитися в тому самому документі.
   - Для `reload()` там же стоїть `true` з коментарем «should not be confused with a stray pushState».
   - Якщо поточний документ уже мав `load`, `goBack({ waitUntil: 'load' })` повертається одразу, з `response = null`.
2. **vinext двічі пише стан роутера в поточний запис історії через `history.replaceState`.** Для CDP кожен запис — це `Page.navigatedWithinDocument` (`historyApi`).
   - Перший запис — до гідратації (ключ `__vinext_historyIndex`).
   - Другий — на першому гідратованому коміті, `writeHydratedHistoryMetadata` у `useLayoutEffect` (плюс ключі `__vinext_bfcacheIds`, `__vinext_bfcacheVersion`).
   - Гідратація йде в `startTransition`, тобто конкурентно, тож другий запис приходить **після `load`**: +8…14 мс без сповільнення, +84…86 мс при 4×, +136…143 мс при 6× (`/metalokonstruktsii`, локально, по два прогони).
3. **На CI цей запис потрапив у вікно між початком `goBack()` і комітом HOME.** Час у мс від першого виклику тесту (trace):

| мс | Подія |
|---|---|
| 1781.5 | `load` сторінки `/metalokonstruktsii` |
| 1781.7–1834.1 | `expectTheme` читає стан: dark |
| 1861.2 | `goBack` почав чекати навігацію |
| 1882.2 | `navigated to "/metalokonstruktsii"` — та сама адреса, тобто запис у тому самому документі |
| 1887.5 | `goBack` повернувся: через 41.5 мс, `response = null` |
| 1891.7 | документний `GET /` без `Referer`, тобто справжній крок назад |
| 1898.3 → 1911.3 | `evaluate` у `expectTheme` → «Execution context was destroyed» |

Знімок сторінки на момент помилки — уже HOME.

**Відтворено локально, з тим самим підписом:**
- Дослівна копія тесту, сповільнення 3.5×: упала 1 / 30.
  - `goBack` повернувся через 35.5 мс.
  - `navigated to "/metalokonstruktsii"` прийшло через 25.7 мс після того, як `goBack` почав чекати.
  - Далі — «Execution context was destroyed».
- Копія з логом подій: упала 3 / 40.
  - Щоразу `goBack` відпустив саме гідратований `replaceState` vinext (ключі з `__vinext_bfcacheIds`).
  - Він прийшов через 14–20 мс після `goBack`: уже після старту кроку назад і до коміту HOME.
- Без сповільнення гонка не відтворилась.
  - Запис зазвичай приходить ще до `goBack`.
  - У прогонах при 3× записи через 2–10 мс після виклику `goBack` його не відпускали: очікування ще не було ввімкнене.

**Це не гонка продукту.**
- Запис стану роутера в поточний запис історії — звичайна службова дія. Next.js робить те саме.
- Зайвого перезавантаження немає.
- Користувач цієї події не бачить.
- Повідомляти про дефект продукту нема про що.

Ще одне джерело таких самих подій — стандартний індикатор переходу React 19.2.6. Якщо transition висить понад 100 мс, він викликає `navigation.navigate(<той самий URL>, { history: 'replace' })`, а після переривання повторює це через 20 мс. У локальних падіннях його не було. Виправлення від джерела не залежить, тож покриває й цей випадок.

## 4. Зміни

| Коміт | Що |
|---|---|
| `979df98` | **Регресійна перевірка, що падає до виправлення.** Новий тест «going back waits for HOME itself, not for a history write on the page it leaves». Сторінка послуги пише свій запис історії на місці (`history.replaceState`) у `beforeunload`, тобто вже після початку кроку назад і до коміту HOME: це порядок подій з CI, зроблений гарантованим. Зі старим очікуванням `goBack({ waitUntil: 'load' })` тест падав 40 / 40 (desktop + mobile): `goBack` повертався на `/metalokonstruktsii` |
| `6db9944` | **Виправлення.** Помічник `goBackTo(page, pathname)`: `page.goBack()`, а потім `page.waitForURL(url => url.pathname === pathname, { waitUntil: 'load' })`, тобто очікування власного документа HOME до його `load`. Playwright скидає стан `load` ще до події нового документа, тож це справді `load` HOME. Обидва тести використовують помічник |
| (цей коміт) | Цей handoff |

Продукт не змінено.

Чому `beforeunload`, а не затримка запиту:
- Поки крок назад до іншого документа в дорозі, Chromium притримує команди DevTools до старого кадру аж до коміту.
- Тому `replaceState`, надісланий із тесту, у вікно не потрапляв:
  - якщо запит HOME утримувати через `route`, навіть сирий CDP `Runtime.evaluate` чекав аж до відпускання запиту, і тест падав за таймаутом;
  - якщо уповільнити мережу через DevTools, запис виконувався вже після коміту HOME і падав на «context destroyed» — навіть з новим очікуванням (10 / 10).
- Запис мусить іти зсередини сторінки, як у vinext. `beforeunload` спрацьовує рівно один раз: після того як `goBack` почав чекати, і до запиту HOME.

## 5. Тести

Локально: production-збірка цього дерева, системний Chrome, `--retries 0`, 2 workers.

| Перевірка | До (`979df98`, старе очікування) | Після (`6db9944`) |
|---|---|---|
| Регресійний тест, desktop + mobile ×20 | **40 / 40 упали** (`Received: "/metalokonstruktsii"`) | 50 / 50 пройшли (×25) |
| Тест з CI, desktop + mobile ×25 | — | 50 / 50 пройшли |
| Дослівна копія тесту з CI, CPU 3.5×, desktop | **1 / 30 упав**; копія з логом подій — **3 / 40 упали** | 0 / 80 упали; крок назад 386–729 мс (медіана 505), щоразу на `/` |
| Увесь `theme.spec.ts`, desktop + mobile ×3 | — | 66 пройшли, 6 пропущено (наявні skip для desktop або mobile), 0 упали |
| ESLint на файлі, `tsc --noEmit` | — | OK, OK |
| PR Gate / SonarCloud | — | запущено на PR |

Медіана тривалості: тест з CI — 1.8 с (desktop) і 2.2 с (mobile); новий тест — 1.7 с на кожен проєкт.

## 6. Докази (RUBIKON-archive)

Шлях: `RUBIKON-archive/research/ci/2026-10-13-theme-goback-flake/` (поза git; 25 МБ, 170 файлів; `shasum -a 256 -c SHA256SUMS.txt` → 0 помилок).

| Файл | SHA-256 |
|---|---|
| `SHA256SUMS.txt` | `6da2d0c0937889ce6208c974af4f7cbabd80f4889701fa922558e07f291905a9` |
| `MANIFEST.tsv` | `a138049c2b3d7dafcdaf3fc3971264c093215e2ba6a0643687e0b520a6b41550` |
| `blob-2/report-desktop-chromium-mobile-chromium-2.zip` | `1e79bb446b21db1696fd689f0399034ffb54cbd7c5f84d3156a036d8f6938a15` |
| `ci/trace-timeline.txt` | `69c4bd4f314271f7a42e712d8700bf7da1c9dd1afd5e9125bae3a3021f67a809` |
| `logs/red.log` | `6dc06e0fa7fc42fe9b0a06640bc041d3e25a1c5184f77e89239fc3a0968fe2e8` |
| `logs/green.log` | `f9b9567d8c2a2933ac3c0bc2015cc14245451ce0ef68de5aafb14c353a395035` |
| `logs/natural-old-3.5.json` | `1728f1b5f1c20b1fb39f24e3be8fcdace00e6de6291e45ab6551cd218cd2aba7` |
| `logs/natural-new-3.5.log` | `23a96acd759ac636c1db26b516d044c3992ddcbea59c81ccd0a80e7c071b1ca1` |
| `logs/tl-cpu35.txt` | `2df79695aec58cd25a95d0b968d3da9b007ed283fa09befcac5cc001635e309d` |
| `logs/theme-all.log` | `e2f3b08972f8a6bd7ef3db781e7104cfabe355b348acacd5e0fff6aa9f53f8af` |

Вміст теки:
- `blob-2/` — артефакт CI як є.
- `trace-x/`, `ci/trace-timeline.txt` — trace першої спроби та його хронологія.
- `logs/` — прогони до й після, JSON-звіти, хронології подій зі сповільненням.
- `local-trace/` — trace локального природного падіння (3.5×).
- `harness/` — обгортка конфігурації, діагностичні spec, скрипт хронології.

## 7. Свідомо не зроблено

| Що | Чому |
|---|---|
| `configurator-behaviour.spec.ts:46` (`page.goBack()` → `about:blank`) | Після нього йде `expect(page).toHaveURL('about:blank')`, а ця перевірка повторюється до збігу, і `evaluate` там немає. Ранній вихід `goBack` нічого не ламає |
| Глобальна обгортка `goBack` (фікстура) | `goBack` у suite вживається двічі, і ризиковий лише цей виклик. Помічник лежить поруч із тестами, яким він потрібен |
| Тест зі сповільненням процесора в CI | Природне відтворення ймовірнісне (~1 / 20–30). Детермінований порядок дає `beforeunload`; сповільнення лишилось лише в діагностиці |
| Зміни в продукті (vinext, React) | Записи історії правильні й невидимі для користувача; гонка була лише в очікуванні тесту |

## 8. Ризики

- **Регресійний тест спирається на те, що Chromium запускає `beforeunload` перед кроком назад до іншого документа.** Якщо це зміниться, тест стане звичайним тестом кроку назад і проходитиме з будь-яким очікуванням. Хибних падінь від цього не буде, але й захисту теж.
- **`waitForURL` дивиться лише на pathname.** Якщо колись HOME після кроку назад отримає query або hash, помічник це прийме, і саме так і задумано.
- **Новий тест додає до CI** приблизно 1.7 с на кожен проєкт.

## 9. Відкрите й пропоновані оновлення контролю

Усі пункти — лише після OK Дмитра:
- **`CURRENT_CHECKPOINT`:** «flaky `theme.spec.ts:145` (Main Regression, run 38299705842) — виправлення в #188; крок 5 фази оптимізації тестів».
- **`INDEX`/`MANIFEST` архіву:** окремий R-ID для `research/ci/2026-10-13-theme-goback-flake/`.
- **Порядок злиття:** #188 не залежить від #186. Але #186 на своїй гілці падав саме на цьому тесті. Якщо злити #188 першим, наступний доказовий прогін #186 не зачепить цієї гонки.
