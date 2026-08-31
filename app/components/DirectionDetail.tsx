import { Breadcrumbs, GhostWord, SectionHeader } from './SiteChrome';
import InquirySection from './InquirySection';
import ResponsiveImage from './ResponsiveImage';
import { DirectionHeroVideo } from './DirectionHeroVideo';
import { absoluteUrl, siteName, siteUrl } from '../lib/seo';
import type { DirectionFaqItem, DirectionItem, DirectionPageConfig, DirectionStep } from '../types/directionPage';
import { getDirection } from '../data/directions';
import { company } from '../data/company';
import { siteRoutes } from '../data/navigation';

const directionGhostWords: Record<DirectionPageConfig['id'], string> = {
  angary: 'HANGAR',
  zernoskhovyshcha: 'GRAIN',
  metalokonstruktsii: 'STEEL',
  'betonni-roboty': 'CONCRETE',
  'pokrivelni-roboty': 'ROOF',
};

export type { DirectionFaqItem, DirectionItem, DirectionStep } from '../types/directionPage';

function DirectionItemCards({
  className,
  items,
}: {
  className: string;
  items: readonly DirectionItem[];
}) {
  return (
    <div className={className}>
      {items.map(([number, title, text, Icon]) => (
        <article key={number}>
          <span>{number}</span>
          {Icon && <Icon className="card-icon" aria-hidden="true" />}
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

type DirectionHeroProps = {
  path: string;
  number: string;
  breadcrumbLabel: string;
  title: string;
  accent: string;
  intro: string;
  poster: string;
  mobilePoster: string;
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
  mobilePoster,
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
    areaServed: company.serviceAreas.map((name, index) => ({
      '@type': index === 0 ? 'AdministrativeArea' : 'Country',
      name,
    })),
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
        <DirectionHeroVideo
          key={video}
          sources={[video]}
          poster={poster}
          mobilePoster={mobilePoster}
          playbackRate={0.85}
        />
      </div>
      <div className="service-subhero-overlay" />
      <div className="subhero-grid" aria-hidden="true" />
      <div className="shell service-subhero-content">
        <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Напрямки', href: siteRoutes.directions }, { label: breadcrumbLabel, href: path }]} />
        <p className="eyebrow light"><span /> Напрямок {number}</p>
        <h1>{title}<br /><em>{accent}</em></h1>
        <p className="service-subhero-lead">{intro}</p>
        <a className="button button-primary" href="#inquiry">
          Обговорити проєкт <span aria-hidden="true">↗</span>
        </a>
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
        <SectionHeader className="page-heading" eyebrow={eyebrow} title={title} supporting={text} inverse />
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
        <SectionHeader className="page-heading" eyebrow="Формування кошторису" title={title} supporting={text} />
        <DirectionItemCards className="cost-grid" items={items} />
      </div>
    </section>
  );
}

function DirectionEditorial({ editorial }: { editorial: DirectionPageConfig['editorial'] }) {
  return (
    <section className="page-section direction-editorial-section">
      <div className="shell direction-editorial-grid">
        <div className="direction-editorial-copy">
          <p className="eyebrow"><span /> {editorial.eyebrow}</p>
          <h2>{editorial.title}</h2>
          <p>{editorial.text}</p>
        </div>
        <figure className="direction-editorial-media">
          <ResponsiveImage
            src={editorial.image}
            alt={editorial.imageAlt}
            sizes="(max-width: 760px) calc(100vw - 32px), 64vw"
          />
        </figure>
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
        poster={direction.heroPoster}
        mobilePoster={direction.heroPosterMobile}
        video={config.hero.video}
      />

      <section className="page-section ghost-section">
        <GhostWord word={directionGhostWords[config.id]} />
        {config.overview.layout === 'use-cases' ? (
          <>
            <SectionHeader
              className="shell page-heading"
              eyebrow={config.overview.eyebrow}
              title={config.overview.title}
              supporting={config.overview.text || ''}
            />
            <DirectionItemCards className="shell use-case-grid" items={config.overview.items} />
          </>
        ) : (
          <div className="shell page-two-col align-start">
            <div className="sticky-heading">
              <p className="eyebrow"><span /> {config.overview.eyebrow}</p>
              <h2>{config.overview.title}</h2>
              {config.overview.text && <p className="lead-copy">{config.overview.text}</p>}
            </div>
            <DirectionItemCards className="feature-list" items={config.overview.items} />
          </div>
        )}
      </section>

      <DirectionEditorial editorial={config.editorial} />
      <DirectionProcess {...config.process} />
      {config.cost && <DirectionCostSection {...config.cost} />}
      {config.faq && <DirectionFaq {...config.faq} />}
      <InquirySection eyebrow={config.cta.eyebrow} title={config.cta.title} defaultDirection={direction.formLabel} />
    </main>
  );
}
