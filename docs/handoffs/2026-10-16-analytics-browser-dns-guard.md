# Handoff · Аналітика: live-тест gtag більше не може слати хіти з браузера назовні

| | |
|---|---|
| Дата | 2026-10-16 |
| Виконавець | Claude Code |
| Рев'ю | Внутрішнє — субагенти цієї сесії (знахідка рев'ю #203, A/B відтворено); незалежне — очікується: ChatGPT (через GitHub); рішення — Дмитро |
| PR | Draft. **Merge і deploy не виконувались і не дозволені** без окремого OK Дмитра |
| Гілка / base | `test/analytics-browser-dns-guard` від `main` `c4bfaef` |
| Змінено | лише `tests/e2e/analytics-consent.spec.ts` (+6 рядків, один `test.use`) |
| Не змінено | жодної перевірки; `app/`, CSP, workflows, retries, timeout-и |

## Проблема

`analytics-consent.spec.ts` вантажить справжній gtag.js і відповідає на всі Google-запити локально кодом 204 через `context.route`. Але на переході `/` → `/angary` тег шле keepalive `/g/collect` (`scroll`, `user_engagement`) на `pagehide`, і такий запит іде повз routes Playwright. Отже, кожен Main Regression і Nightly, імовірно, слав справжні GA4-хіти з runner-ів GitHub.

**Відтворення.**
- Що: збережені байти тега, сторінка з production CSP, той самий recording route, локальний TCP-sink замість інтернету.
- Без захисту: з'єднання назовні у **2 з 2** прогонів (по 2 з'єднання).
- Із захистом: **0**.
- Тег в обох режимах пробує надіслати `page_view`, `scroll`, `user_engagement`.
- Чи дійшли хіти до GA4, **не перевірено**: доступу немає (див. OD-11 пакета Wave 01).

## Зміна

```ts
test.use({ launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1 , EXCLUDE localhost'] } });
```

Браузер у цьому файлі не може розв'язати жодне ім'я, крім застосунку. Справжній gtag.js і далі приходить через `route.fetch`, який Playwright виконує поза браузером, тож live-контракт перевіряється як раніше.

## Перевірка

- Docker (CI-збірка `c4bfaef`), `analytics-consent.spec.ts`, desktop + mobile, 2 повтори: **24/24**, жодного skip.
- Unit-guard `e2e-google-intercept`: 7/7.
- `tsc`, `eslint`: чисто.
- Main Regression на гілці: див. коментар у PR.

## Межі

- Spec стає непридатним для `PLAYWRIGHT_BASE_URL` поза 127.0.0.1 / localhost. Зараз такий не використовується.
- Той самий commit входить у #203 (`6542d79`). Якщо цей PR злито першим, «Update branch» для #203 дасть ту саму зміну без конфлікту.
