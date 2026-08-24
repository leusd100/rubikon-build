import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Breadcrumbs, PageCta } from './SiteChrome';
import { DirectionHeroVideo } from './DirectionHeroVideo';

type DirectionItem = [string, string, string];
type DirectionStep = [string, string, string, LucideIcon];

type DirectionDetailProps = {
  number: string;
  title: string;
  accent: string;
  intro: string;
  image: string;
  imageAlt: string;
  video: string;
  overviewEyebrow: string;
  overviewTitle: string;
  overviewText: string;
  items: DirectionItem[];
  processTitle: string;
  processText: string;
  steps: DirectionStep[];
  ctaEyebrow: string;
  ctaTitle: string;
};

export function DirectionDetail({
  number,
  title,
  accent,
  intro,
  image,
  imageAlt,
  video,
  overviewEyebrow,
  overviewTitle,
  overviewText,
  items,
  processTitle,
  processText,
  steps,
  ctaEyebrow,
  ctaTitle,
}: DirectionDetailProps) {
  return (
    <main className="inner-page">
      <section className="service-subhero">
        <div className="service-subhero-media">
          <DirectionHeroVideo sources={[video]} poster={image} />
        </div>
        <div className="service-subhero-overlay" />
        <div className="shell service-subhero-content">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Напрямки', href: '/napryamky' }, { label: title, href: '#' }]} />
          <p className="eyebrow light"><span /> Напрямок {number}</p>
          <h1>{title}<br /><em>{accent}</em></h1>
          <p>{intro}</p>
        </div>
      </section>

      <section className="page-section">
        <div className="shell page-two-col align-start">
          <div className="sticky-heading">
            <p className="eyebrow"><span /> {overviewEyebrow}</p>
            <h2>{overviewTitle}</h2>
            <p className="lead-copy">{overviewText}</p>
          </div>
          <div className="feature-list">
            {items.map(([itemNumber, itemTitle, itemText]) => (
              <article key={itemNumber}><span>{itemNumber}</span><h3>{itemTitle}</h3><p>{itemText}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section page-section-dark">
        <div className="shell">
          <div className="page-heading split-heading">
            <div><p className="eyebrow light"><span /> Послідовність</p><h2>{processTitle}</h2></div>
            <p>{processText}</p>
          </div>
          <ol className="detail-steps">
            {steps.map(([stepNumber, stepTitle, stepText, Icon]) => (
              <li key={stepNumber}><span>{stepNumber}</span><Icon className="detail-step-icon" aria-hidden="true" /><h3>{stepTitle}</h3><p>{stepText}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-section">
        <div className="shell page-media-grid single-direction-media">
          <div className="media-tile media-tile-large"><Image src={image} alt={imageAlt} fill sizes="100vw" /></div>
        </div>
        <p className="shell media-note dark-note">Візуальний матеріал ілюструє напрямок робіт. Власне портфоліо буде додано окремим розділом.</p>
      </section>

      <PageCta eyebrow={ctaEyebrow} title={ctaTitle} />
    </main>
  );
}
