/* eslint-disable @next/next/next-script-for-ga -- Consent mode must run before the external Google tag. */
import type { Metadata } from 'next';
import { IBM_Plex_Sans_Condensed, Jost, Manrope } from 'next/font/google';
import './globals.css';
import { SiteFooter, SiteHeader } from './components/SiteChrome';
import AnalyticsConsent from './components/AnalyticsConsent';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['cyrillic', 'latin'],
});

const condensed = IBM_Plex_Sans_Condensed({
  variable: '--font-condensed',
  subsets: ['cyrillic-ext', 'latin'],
  weight: ['400', '500', '600', '700'],
});

const display = Jost({
  variable: '--font-display',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rubikonbuild.com'),
  title: 'Промислове будівництво у Дніпрі | RUBIKON BUILD',
  description:
    'Промислове будівництво у Дніпрі та області: комплексна реалізація об’єктів або окремі роботи у форматі підряду й субпідряду.',
  alternates: {
    canonical: '/',
  },
  creator: 'RUBIKON BUILD',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Промислове будівництво під ключ | RUBIKON BUILD',
    description: 'Промислові, складські й аграрні об’єкти під ключ або окремі роботи у форматі підряду та субпідряду у Дніпрі та області.',
    type: 'website',
    locale: 'uk_UA',
    siteName: 'RUBIKON BUILD',
    url: '/',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'RUBIKON BUILD — промислове будівництво під ключ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Промислове будівництво під ключ | RUBIKON BUILD',
    description: 'Промислові, складські й аграрні об’єкти під ключ або окремі роботи у форматі підряду та субпідряду.',
    images: ['/og.jpg'],
  },
};

export const dynamic = 'force-static';

const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'GeneralContractor',
  name: 'RUBIKON BUILD',
  alternateName: 'Рубікон Білд',
  url: 'https://rubikonbuild.com',
  telephone: '+380682614264',
  description:
    'Родинна будівельна компанія: промислові споруди під ключ та окремі роботи з ангарів, зерносховищ, металоконструкцій, бетонування, покрівлі й монтажу.',
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Дніпропетровська область' },
    { '@type': 'Country', name: 'Україна' },
  ],
  founder: [
    { '@type': 'Person', name: 'Леус Сергій Іванович' },
    { '@type': 'Person', name: 'Леус Дмитро Сергійович' },
  ],
  knowsAbout: [
    'Металоконструкції',
    'Ангари',
    'Зерносховища',
    'Покрівельні роботи',
    'Промислове будівництво',
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html { background: #f7f5ef; }
              html:not(.site-css-timeout) body { visibility: hidden; }
              html.site-css-timeout body { visibility: visible; }
              html.site-css-failed body > * { display: none !important; }
              html.site-css-failed body::before {
                content: 'Оновлюємо сторінку…';
                display: grid;
                min-height: 100vh;
                place-items: center;
                padding: 24px;
                box-sizing: border-box;
                color: #111214;
                font: 600 20px/1.4 Arial, sans-serif;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var refreshParam = '_rb';

                document.addEventListener('click', function (event) {
                  var link = event.target && event.target.closest
                    ? event.target.closest('a[href]')
                    : null;
                  if (!link || link.target || link.hasAttribute('download')) return;
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

                  var url = new URL(link.href, window.location.href);
                  if (url.origin !== window.location.origin) return;
                  if (url.pathname === window.location.pathname && url.search === window.location.search) return;

                  url.searchParams.set(refreshParam, '1');
                  event.preventDefault();
                  window.location.assign(url.pathname + url.search + url.hash);
                }, true);

                window.addEventListener('load', function () {
                  var root = document.documentElement;
                  var styled = window.getComputedStyle(document.body).fontFamily.indexOf('Manrope') !== -1;
                  var retryKey = 'rubikon-css-retry:' + window.location.pathname;
                  var alreadyRetried = false;

                  try {
                    alreadyRetried = window.sessionStorage.getItem(retryKey) === '1';
                  } catch (_) {}

                  if (!styled) {
                    if (!alreadyRetried) {
                      try { window.sessionStorage.setItem(retryKey, '1'); } catch (_) {}
                      var retryUrl = new URL(window.location.href);
                      retryUrl.searchParams.set(refreshParam, String(Date.now()));
                      window.location.replace(retryUrl.toString());
                      return;
                    }
                    root.classList.add('site-css-failed', 'site-css-timeout');
                    return;
                  }

                  try { window.sessionStorage.removeItem(retryKey); } catch (_) {}
                  root.classList.add('site-css-timeout');

                  var cleanUrl = new URL(window.location.href);
                  if (cleanUrl.searchParams.has(refreshParam)) {
                    cleanUrl.searchParams.delete(refreshParam);
                    window.history.replaceState(
                      window.history.state,
                      '',
                      cleanUrl.pathname + cleanUrl.search + cleanUrl.hash
                    );
                  }
                });

                window.setTimeout(function () {
                  if (document.documentElement.classList.contains('site-css-timeout')) return;
                  if (window.getComputedStyle(document.body).fontFamily.indexOf('Manrope') !== -1) {
                    document.documentElement.classList.add('site-css-timeout');
                    return;
                  }
                  var retryUrl = new URL(window.location.href);
                  retryUrl.searchParams.set(refreshParam, String(Date.now()));
                  window.location.replace(retryUrl.toString());
                }, 4000);
              })();
            `,
          }}
        />
        <noscript><style>{'body { visibility: visible !important; }'}</style></noscript>
        <link
          rel="preload"
          href="/media/hero-steel-frame.jpg"
          as="image"
          type="image/jpeg"
          fetchPriority="high"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                wait_for_update: 500
              });
              gtag('js', new Date());
              gtag('config', 'G-WYRXJV71WG', { anonymize_ip: true });
            `,
          }}
        />
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-WYRXJV71WG" />
      </head>
      <body className={`${manrope.variable} ${condensed.variable} ${display.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        <SiteHeader />
        {children}
        <SiteFooter />
        <AnalyticsConsent />
      </body>
    </html>
  );
}
