'use client';

import { useEffect, useState } from 'react';
import { company, companyContactLinks } from './data/company';
import { reloadOnce } from './lib/reloadOnce';

// When the site's layout itself fails, this replaces the whole document (audit 08.10: the framework's English «This page
// couldn’t load» with no phone). It carries its own styles — the site's stylesheet may be what failed to load — in the
// site's charcoal and paper. The page reloads itself once first (lib/reloadOnce.ts).

const ink = '#F5F2EB';
const copper = '#CC8455';

export default function GlobalError() {
  const [reloading, setReloading] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the reload decision is the browser's, after mount
    if (!reloadOnce()) setReloading(false);
  }, []);

  return (
    <html lang="uk">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#171918', color: ink, font: '16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif' }}>
        <main style={{ width: 'min(560px, calc(100% - 40px))', padding: '48px 0' }}>
          <p style={{ margin: '0 0 12px', color: copper, font: '700 12px/1.3 system-ui, sans-serif', letterSpacing: '.14em', textTransform: 'uppercase' }}>RUBIKON BUILD</p>
          <h1 style={{ margin: '0 0 14px', fontSize: 40, fontWeight: 400, lineHeight: 1.1 }}>Сторінка не довантажилась</h1>
          <output style={{ display: 'block', margin: '0 0 26px', color: '#BDB7AC' }}>
            {reloading
              ? 'Оновлюємо сторінку…'
              : 'Так буває при обриві зв’язку. Оновіть сторінку або зв’яжіться з нами напряму.'}
          </output>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 24px' }}>
            <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 48, padding: '0 22px', border: 0, borderRadius: 0, background: '#A0522A', color: '#fff', font: '700 15px/1 system-ui, sans-serif', cursor: 'pointer' }}>
              Оновити сторінку
            </button>
            <a href={companyContactLinks.phone} style={{ color: ink, fontWeight: 700 }}>{company.phone.display}</a>
            <a href={companyContactLinks.email} style={{ color: ink }}>{company.email}</a>
          </div>
        </main>
      </body>
    </html>
  );
}
