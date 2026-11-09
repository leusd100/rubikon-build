import type { Metadata } from 'next';
import { company, companyContactLinks } from './data/company';
import { siteRoutes } from './data/navigation';
import { brandedTitle } from './lib/seo';

const notFoundTitle = brandedTitle('Сторінку не знайдено');
const notFoundDescription = 'Можливо, посилання застаріло або в адресі є помилка.';

// Replaces the framework's English fallback. The response stays 404 and the framework still adds
// its own noindex; this drops the root layout's canonical, which would otherwise point a missing
// URL at the home page. The description and the social card are its own for the same reason: inherited,
// they said the home page's title and og:url, so a shared broken link previewed as the home page.
export const metadata: Metadata = {
  title: notFoundTitle,
  description: notFoundDescription,
  alternates: { canonical: null },
  openGraph: {
    title: notFoundTitle,
    description: notFoundDescription,
    type: 'website',
    locale: 'uk_UA',
    siteName: company.name,
    images: [{ url: '/og.jpg?v=rubikon-03', width: 1200, height: 630, alt: `${company.name} — промислове будівництво у Дніпрі` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: notFoundTitle,
    description: notFoundDescription,
    images: ['/og.jpg?v=rubikon-03'],
  },
};

export default function NotFound() {
  return (
    <main className="inner-page not-found-page" id="main-content">
      <section className="privacy-hero not-found-hero">
        <div className="shell">
          <p className="eyebrow light"><span /> Помилка 404</p>
          <h1>Сторінку<br />не знайдено</h1>
          <p className="not-found-lead">{notFoundDescription}</p>
          {/* #inquiry: the header's «Контакти» is page-relative (app/data/navigation.ts). The phone and email answer it
              here rather than the full conversation block, because the root not-found tree is serialized into every
              page's RSC payload — the block added ~10 KB of HTML to each page. */}
          <div className="hero-action-row" id="inquiry">
            <a className="button button-primary" href={siteRoutes.home}>На головну</a>
            <a className="text-link" href={siteRoutes.directions}>Напрямки робіт</a>
            <a className="text-link" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>{company.phone.display}</a>
            <a className="text-link not-found-email" href={companyContactLinks.email}>{company.email}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
