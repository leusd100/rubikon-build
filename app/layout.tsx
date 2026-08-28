import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Condensed, Jost, Manrope } from 'next/font/google';
import './globals.css';
import { SiteFooter, SiteHeader } from './components/SiteChrome';
import AnalyticsConsent from './components/AnalyticsConsent';
import { company } from './data/company';
import { directions } from './data/directions';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['cyrillic', 'latin'],
});

const condensed = IBM_Plex_Sans_Condensed({
  variable: '--font-condensed',
  subsets: ['cyrillic-ext', 'latin'],
  weight: ['500', '600', '700'],
  preload: false,
});

const display = Jost({
  variable: '--font-display',
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  metadataBase: new URL(company.siteUrl),
  title: `Промислове будівництво у Дніпрі | ${company.name}`,
  description:
    'Промислове будівництво у Дніпрі та області: комплексна реалізація об’єктів або окремі роботи у форматі підряду й субпідряду.',
  alternates: {
    canonical: '/',
  },
  creator: company.name,
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: `Промислове будівництво у Дніпрі | ${company.name}`,
    description: 'Промислові, складські й аграрні об’єкти під ключ або окремі роботи у форматі підряду та субпідряду у Дніпрі та області.',
    type: 'website',
    locale: 'uk_UA',
    siteName: company.name,
    url: '/',
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: `${company.name} — промислове будівництво у Дніпрі`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Промислове будівництво у Дніпрі | ${company.name}`,
    description: 'Промислові, складські й аграрні об’єкти під ключ або окремі роботи у форматі підряду та субпідряду.',
    images: ['/og.jpg'],
  },
};

export const dynamic = 'force-static';

export const viewport: Viewport = {
  themeColor: '#141416',
  colorScheme: 'light dark',
};

const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'GeneralContractor',
  '@id': `${company.siteUrl}/#organization`,
  name: company.name,
  alternateName: company.alternateNames,
  url: company.siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: `${company.siteUrl}/favicon.svg`,
  },
  image: `${company.siteUrl}/og.jpg`,
  telephone: company.phone.international,
  description: company.description,
  areaServed: company.serviceAreas.map((name, index) => ({
    '@type': index === 0 ? 'AdministrativeArea' : 'Country',
    name,
  })),
  founder: company.founders.map((name) => ({ '@type': 'Person', name })),
  knowsAbout: directions.map(({ serviceTitle }) => serviceTitle),
};

const websiteData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${company.siteUrl}/#website`,
  url: company.siteUrl,
  name: company.name,
  alternateName: company.alternateNames,
  inLanguage: 'uk-UA',
  publisher: {
    '@id': `${company.siteUrl}/#organization`,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
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
            `,
          }}
        />
      </head>
      <body className={`${manrope.variable} ${condensed.variable} ${display.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
        />
        <a className="skip-link" href="#main-content">Перейти до основного вмісту</a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <AnalyticsConsent />
      </body>
    </html>
  );
}
