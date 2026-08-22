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
  title: 'Рубікон Білд — металоконструкції та ангари під ключ',
  description:
    'Родинна будівельна компанія з понад 30-річним досвідом. Металоконструкції, ангари, зерносховища та фасадні роботи у Дніпропетровській області й інших регіонах України.',
  openGraph: {
    title: 'Рубікон Білд — будуємо з відповідальністю родини',
    description: 'Металоконструкції, ангари та промислові об’єкти під ключ.',
    type: 'website',
    locale: 'uk_UA',
    images: [
      {
        url: '/og.png',
        width: 1730,
        height: 909,
        alt: 'Рубікон Білд — металоконструкції та ангари під ключ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Рубікон Білд',
    description: 'Металоконструкції, ангари та промислові об’єкти під ключ.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body className={`${manrope.variable} ${oswald.variable}`}>{children}</body>
    </html>
  );
}
