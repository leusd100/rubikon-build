'use client';

import { useEffect, useState } from 'react';
import { company, companyContactLinks } from './data/company';
import { reloadOnce } from './lib/reloadOnce';

// A page that fails inside the site's layout (audit 08.10): the header with the phone stays, and in place of the page the
// visitor gets Ukrainian words, a way to try again and the ways to reach us — never the framework's English screen.
// The page reloads itself once first (lib/reloadOnce.ts); this shows only if that did not help.

export default function PageError({ reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  const [reloading, setReloading] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reload decision is the browser's, after mount
    if (!reloadOnce()) setReloading(false);
  }, []);

  return (
    <main className="inner-page not-found-page" id="main-content">
      <section className="privacy-hero not-found-hero">
        <div className="shell">
          <p className="eyebrow light"><span /> Сторінка не довантажилась</p>
          <h1>Щось пішло<br />не так</h1>
          <p className="not-found-lead" role="status">
            {reloading
              ? 'Оновлюємо сторінку…'
              : 'Частина сторінки не довантажилась — так буває при обриві зв’язку. Оновіть сторінку або зв’яжіться з нами напряму.'}
          </p>
          <div className="hero-action-row">
            <button className="button button-primary" type="button" onClick={() => { reset(); window.location.reload(); }}>Оновити сторінку</button>
            <a className="text-link" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>{company.phone.display}</a>
            <a className="text-link" href={companyContactLinks.email}>{company.email}</a>
          </div>
        </div>
      </section>
    </main>
  );
}
