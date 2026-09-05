import { Breadcrumbs, GhostWord, SectionHeader } from './SiteChrome';
import InquirySection from './InquirySection';
import ResponsiveImage from './ResponsiveImage';
import { DirectionHeroImage } from './DirectionHeroImage';
import { absoluteUrl, siteUrl } from '../lib/seo';
import type { DirectionFaqItem, DirectionItem, DirectionPageConfig, DirectionStep } from '../types/directionPage';
import { getDirection } from '../lib/directions';
import { relatedDirections } from '../data/relatedDirections';
import type { DirectionHeroImageAsset } from '../data/directionHeroImageManifest';
import { company } from '../data/company';
import { siteRoutes } from '../data/navigation';
import type { ReactNode } from 'react';

const directionGhostWords: Record<DirectionPageConfig['id'], string> = {
  angary: 'HANGAR',
  zernoskhovyshcha: 'GRAIN',
  metalokonstruktsii: 'STEEL',
  'betonni-roboty': 'CONCRETE',
  'pokrivelni-roboty': 'ROOF',
};

const mediaFirstEditorialDirections = new Set<DirectionPageConfig['id']>([
  'zernoskhovyshcha',
  'betonni-roboty',
]);

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
  heroImage: DirectionHeroImageAsset;
};

export function DirectionHero({
  path,
  number,
  breadcrumbLabel,
  title,
  accent,
  intro,
  heroImage,
}: DirectionHeroProps) {
  const serviceData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: title,
    serviceType: title,
    description: intro,
    url: absoluteUrl(path),
    image: absoluteUrl(heroImage.fallbackSrc),
    areaServed: company.serviceAreas.map((name, index) => ({
      '@type': index === 0 ? 'AdministrativeArea' : 'Country',
      name,
    })),
    provider: {
      // Reference the single Organization node declared in layout.tsx rather than restating it
      // inline: an inline copy produces a second, disconnected company entity in the graph.
      '@id': `${siteUrl}/#organization`,
    },
  };

  return (
    <section className="service-subhero">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceData) }} />
      <div className="service-subhero-media">
        <DirectionHeroImage asset={heroImage} />
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
  // Process (right above this section) is a sequence — ordered steps, a bordered card grid says
  // that correctly. Cost factors aren't ordered — they're simultaneous considerations, so this
  // deliberately does NOT reuse .cost-grid's box-grid logic (that class stays exactly as-is for
  // the homepage Services section, which is a separate, unrelated use of it). .cost-list is a
  // full-width technical band list instead — reads as a spec sheet, not a second copy of Process.
  return (
    <section className="page-section cost-section">
      <div className="shell">
        <SectionHeader className="page-heading" eyebrow="Формування кошторису" title={title} supporting={text} />
        <DirectionItemCards className="cost-list" items={items} />
      </div>
    </section>
  );
}

function DirectionEditorial({
  directionId,
  editorial,
}: {
  directionId: DirectionPageConfig['id'];
  editorial: DirectionPageConfig['editorial'];
}) {
  const layout = mediaFirstEditorialDirections.has(directionId) ? 'media-first' : 'copy-first';

  return (
    <section className="page-section direction-editorial-section">
      <div className="shell direction-editorial-grid" data-layout={layout}>
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

function RelatedDirections({ id }: { id: DirectionPageConfig['id'] }) {
  const related = relatedDirections[id];

  if (!related.length) return null;

  return (
    <section className="page-section related-directions-section">
      <div className="shell">
        <p className="eyebrow"><span /> Суміжні роботи</p>
        <h2 className="related-directions-title">Пов’язані напрямки</h2>
        {/* data-count drives the exactly-3-item grid variant in globals.css (.related-grid[data-count="3"])
            — angary is currently the only direction with 3 related entries; every other count keeps the
            default flex layout untouched. */}
        <nav className="related-grid" data-count={related.length} aria-label="Пов’язані напрямки робіт">
          {related.map(({ id: relatedId, relation }) => {
            const direction = getDirection(relatedId);

            return (
              <a className="related-card" href={direction.href} key={relatedId}>
                <h3>{direction.title}</h3>
                <span aria-hidden="true">↗</span>
                <p>{relation}</p>
              </a>
            );
          })}
        </nav>
      </div>
    </section>
  );
}

export function DirectionPage({
  config,
  signatureExperience,
  technicalChapter,
  hideCost = false,
}: {
  config: DirectionPageConfig;
  signatureExperience?: ReactNode;
  technicalChapter?: ReactNode;
  hideCost?: boolean;
}) {
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
        heroImage={direction.heroImage}
      />

      {signatureExperience}

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

      <DirectionEditorial directionId={config.id} editorial={config.editorial} />
      {technicalChapter}
      <DirectionProcess {...config.process} />
      {!hideCost && config.cost && <DirectionCostSection {...config.cost} />}
      {config.faq && <DirectionFaq {...config.faq} />}
      <RelatedDirections id={config.id} />
      <InquirySection eyebrow={config.cta.eyebrow} title={config.cta.title} defaultDirection={direction.formLabel} />
    </main>
  );
}
