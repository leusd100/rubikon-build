import { Breadcrumbs, PageCta } from './SiteChrome';
import { DirectionHeroVideo } from './DirectionHeroVideo';
import { absoluteUrl, siteName, siteUrl } from '../lib/seo';
import type { DirectionFaqItem, DirectionItem, DirectionPageConfig, DirectionStep } from '../types/directionPage';
import { getDirection } from '../data/directions';
import { company } from '../data/company';
import { siteRoutes } from '../data/navigation';

export type { DirectionFaqItem, DirectionItem, DirectionStep } from '../types/directionPage';

type DirectionHeroProps = {
  path: string;
  number: string;
  breadcrumbLabel: string;
  title: string;
  accent: string;
  intro: string;
  poster: string;
  video: string;
};

export function DirectionHero({
  path,
  number,
  breadcrumbLabel,
  title,
  accent,
  intro,
  poster,
  video,
}: DirectionHeroProps) {
  const serviceData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: title,
    serviceType: title,
    description: intro,
    url: absoluteUrl(path),
    image: absoluteUrl(poster),
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Дніпропетровська область' },
      { '@type': 'Country', name: 'Україна' },
    ],
    provider: {
      '@type': 'GeneralContractor',
      name: siteName,
      url: siteUrl,
      telephone: company.phone.international,
    },
  };

  return (
    <section className="service-subhero">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceData) }} />
      <div className="service-subhero-media">
        <DirectionHeroVideo key={video} sources={[video]} poster={poster} />
      </div>
      <div className="service-subhero-overlay" />
      <div className="subhero-grid" aria-hidden="true" />
      <div className="shell service-subhero-content">
        <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Напрямки', href: siteRoutes.directions }, { label: breadcrumbLabel, href: path }]} />
        <p className="eyebrow light"><span /> Напрямок {number}</p>
        <h1>{title}<br /><em>{accent}</em></h1>
        <p>{intro}</p>
      </div>
    </section>
  );
}

export function DirectionProcess({
  eyebrow = 'Послідовність',
  title,
  text,
  steps,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  steps: readonly DirectionStep[];
}) {
  return (
    <section className="page-section page-section-dark">
      <div className="shell">
        <div className="page-heading split-heading">
          <div><p className="eyebrow light"><span /> {eyebrow}</p><h2>{title}</h2></div>
          <p>{text}</p>
        </div>
        <ol className="detail-steps">
          {steps.map(([stepNumber, stepTitle, stepText, Icon]) => (
            <li key={stepNumber}><span>{stepNumber}</span><Icon className="detail-step-icon" aria-hidden="true" /><h3>{stepTitle}</h3><p>{stepText}</p></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function DirectionCostSection({
  title,
  text,
  items,
}: {
  title: string;
  text: string;
  items: readonly DirectionItem[];
}) {
  return (
    <section className="page-section cost-section">
      <div className="shell">
        <div className="page-heading split-heading">
          <div><p className="eyebrow"><span /> Формування кошторису</p><h2>{title}</h2></div>
          <p>{text}</p>
        </div>
        <div className="cost-grid">
          {items.map(([number, itemTitle, itemText]) => <article key={number}><span>{number}</span><h3>{itemTitle}</h3><p>{itemText}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function DirectionFaq({ title, items }: { title: string; items: readonly DirectionFaqItem[] }) {
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  return (
    <section className="page-section faq-section">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqData) }} />
      <div className="shell faq-grid">
        <div><p className="eyebrow"><span /> Питання</p><h2>{title}</h2></div>
        <div className="faq-list">
          {items.map(([question, answer]) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function DirectionPage({ config }: { config: DirectionPageConfig }) {
  const direction = getDirection(config.id);

  return (
    <main className="inner-page" id="main-content">
      <DirectionHero
        path={direction.href}
        number={direction.number}
        breadcrumbLabel={config.hero.breadcrumbLabel}
        title={config.hero.title}
        accent={config.hero.accent}
        intro={config.hero.intro}
        poster={direction.image}
        video={config.hero.video}
      />

      <section className="page-section">
        {config.overview.layout === 'use-cases' ? (
          <>
            <div className="shell page-heading split-heading">
              <div><p className="eyebrow"><span /> {config.overview.eyebrow}</p><h2>{config.overview.title}</h2></div>
              {config.overview.text && <p>{config.overview.text}</p>}
            </div>
            <div className="shell use-case-grid">
              {config.overview.items.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
            </div>
          </>
        ) : (
          <div className="shell page-two-col align-start">
            <div className="sticky-heading">
              <p className="eyebrow"><span /> {config.overview.eyebrow}</p>
              <h2>{config.overview.title}</h2>
              {config.overview.text && <p className="lead-copy">{config.overview.text}</p>}
            </div>
            <div className="feature-list">
              {config.overview.items.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
            </div>
          </div>
        )}
      </section>

      <DirectionProcess {...config.process} />
      {config.cost && <DirectionCostSection {...config.cost} />}
      {config.faq && <DirectionFaq {...config.faq} />}
      <PageCta {...config.cta} />
    </main>
  );
}
