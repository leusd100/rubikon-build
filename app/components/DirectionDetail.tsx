import type { LucideIcon } from 'lucide-react';
import { Breadcrumbs, PageCta } from './SiteChrome';
import { DirectionHeroVideo } from './DirectionHeroVideo';

export type DirectionItem = [string, string, string];
export type DirectionStep = [string, string, string, LucideIcon];
export type DirectionFaqItem = [string, string];

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
  return (
    <section className="service-subhero">
      <div className="service-subhero-media">
        <DirectionHeroVideo key={video} sources={[video]} poster={poster} />
      </div>
      <div className="service-subhero-overlay" />
      <div className="subhero-grid" aria-hidden="true" />
      <div className="shell service-subhero-content">
        <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Напрямки', href: '/napryamky' }, { label: breadcrumbLabel, href: path }]} />
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
  steps: DirectionStep[];
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
  items: DirectionItem[];
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

export function DirectionFaq({ title, items }: { title: string; items: DirectionFaqItem[] }) {
  return (
    <section className="page-section faq-section">
      <div className="shell faq-grid">
        <div><p className="eyebrow"><span /> Питання</p><h2>{title}</h2></div>
        <div className="faq-list">
          {items.map(([question, answer]) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}
        </div>
      </div>
    </section>
  );
}

type DirectionDetailProps = {
  path: string;
  number: string;
  title: string;
  accent: string;
  intro: string;
  image: string;
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
  path,
  number,
  title,
  accent,
  intro,
  image,
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
      <DirectionHero
        path={path}
        number={number}
        breadcrumbLabel={title}
        title={title}
        accent={accent}
        intro={intro}
        poster={image}
        video={video}
      />

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

      <DirectionProcess title={processTitle} text={processText} steps={steps} />

      <PageCta eyebrow={ctaEyebrow} title={ctaTitle} />
    </main>
  );
}
