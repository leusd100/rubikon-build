# HOME: мобільний LCP, responsive media і повторна робота X-Ray

10.10.2026. Базовий main `41f28c60ed293949a2560fb27cb37ebc42431a25` має те саме дерево `7b4b421e3c063a16a8880902464b3c275b05c569`, що й виміряний `77ffb207…`. Пакет підготовлено для review; merge та ручного deploy немає.

## Підтверджені зміни

- Мобільний LCP-постер: AVIF 480/752w, той самий crop/роздільність, WebP fallback. Typed preload і picture до/після hydration вибирають один формат. 752w: 115 190 → 83 326 B (−27,7%); 480w: 59 306 → 44 672 B (−24,7%). Це lossy derivative, не побітово ідентичне зображення. Генератор `scripts/generate-home-hero-avif.mjs` використовує Sharp 0.34.5 із lockfile Next, quality55/effort7/4:2:0. Чинні WebP не переписані.
- Картки: `sizes` тепер відповідає shell/gutter, 18px gap, 1.15/.85 колонкам і необхідній ширині при cover. При 1440/DPR1 ангар: 1200w/93 816 → 768w/51 796 B (−42 020 B). Інші картки інколи отримують більше пікселів, коли старе 35vw занижувало їхню потребу. Найбільший існуючий варіант лишається 1200w. Це lazy media; окремого ефекту LCP не заявляємо.
- X-Ray `useLabelFit`: геометрія читається групами, ті самі word boxes використовуються повторно, pin attributes змінюються лише за потреби. Семантика приховування назв/літер біля шва збережена.
- Тест легенди: main також відтворював нестабільність computed opacity одразу після attribute commit. Poll очікує ті самі точні значення, не змінює opacity, snapshots або пороги. Неправильний .18 замість .14 і далі відхиляється.

## Локальне A/B постера

Незмінний main HTML/ресурси, змінено тільки тіло/MIME постера; 3 черговані cold-пари. Chrome155/Lighthouse13.5, DevTools CPU×4, latency562.5ms/download1474.56Kbps, 390×844/DPR2. Локальний Brotli HTTP/1.1 proxy відрізняється від CDN/HTTP2 і PSI simulation. Сирі значення: [poster-ab-summary.json](evidence/2026-10-10/poster-ab-summary.json).

| Показник | WebP | AVIF |
|---|---:|---:|
| LCP median, ms | 6832.630 | 6282.197 |
| LCP range, ms | 6827.474–6960.694 | 6272.192–6284.692 |
| FCP median, ms | 1771.717 | 1643.347 |
| CLS, усі повтори | .001230 | .001230 |
| Transfer у цьому контролі, B | 877134 | 845269 |

Медіанний локальний LCP −550.433ms/−8.1%; це не прогноз production score. TBT шумний, з outlier1212ms; приріст TBT не приписуємо зміні формату.

## Scripted X-Ray interaction

Chromium151.0.7922.34, CPU×4/DPR2, 90 pointer moves, прогріті fonts/photo, вступна анімація завершена, відео заблоковане лише вимірювачем. 3 черговані пари на кожному viewport. [12 профілів](evidence/2026-10-10/xray-profile-summary.json).

| Median | Desktop1440 до → після | Mobile390 до → після |
|---|---:|---:|
| Geometry reads назв/вузлів | 1174 → 583 | 400 → 400 |
| Layout count | 42 → 42 | 40 → 40 |
| Layout CPU, ms | 34.622 → 35.420 | 32.819 → 31.827 |
| Style CPU, ms | 280.109 → 250.547 | 165.002 → 167.329 |
| Script CPU, ms | 279.476 → 238.874 | 245.058 → 244.522 |
| Frame interval P95, ms | 17.6 → 17.6 | 17.6 → 17.5 |

Desktop geometry reads −50.3%, але layout count/frame cadence не змінилися. На mobile читання не зменшилися через іншу видимість назв. Це CONFIRMED_LOW_IMPACT, не field INP і не доказ усунення всіх267ms reflows на скріні DebugBear.

## QA

Production build/typecheck/lint: PASS; unit78 suites/1272 tests: PASS. Hero/media36 tests: PASS без retries, включно з cold DPR1/2, SSR/no-JS AVIF і контрольним unsupported-MIME WebP fallback, video/pause/reduced motion для HOME, /pro-nas, /napryamky, та8 responsive контекстами821–1920px × DPR1/2. Ці тести входять у чинний PR hero gate.

Linux HOME visual12/12 PASS, 0flaky/0retries: офіційний Playwright1.62.1-noble ARM64, 2CPU/2GiB; серверна production-збірка на Mac. Не є повною Linux-збіркою або AMD64 CI. Mac HOME visual: ті самі8 stale-еталонних розбіжностей на main і на патчі;4PASS в обох. Snapshots/пороги не змінювали.

Повний X-Ray прогін до test synchronization:87PASS/14project-condition skips/1 нестабільний тест. Його main control:2PASS/1FAIL; після synchronization5/5main repeats PASS. Негативний .14→.18 control FAIL як очікується. Фінальний повний X-Ray прогін: **88PASS/14project-condition skips/0FAIL**, без retries.

Візуально перевірено390×844,360×740,1440×900, light/dark. Реальні iOS/Safari тут не перевірені. Unsupported-MIME тест не називаємо реальним тестом Safari.

## Production і наступна перевірка

Останній [автоматичний PSI](https://github.com/leusd100/rubikon-build/actions/runs/38026719110): mobile median82 (80–84), LCP4202ms; desktop99, LCP761ms; CLS0. Це baseline до цього PR. CrUX URL/origin metrics порожні; field CWV/INP висновку немає. WorkflowSHA не доводить deploymentSHA. Нові шість API-викликів не запускали.

Після owner merge і дозволеного релізу: цільовий PSI Mobile, перевірка AVIF Content-Type/selected source/одного запиту, далі3 незалежні повтори для медіани й variance. Перевірити fallback на доступному браузері, реальний iPhone, CLS, X-Ray drag/keyboard/layers/nodes/tour.

Шрифти не видаляли. Вісім preload потребують узгодженого source-level A/B, а не HTML-only перехоплення: hydration відновлює hints і може створити дублікати. `bodyHiding.js` зі скріна не атрибутований. Inline-CSS exploratory control не дав LCP вигоди й не включений. Desktop cinema, реальні фото, форми, P01/SEO/business claims, configurator/planner не змінені. Rollback: revert PR; чинні fallback assets доступні.
