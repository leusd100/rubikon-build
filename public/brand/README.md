# RUBIKON BUILD — refined industrial identity

Затверджений напрям: спрощена конструктивна літера R, холодний steel tone,
плоский помаранчевий accent і графітове тло.

## Файли

- rubikon-build-dark.svg / .png — для темного тла, основний логотип сайту.
- rubikon-build-light.svg / .png — для світлого тла.
- rubikon-build-black.svg / .png — одноколірний графітовий логотип.
- rubikon-build-white.svg / .png — одноколірний білий логотип.
- rubikon-mark-copper.svg / .png — окремий мідний знак R.
- rubikon-mark-black.svg / .png — графітовий знак R.
- rubikon-mark-white.svg / .png — білий знак R.
- rubikon-build-horizontal-dark.svg / .png — основний легкий metallic lockup для web.
- rubikon-build-horizontal-light.svg / .png — плоский lockup для світлого тла.
- rubikon-build-horizontal-premium.svg / .png — brushed-metal версія для великих форматів.
- rubikon-mark-dark.svg / .png — легкий metallic знак для темного тла.
- rubikon-mark-light.svg / .png — плоский знак для світлого тла.
- rubikon-mark-premium.svg / .png — premium знак для hero, print і signage.

SVG — майстер-файли. Усі літери у векторних контурах, зовнішні шрифти не потрібні.
PNG — прозорі: повні логотипи 2540 × 544 px, окремі знаки 1280 × 1120 px.

## Кольори

- Мідь на темному: #BF8868.
- Мідь на світлому: #9B6245.
- Графіт: #161A1B.
- Світлий: #F4F1EA.

Не розтягувати, не додавати сильні тіні, chrome-ефекти чи світіння. Зберігати вільне поле
не менше ширини вертикальної опори знака. Для дуже малих квадратних місць
використовувати плоский знак R без напису та metallic texture.

## Іконки сайту (у public/)

- favicon.svg — масштабована іконка; app/icon.svg містить той самий знак.
- favicon.ico — 16, 32 та 48 px в одному файлі.
- favicon-16x16.png, favicon-32x32.png, favicon-48x48.png.
- apple-touch-icon.png — 180 × 180 px.
- icon-192x192.png, icon-512x512.png — стандартні іконки.
- icon-maskable-512x512.png — для адаптивного обрізання на телефоні.
- site.webmanifest — налаштування іконок домашнього екрана.

У 16 px проміжки знака оптично збільшені. У maskable-версії знак повністю
вміщується в центральну безпечну зону; тло заповнює весь квадрат.

Відтворення комплекту: node scripts/generate-brand-assets.mjs (встановлені залежності проєкту).
