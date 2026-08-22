import type { Metadata } from 'next';
import { Manrope, Oswald } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['cyrillic', 'latin'],
});

const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['cyrillic', 'latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rubicon-build.bronze-spoon-6603.chatgpt.site'),
  title: 'Металоконструкції та ангари під ключ у Дніпрі | RUBICON BUILD',
  description:
    'Проєктування, виготовлення та монтаж металоконструкцій, ангарів, зерносховищ і фасадів у Дніпрі та області. Понад 30 років будівельного досвіду.',
  alternates: {
    canonical: '/',
  },
  creator: 'RUBICON BUILD',
  openGraph: {
    title: 'Металоконструкції та ангари під ключ | RUBICON BUILD',
    description: 'Родинна будівельна компанія у Дніпрі. Понад 30 років практичного досвіду.',
    type: 'website',
    locale: 'uk_UA',
    siteName: 'RUBICON BUILD',
    url: '/',
    images: [
      {
        url: '/og.png',
        width: 1730,
        height: 909,
        alt: 'RUBICON BUILD — металоконструкції та ангари під ключ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Металоконструкції та ангари під ключ | RUBICON BUILD',
    description: 'Родинна будівельна компанія у Дніпрі. Понад 30 років практичного досвіду.',
    images: ['/og.png'],
  },
};

const organizationData = {
  '@context': 'https://schema.org',
  '@type': 'GeneralContractor',
  name: 'RUBICON BUILD',
  alternateName: 'Рубікон Білд',
  url: 'https://rubicon-build.bronze-spoon-6603.chatgpt.site',
  description:
    'Родинна будівельна компанія: металоконструкції, ангари, зерносховища, фасади та промислове будівництво.',
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
      <body className={`${manrope.variable} ${oswald.variable}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
        {children}
      </body>
    </html>
  );
}
