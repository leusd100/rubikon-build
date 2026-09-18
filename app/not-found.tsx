import type { Metadata } from 'next';
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
          <div className="hero-action-row">
            <a className="button button-primary" href={siteRoutes.home}>На головну</a>
            <a className="text-link" href={siteRoutes.directions}>Напрямки робіт</a>
          </div>
        </div>
      </section>
    </main>
  );
}
