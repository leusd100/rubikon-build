import { Breadcrumbs, HeroCallButton, HeroCallLink, SectionHeader } from './SiteChrome';
import { DirectionSectionDrawing, hasSectionDrawing } from './directions/DirectionSectionDrawing';
import { DirectionEntry } from './directions/DirectionEntry';
import { COST_GLYPHS, CostGlyph } from './directions/CostGlyph';
import { ProcessMotion } from './process/ProcessMotion';
import { ConversationSection } from './ConversationSection';
import ResponsiveImage from './ResponsiveImage';
import { DrawingSheet, type SheetCell } from './DrawingSheet';
import { DirectionNode } from './directions/DirectionNode';
import { ProcessDrawing } from './directions/ProcessDrawing';
import { DirectionHeroImage } from './DirectionHeroImage';
import { absoluteUrl, siteUrl } from '../lib/seo';
import type { DirectionFaqItem, DirectionItem, DirectionPageConfig, DirectionStep, ProcessSplit } from '../types/directionPage';
import { getDirection } from '../lib/directions';
import { faqAnswerText } from '../lib/deliveryModelPresentation';
import { relatedDirections, type RelatedDirection } from '../data/relatedDirections';
import type { DirectionHeroImageAsset } from '../data/directionHeroImageManifest';
import { company, companyContactLinks } from '../data/company';
import { DIRECTION_JOURNEY } from '../data/conversation';
import { siteRoutes } from '../data/navigation';
import type { CSSProperties, ReactNode } from 'react';
import './directions/direction-template.css';
import './faq.css';

const mediaFirstEditorialDirections = new Set<DirectionPageConfig['id']>([
  'zernoskhovyshcha',
  'betonni-roboty',
]);

export type { DirectionFaqItem, DirectionItem, DirectionStep } from '../types/directionPage';

/** The class names that are set, space-separated. */
function classNames(...names: (string | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

function DirectionItemCards({
  className,
  items,
  motion = false,
}: {
  className: string;
  items: readonly DirectionItem[];
  /** Rises in one by one when the page's motion controller sees it (direction-template.css) */
  motion?: boolean;
}) {
  return (
    <div className={className} data-motion={motion ? '' : undefined}>
      {items.map(([number, title, text, Icon], index) => (
        <article key={number} style={{ '--i': index } as CSSProperties}>
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
  introPhone?: string;
  notePhone?: string;
  heroImage: DirectionHeroImageAsset;
  actions?: NonNullable<DirectionPageConfig['hero']['actions']>;
};

function DirectionHero({
  path,
  number,
  breadcrumbLabel,
  title,
  accent,
  intro,
  introPhone,
  notePhone,
  heroImage,
  actions,
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
    <section className={classNames('service-subhero', actions?.sectionClassName)}>
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
        {/* A phone gets the shorter lead (introPhone) so the call stays on the first screen; both are in the markup and
            CSS shows one, so the words never depend on JavaScript */}
        <p className="service-subhero-lead">
          {introPhone ? <><span className="lead-full">{intro}</span><span className="lead-phone">{introPhone}</span></> : intro}
        </p>
        {actions ? (
          <div className={actions.className}>
            <HeroCallButton />
            {actions.items.map((action) => (
              <a key={action.href} className={action.className} href={action.href}>
                {`${action.label} `}<span aria-hidden="true">{action.arrow}</span>
              </a>
            ))}
            <HeroCallLink />
          </div>
        ) : (
          <div className="hero-action-row">
            <HeroCallButton />
            <a className="button button-primary" href="#inquiry">
              Обговорити задачу <span aria-hidden="true">↓</span>
            </a>
            <HeroCallLink />
          </div>
        )}
        {notePhone && <p className="service-subhero-note">{notePhone}</p>}
      </div>
      {/* Every direction hero is a concept image: said in the same quiet stamp as /yak-pratsyuiemo and the HOME phone hero */}
      <span className="hero-provenance">Ілюстрація</span>
    </section>
  );
}

export function DirectionProcess({
  eyebrow = 'Послідовність',
  title,
  text,
  steps,
  split,
  className,
}: {
  eyebrow?: string;
  title: string;
  text: string;
  steps: readonly DirectionStep[];
  split?: readonly ProcessSplit[];
  className?: string;
}) {
  const sides = split?.length === steps.length ? split : undefined;
  return (
    <section className={classNames('page-section page-section-dark', className)}>
      <div className="shell">
        <SectionHeader className="page-heading" eyebrow={eyebrow} title={title} supporting={text} inverse />
        {sides ? (
          <>
            {/* «Ви · Ми» (owner, 06.10): over the rail what you do, under it what we do (the step's own text), on the
                rail what you get after the step, drawn small; the rail is their ground. In view the drawings plot in
                one by one and a copper light runs the rail once (direction-template.css). */}
            <p className="process-key" aria-hidden="true"><span>Ви</span><span>RUBIKON</span></p>
            <ol className="process-split" data-motion>
              {steps.map(([stepNumber, stepTitle, stepText], index) => (
                <li key={stepNumber} style={{ '--i': index } as CSSProperties}>
                  <h3><b>{stepNumber}</b>{stepTitle}</h3>
                  <p className="ps-you"><small>Ви</small>{sides[index].you}</p>
                  <div className="ps-node">
                    <ProcessDrawing kind={sides[index].drawing} />
                    {index === 0 && <span className="ps-spark" aria-hidden="true" />}
                  </div>
                  <p className="ps-result"><span className="sr-only">Результат: </span>{sides[index].result}</p>
                  <p className="ps-we"><small>Ми</small>{stepText}</p>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <ol className="detail-steps" data-motion>
            {/* A sequence on one rail (globals.css .detail-steps); in view, the rail draws from node to node */}
            {steps.map(([stepNumber, stepTitle, stepText], index) => (
              <li key={stepNumber} style={{ '--i': index } as CSSProperties}><span>{stepNumber}</span><h3>{stepTitle}</h3><p>{stepText}</p></li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

export function DirectionCostSection({
  title,
  text,
  items,
  directionId,
}: Readonly<{
  title: string;
  text: string;
  items: readonly DirectionItem[];
  directionId: DirectionPageConfig['id'];
}>) {
  // a direction's glyphs belong to its own list of factors: another list (the grain page's flag-off rollback) draws none
  const glyphs = COST_GLYPHS[directionId]?.length === items.length ? COST_GLYPHS[directionId] : undefined;
  // Process (right above this section) is a sequence — ordered steps, a bordered card grid says
  // that correctly. Cost factors aren't ordered — they're simultaneous considerations, so this
  // deliberately does NOT reuse .cost-grid's box-grid logic (that class stays exactly as-is for
  // the homepage Services section, which is a separate, unrelated use of it). .cost-list is a
  // full-width technical band list instead — reads as a spec sheet, not a second copy of Process.
  return (
    <section className="page-section cost-section">
      <div className="shell">
        <SectionHeader className="page-heading" eyebrow="Формування кошторису" title={title} supporting={text} />
        {/* Each factor with its line glyph, drawn in as the list comes into view */}
        <div className={classNames('cost-list', glyphs && 'has-glyphs')} data-motion>
          {items.map(([number, itemTitle, itemText], index) => (
            <article key={number} style={{ '--i': index } as CSSProperties}>
              <span>{number}</span>
              {glyphs?.[index] && <CostGlyph kind={glyphs[index]} />}
              <h3>{itemTitle}</h3>
              <p>{itemText}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The theme and, for a concept image, «Ілюстрація» — the page itself already is the direction */
function editorialCells(editorial: DirectionPageConfig['editorial']): SheetCell[] {
  const cells: SheetCell[] = [{ tone: 'main', label: 'Тема', value: editorial.eyebrow }];
  if (editorial.image.startsWith('/media/concepts/')) cells.push({ label: 'Зображення', value: 'Ілюстрація' });
  return cells;
}

export function DirectionEditorial({
  directionId,
  editorial,
  className,
}: {
  directionId: DirectionPageConfig['id'];
  editorial: DirectionPageConfig['editorial'];
  className?: string;
}) {
  const layout = mediaFirstEditorialDirections.has(directionId) ? 'media-first' : 'copy-first';

  // «Вузол напряму»: the same block as a three-step tour of one node, where the page gives one
  if (editorial.node) {
    return (
      <DirectionNode
        eyebrow={editorial.eyebrow}
        title={editorial.title}
        titleId={`${directionId}-node-title`}
        text={editorial.text}
        image={editorial.image}
        imageAlt={editorial.imageAlt}
        node={editorial.node}
        layout={layout}
        className={className}
      />
    );
  }

  return (
    <section className={classNames('page-section direction-editorial-section', className)}>
      <div className="shell direction-editorial-grid" data-layout={layout}>
        <div className="direction-editorial-copy">
          <p className="eyebrow"><span /> {editorial.eyebrow}</p>
          <h2>{editorial.title}</h2>
          <p>{editorial.text}</p>
          {editorial.points && (
            <ol className="direction-editorial-points">
              {editorial.points.map(([number, title, text]) => (
                <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>
              ))}
            </ol>
          )}
        </div>
        {/* The site's «Креслення» sheet: its title block names the theme and says «Ілюстрація» for the concept images
            (the label once sat on the picture) */}
        <DrawingSheet className="direction-editorial-media" cells={editorialCells(editorial)}>
          <ResponsiveImage
            src={editorial.image}
            alt={editorial.imageAlt}
            sizes="(max-width: 760px) calc(100vw - 32px), 64vw"
          />
        </DrawingSheet>
      </div>
    </section>
  );
}

export function DirectionFaq({
  title,
  items: sourceItems,
  collapsible = false,
}: {
  title: string;
  items: readonly DirectionFaqItem[];
  collapsible?: boolean;
}) {
  // Model-owned answers become text here, on the server, before the list and its FAQPage data use them.
  const items = sourceItems.map(([question, answer]) => [question, faqAnswerText(answer)] as const);
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
        <div className="faq-heading">
          <p className="eyebrow"><span /> Питання</p>
          <h2>{title}</h2>
          {/* The column under the title was empty: the next step for a question the list does not answer */}
          {collapsible && (
            <div className="faq-ask">
              <p>Не знайшли свого питання? Зателефонуйте або залиште запит — розберемо вашу задачу.</p>
              <div>
                <a className="faq-ask-call" href={companyContactLinks.phone}>{company.phone.display}</a>
                <a className="faq-ask-write" href="#inquiry" data-open-inquiry="">Залишити запит <span aria-hidden="true">↓</span></a>
              </div>
            </div>
          )}
        </div>
        <div className="faq-list" data-motion={collapsible ? '' : undefined}>
          {items.map(([question, answer], index) => collapsible ? (
            <details key={question} style={{ '--i': index } as CSSProperties}>
              <summary>
                <span className="faq-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{question}</h3>
                <span className="faq-toggle" aria-hidden="true" />
              </summary>
              <p>{answer}</p>
            </details>
          ) : (
            <article key={question}><h3>{question}</h3><p>{answer}</p></article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RelatedDirections({
  id,
  compact = false,
  items,
  eyebrow = 'Суміжні роботи',
  title = 'Пов’язані напрямки',
  text,
  closing = false,
}: {
  id: DirectionPageConfig['id'];
  compact?: boolean;
  items?: readonly RelatedDirection[];
  eyebrow?: string;
  title?: string;
  text?: string;
  /** The band closes the page, after #inquiry (DirectionPageConfig.related.placement) */
  closing?: boolean;
}) {
  const related = items ?? relatedDirections[id];

  if (!related.length) return null;

  return (
    <section className={classNames('page-section related-directions-section', compact ? 'is-compact' : undefined, closing ? 'is-closing' : undefined)}>
      <div className="shell">
        <p className="eyebrow"><span /> {eyebrow}</p>
        <h2 className="related-directions-title">{title}</h2>
        {text && <p className="related-directions-text">{text}</p>}
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
  editorialArchitecture,
}: {
  config: DirectionPageConfig;
  signatureExperience?: ReactNode;
  editorialArchitecture?: ReactNode;
}) {
  const direction = getDirection(config.id);
  // /angary (owner, 03.10): the related directions — its own stages, one at a time — come after the form, not before it
  const relatedClosesPage = config.related?.placement === 'after-inquiry';
  const related = (
    <RelatedDirections
      id={config.id}
      compact={config.related?.compact}
      items={config.related?.items}
      eyebrow={config.related?.eyebrow}
      title={config.related?.title}
      text={config.related?.text}
      closing={relatedClosesPage}
    />
  );

  return (
    // data-field: the sheet's margin decor (components/sheet-field.css), with the direction's name as its inscription
    // (/angary shows the decor without the inscription: its first block is the configurator's full-width stage)
    <main className={classNames('inner-page direction-page', config.pageClassName)} id="main-content" data-field="" style={{ '--field-name': `"RUBIKON BUILD · ${config.hero.breadcrumbLabel}"` } as CSSProperties}>
      {/* Arms the page's [data-motion] blocks once each is in view; with reduced motion everything shows at once */}
      <ProcessMotion root=".direction-page" />
      <DirectionHero
        path={direction.href}
        number={direction.number}
        breadcrumbLabel={config.hero.breadcrumbLabel}
        title={config.hero.title}
        accent={config.hero.accent}
        intro={config.hero.intro}
        introPhone={config.hero.introPhone}
        notePhone={config.hero.notePhone}
        heroImage={direction.heroImage}
        actions={config.hero.actions}
      />

      {signatureExperience}

      {editorialArchitecture ?? (
        <>
          {config.entry && <DirectionEntry entry={config.entry} />}
          {config.overview && (
          <section className="page-section direction-overview-section">
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
                  {/* The direction's drawing fragment fills the column under the heading (it replaced the ghost word) */}
                  {hasSectionDrawing(config.id) && <DirectionSectionDrawing id={config.id} number={direction.number} />}
                </div>
                <DirectionItemCards className="feature-list" items={config.overview.items} motion />
              </div>
            )}
          </section>
          )}

          <DirectionEditorial directionId={config.id} editorial={config.editorial} />
          <DirectionProcess {...config.process} />
          {config.cost && <DirectionCostSection {...config.cost} directionId={config.id} />}
        </>
      )}
      {config.faq && <DirectionFaq {...config.faq} />}
      {!relatedClosesPage && related}
      <ConversationSection
        kicker={config.cta.eyebrow}
        title={config.cta.title}
        lead={config.cta.lead}
        defaultDirection={direction.formLabel}
        journey={DIRECTION_JOURNEY[config.id]}
        showJourney={!config.hideJourney}
      />
      {relatedClosesPage && related}
    </main>
  );
}
