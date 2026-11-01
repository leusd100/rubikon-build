import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
// Self-hosted rather than next/font/google: Google's copy of Plex Sans Condensed has no Cyrillic.
import './fonts/ibm-plex-sans-condensed.css';
import condensedBoldCyrillic from './fonts/ibm-plex-sans-condensed/IBMPlexSansCondensed-Bold-Cyrillic.woff2?url';
import condensedBoldLatin from './fonts/ibm-plex-sans-condensed/IBMPlexSansCondensed-Bold-Latin1.woff2?url';
import condensedSemiBoldCyrillic from './fonts/ibm-plex-sans-condensed/IBMPlexSansCondensed-SemiBold-Cyrillic.woff2?url';
import condensedSemiBoldLatin from './fonts/ibm-plex-sans-condensed/IBMPlexSansCondensed-SemiBold-Latin1.woff2?url';
// Display face, self-hosted (not on Google Fonts): Fixel Display 400 in a Latin and a Cyrillic subset.
import './fonts/fixel-display.css';
import displayCyrillic from './fonts/fixel-display/FixelDisplay-Regular-Cyrillic.woff2?url';
import displayLatin from './fonts/fixel-display/FixelDisplay-Regular-Latin.woff2?url';
// Metric fallbacks for all three faces on the platforms next/font's Arial face does not cover (Linux, Android).
import './fonts/fallback-metrics.css';
import './theme.css';
import './globals.css';
import './phone-hero.css';
import './mobile-directions-media.css';
import './mobile-media-review.css';
import './conversation.css';
// The sheet's field (margin decor); inert until a page's <main> carries data-field
import './components/sheet-field.css';
// The blocks as a stack of sheets and each page's material (owner 01.11); inert until a page's <main> carries data-field
import './components/page-sheets.css';
import './components/page-materials.css';
import './motion.css';
import { SiteFooter, SiteHeader } from './components/SiteChrome';
import AnalyticsConsent from './components/AnalyticsConsent';
import { FocusClearance } from './components/FocusClearance';
import { MaterialLight } from './components/MaterialLight';
import { StackShade } from './components/StackShade';
import { SiteReveal } from './components/SiteReveal';
import { SmoothScroll } from './components/SmoothScroll';
import { company } from './data/company';
import { directions } from './data/directions';
import { THEME_INIT_SCRIPT } from './lib/theme';
import { CONSENT_PENDING_INIT_SCRIPT } from './lib/consentStorage';

// `fallback` follows next/font's Arial-based 'Manrope Fallback': the faces for Linux and Android, in
// app/fonts/fallback-metrics.css. (No comments inside the options object: vinext then cannot read it statically and
// silently loads the font from Google's CDN, which the CSP blocks.)
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['cyrillic', 'latin'],
  fallback: ['Manrope Fallback Arial-metric', 'Manrope Fallback Roboto', 'Manrope Fallback DejaVu'],
});

export const metadata: Metadata = {
  metadataBase: new URL(company.siteUrl),
  title: `Промислове будівництво у Дніпрі | ${company.name}`,
  description:
    company.description,
  alternates: {
    canonical: '/',
  },
  creator: company.name,
  manifest: '/site.webmanifest?v=rubikon-05',
  icons: {
    icon: [
      { url: '/favicon.svg?v=rubikon-05', sizes: 'any', type: 'image/svg+xml' },
      { url: '/favicon.ico?v=rubikon-05', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon-48x48.png?v=rubikon-05', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=rubikon-05',
    apple: [{ url: '/apple-touch-icon.png?v=rubikon-05', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: `Промислове будівництво у Дніпрі | ${company.name}`,
    description: company.description,
    type: 'website',
    locale: 'uk_UA',
    siteName: company.name,
    url: '/',
    images: [
      {
        url: '/og.jpg?v=rubikon-03',
        width: 1200,
        height: 630,
        alt: `${company.name} — промислове будівництво у Дніпрі`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Промислове будівництво у Дніпрі | ${company.name}`,
    description: company.description,
    images: ['/og.jpg?v=rubikon-03'],
  },
};

export const dynamic = 'force-static';

export const viewport: Viewport = {
  // The header is the charcoal band in both themes, so one browser-chrome colour matches it in both.
  themeColor: '#171918',
  colorScheme: 'light dark',
};

const organizationData = {
  '@context': 'https://schema.org',
  // HomeAndConstructionBusiness, not the more specific GeneralContractor — that subtype asserts
  // a contractual role (being *the* general contractor on a job) the site doesn't claim; the
  // company's own copy explicitly says it works as either підрядник or субпідрядник depending on
  // the project. This parent type stays construction-specific for rich-result eligibility
  // without the unsupported role claim.
  '@type': 'HomeAndConstructionBusiness',
  '@id': `${company.siteUrl}/#organization`,
  name: company.name,
  alternateName: company.alternateNames,
  url: company.siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: `${company.siteUrl}/icon-512x512.png?v=rubikon-05`,
    width: 512,
    height: 512,
  },
  image: `${company.siteUrl}/og.jpg?v=rubikon-03`,
  telephone: company.phone.international,
  email: company.email,
  description: company.description,
  areaServed: company.serviceAreas.map((name) => ({
    '@type': 'AdministrativeArea',
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
        {/* Resolves system/light/dark onto <html> before the first paint, so the first frame already has the right
            theme (app/lib/theme.ts, app/theme.css). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* A first visit (no consent choice stored) is flagged on <html> before the first paint too, so the phone heroes keep
            the cookie banner's room from the first frame instead of moving once it mounts after hydration
            (app/lib/consentStorage.ts, phone-hero.css; PDO-09). */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_PENDING_INIT_SCRIPT }} />
        {/* Plex Condensed sets first-screen text since the UX pass (the «Ілюстрація» stamp, the configurator's eyebrow on
            a phone). Fetched with the CSS, as next/font does for Manrope, it is in before the first paint
            instead of swapping in later and shifting the hero (direction-static-hero.spec.ts). Only the faces nearly every
            page sets: 600 and 700, Latin and Cyrillic; 500 and the Pi subsets stay on demand. */}
        {[condensedSemiBoldLatin, condensedSemiBoldCyrillic, condensedBoldLatin, condensedBoldCyrillic].map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
        {/* The display face sets every page's H1. Both subsets: a Ukrainian heading draws from both (letters from the
            Cyrillic file, spaces and punctuation from the Latin one) — the same two requests Jost's next/font preloads made. */}
        {[displayLatin, displayCyrillic].map((href) => (
          <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />
        ))}
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
      <body className={manrope.variable}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteData) }}
        />
        <a className="skip-link" href="#main-content">Перейти до основного вмісту</a>
        {/* The cookie banner is fixed at the bottom, but first in the tab order after the skip link: at the end of the
            page a keyboard visitor met it after 70–100 stops, every one of them walked behind it (sweep 03.10) */}
        <AnalyticsConsent />
        <SiteHeader />
        {children}
        <SiteFooter />
        <SmoothScroll />
        <SiteReveal />
        <StackShade />
        <MaterialLight />
        <FocusClearance />
      </body>
    </html>
  );
}
