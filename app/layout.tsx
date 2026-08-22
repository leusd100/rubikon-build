import type { Metadata } from 'next';
import { IBM_Plex_Sans_Condensed, Jost, Manrope } from 'next/font/google';
import './globals.css';
import { SiteFooter, SiteHeader } from './components/SiteChrome';

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
  metadataBase: new URL('https://rubicon-build.bronze-spoon-6603.chatgpt.site'),
  title: 'Металоконструкції та промислові споруди під ключ у Дніпрі | RUBIKON BUILD',
  description:
    'Металоконструкції, ангари, склади й зерносховища у Дніпрі та області: будівництво під ключ або окремі роботи у форматі підряду та субпідряду.',
  alternates: {
    canonical: '/',
  },
  creator: 'RUBIKON BUILD',
  openGraph: {
    title: 'Металоконструкції та промислові споруди під ключ | RUBIKON BUILD',
    description: 'Промислові споруди під ключ або окремі роботи з металоконструкцій, бетонування, фасадів і монтажу у Дніпрі та області.',
    type: 'website',
    locale: 'uk_UA',
    siteName: 'RUBIKON BUILD',
    url: '/',
    images: [
      {
        url: '/og.png',
        width: 1730,
        height: 909,
        alt: 'RUBIKON BUILD — металоконструкції та промислові споруди під ключ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Металоконструкції та промислові споруди під ключ | RUBIKON BUILD',
    description: 'Промислові споруди під ключ або окремі роботи у форматі підряду та субпідряду.',
    images: ['/og.png'],
  },
};

const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'GeneralContractor',
  name: 'RUBIKON BUILD',
  alternateName: 'Рубікон Білд',
  url: 'https://rubicon-build.bronze-spoon-6603.chatgpt.site',
  description:
    'Родинна будівельна компанія: промислові споруди під ключ та окремі роботи з металоконструкцій, бетонування, фасадів і монтажу.',
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
    'Фасадні роботи',
    'Промислове будівництво',
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body className={`${manrope.variable} ${condensed.variable} ${display.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
