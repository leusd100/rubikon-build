import type { Metadata } from 'next';
import { company, companyContactLinks } from './data/company';
import { siteRoutes } from './data/navigation';
import { brandedTitle } from './lib/seo';

// Replaces the framework's English fallback. The response stays 404 and the framework still adds
// its own noindex; this only drops the root layout's canonical, which would otherwise point a
// missing URL at the home page.
export const metadata: Metadata = {
  title: brandedTitle('Сторінку не знайдено'),
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <main className="inner-page not-found-page" id="main-content">
      <section className="privacy-hero not-found-hero">
        <div className="shell">
          <p className="eyebrow light"><span /> Помилка 404</p>
          <h1>Сторінку<br />не знайдено</h1>
          <p className="not-found-lead">Можливо, посилання застаріло або в адресі є помилка.</p>
          {/* #inquiry: the header's «Контакти» is page-relative (app/data/navigation.ts). The phone and email answer it
              here rather than the full conversation block, because the root not-found tree is serialized into every
              page's RSC payload — the block added ~10 KB of HTML to each page. */}
          <div className="hero-action-row" id="inquiry">
            <a className="button button-primary" href={siteRoutes.home}>На головну</a>
            <a className="text-link" href={siteRoutes.directions}>Напрямки робіт</a>
            <a className="text-link" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>{company.phone.display}</a>
            <a className="text-link" href={companyContactLinks.email}>{company.email}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
