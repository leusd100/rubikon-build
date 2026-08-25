import { createBasicPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';

export const metadata = createBasicPageMetadata({
  title: 'Варіанти логотипа | RUBIKON BUILD',
  description: 'Робочі концепції фірмового знака RUBIKON BUILD.',
  robots: { index: false, follow: false },
});

const variants = [
  {
    number: '01',
    key: 'monogram',
    title: 'Монограма RB',
    note: 'Найбільш універсальний',
    description: 'Літери R і B з’єднані діагоналлю — знаком руху, переходу та розвитку. Добре працює окремо від назви.',
  },
  {
    number: '02',
    key: 'portal',
    title: 'Портал',
    note: 'Архітектурний',
    description: 'Абстрактний вхід або каркас. Передає будівництво ширше, ніж металоконструкції, і підтримує ідею переходу через Рубікон.',
  },
  {
    number: '03',
    key: 'module',
    title: 'Модуль',
    note: 'Інженерний',
    description: 'Об’ємна конструкція з трьох площин. Асоціації з точністю, простором і комплексною реалізацією об’єкта.',
  },
  {
    number: '04',
    key: 'shield',
    title: 'Технічний шильд',
    note: 'Найсолідніший',
    description: 'Стриманий знак із монограмою в системі кутів. Добре виглядатиме на документах, касках, транспорті та вивісці.',
  },
] as const;

function ProposalMark({ variant }: { variant: (typeof variants)[number]['key'] }) {
  if (variant === 'monogram') {
    return <span className="proposal-mark mark-monogram" aria-hidden="true"><b>R</b><strong>B</strong><i /></span>;
  }

  if (variant === 'portal') {
    return <span className="proposal-mark mark-portal" aria-hidden="true"><i /><i /><b /></span>;
  }

  if (variant === 'module') {
    return <span className="proposal-mark mark-module" aria-hidden="true"><i /><i /><b /></span>;
  }

  return <span className="proposal-mark mark-shield" aria-hidden="true"><b>RB</b><i /><i /></span>;
}

function LogoLockup({ variant }: { variant: (typeof variants)[number]['key'] }) {
  return (
    <span className="proposal-lockup">
      <ProposalMark variant={variant} />
      <span className="proposal-wordmark">
        <b>RUBIKON BUILD</b>
        <small>Construction &amp; Engineering</small>
      </span>
    </span>
  );
}

export default function LogoVariantsPage() {
  return (
    <main className="logo-lab" id="main-content">
      <section className="logo-lab-intro">
        <div className="shell">
          <a className="logo-lab-back" href={siteRoutes.home}>← Повернутися на сайт</a>
          <p className="eyebrow light"><span /> Робочі концепції</p>
          <h1>Новий знак для<br /><em>RUBIKON BUILD</em></h1>
          <p>Шрифт і назву залишаємо. Порівнюємо лише знак — від виразної монограми до стриманого інженерного символу.</p>
        </div>
      </section>

      <section className="logo-lab-options">
        <div className="shell">
          <div className="logo-options-grid">
            {variants.map((variant) => (
              <article className="logo-option" key={variant.key}>
                <div className="logo-option-meta">
                  <span>{variant.number}</span>
                  <small>{variant.note}</small>
                </div>
                <div className="logo-preview logo-preview-dark">
                  <LogoLockup variant={variant.key} />
                </div>
                <div className="logo-preview logo-preview-light">
                  <LogoLockup variant={variant.key} />
                </div>
                <div className="logo-option-copy">
                  <h2>{variant.title}</h2>
                  <p>{variant.description}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="logo-choice-note">Для вибору достатньо написати номер варіанта — 01, 02, 03 або 04.</p>
        </div>
      </section>
    </main>
  );
}
