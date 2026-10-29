# Handoff · React 19.2.9: виправлення advisory React Server Components

| | |
|---|---|
| Дата | 2026-10-29 |
| Виконавець | Claude Code |
| Підстава | Wave 02A брифу Engineering Excellence 29.10 (P0); знахідка DC-10 аудиту 27.10 |
| PR | Draft. **Merge і production deploy — лише з окремого OK Дмитра** (merge у `main` = deploy через Workers Builds) |
| Гілка / base | `fix/react-rsc-advisories` від `main` `e794dc1f` |
| Змінено | `package.json`: `react`, `react-dom`, `react-server-dom-webpack` 19.2.6 → 19.2.9. `pnpm-lock.yaml`: лише ці три пакети і рядки, де вони стоять як peer |
| Не змінено | `vinext`, `@vitejs/plugin-rsc`, `next`, `vite`, `wrangler`, конфігурація Vite і Worker, код застосунку, тести, бюджети, CSP, еталони |

## Що було

`react-server-dom-webpack` 19.2.6 входить у вразливий діапазон трьох advisory:

| Advisory | Рівень | Опубліковано | Що | Виправлено в 19.2.x |
|---|---|---|---|---|
| [GHSA-xqc2-xf4c-x3h3](https://github.com/facebook/react/security/advisories/GHSA-xqc2-xf4c-x3h3) | **critical** | 14.10.2026 | Unauthenticated Remote Code Execution in React Server Components | 19.2.9 |
| [GHSA-h3gv-c5rc-p453](https://github.com/facebook/react/security/advisories/GHSA-h3gv-c5rc-p453) | high | 14.10.2026 | Denial of Service in Server Functions | 19.2.9 |
| [GHSA-wx67-qw84-cm4g](https://github.com/advisories/GHSA-wx67-qw84-cm4g) (CVE-2026-44907) | high | 21–24.07.2026 | Denial of Service in Server Functions | 19.2.8 |

Діапазони взято з GitHub API (`repos/facebook/react/security-advisories`, `/advisories/GHSA-wx67-qw84-cm4g`) 29.10. Перші два є лише в репозиторії React, у глобальній базі GitHub їх ще немає, тому `pnpm audit` на `main` їх не показує.

## Застосовність

- **Яка копія `react-server-dom` іде в Worker.** `@vitejs/plugin-rsc` 0.5.26 має власну вбудовану копію (`dist/vendor/react-server-dom`, теж 19.2.6) і бере встановлений `react-server-dom-webpack`, лише коли той потрапляє в `ssr.noExternal`. Перевірено на збірці: рядок, що є лише в серверному коді `react-server-dom-webpack` 19.2.9 і відсутній у вбудованій копії 19.2.6 («Cannot handle action key. This is a bug in React.»), є в RSC-chunk `dist/server/_next/static/framework~…` і відсутній у збірці `main`. Отже, у Worker іде встановлений пакет, і оновлення `package.json` достатньо: оновлювати `@vitejs/plugin-rsc` не потрібно. Новіший plugin-rsc 0.5.38 вбудовує вже 19.3.1, тобто іншу minor-гілку.
- **Застосовність.** Server Functions (`'use server'`) у застосунку немає. З обережності вразливість вважаю застосовною, доки не доведено протилежне; подробиці — у приватному пакеті власника. Експлойт не запускався, production не зачіпався.
- **Одна копія React.** `pnpm why react`: одна версія, 19.2.9. Усі залежні (`@react-three/fiber`, `lenis`, `lucide-react`, `zustand`, `its-fine`, `@unpic/react`, `vinext`, `@vitejs/plugin-rsc`) отримують її.
- **Сумісність.** peer-діапазони `vinext` 1.0.0-beta.3 — `^19.2.6` для `react`, `react-dom`, `react-server-dom-webpack`; `@vitejs/plugin-rsc` — `*`. 19.2.9 — patch у тій самій гілці, без зміни framework.

## Що лишилось у `pnpm audit` і чому не тут

- `next` 16.2.6 — кілька critical / high (RCE в Image Optimization, `use cache`, `next/og`; DoS у Server Actions). **До runtime не застосовні:** у Worker немає коду Next.js. Імпорти `next/navigation`, `next/font/google`, `next/image` vinext замінює власними shims (перевірено: у `dist/server` немає `next/dist/`, лише шляхи `vinext/dist/`). `next` потрібен для типів і `eslint-config-next`. Оновлення — окрема гігієнічна задача.
- `image-size`, `satori` (залежності vinext) — у `dist/server` їх немає.
- `@lhci/cli`, `@cloudflare/vite-plugin` (undici, ws, vite), `eslint`, `vitest` — лише інструменти збірки, тестів і dev-сервера, не production.

## Перевірка

| Перевірка | Результат |
|---|---|
| `pnpm install --frozen-lockfile` | ок; diff lockfile — лише react / react-dom / react-server-dom-webpack і їхні peer-рядки. `pnpm update` заодно підтягував `legacy-javascript` і `third-party-web` (інструменти Lighthouse) — повернуто до версій `main` |
| `pnpm lint` · `pnpm typecheck` | чисто · чисто |
| `pnpm test:unit` | 103 файли, **1 639 passed** |
| `vinext build` | ок, 12 с |
| Worker у локальному workerd (`wrangler dev --local` на зібраному `dist/server/wrangler.json`, D1 локальна) | 8 сторінок 200, `/does-not-exist` 404. Chrome 156: HOME, `/angary`, `/pro-nas`, `/napryamky`, `/metalokonstruktsii`, `/zernoskhovyshcha` — 0 помилок React і гідрації; X-Ray вмикається (`data-sheet-state="on"`); 3D на `/angary` вантажить chunk (200) і малює `canvas`; Back / Forward між сторінками працюють |
| Targeted e2e (Chrome 156, desktop + mobile, `--retries=0`) | <!-- E2E --> |
| CI: PR Gate, CodeQL, SonarCloud, Workers Builds | після push |

## Ризики

- Patch-реліз React може змінити дрібну поведінку рендерингу. Тексти, DOM і еталони не мали б змінитися; підтвердження — Changed-area visual і Main Regression.
- Наступні advisory React знову вимагатимуть такого оновлення. `pnpm audit` перших двох не бачив — варто стежити за `facebook/react/security/advisories` напряму.

## Відкат

`git revert` merge-коміту: повертає 19.2.6 і lockfile. Після відкату вразливість знову застосовна.
