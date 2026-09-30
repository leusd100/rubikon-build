import { DraftingCompass } from 'lucide-react';
import { Breadcrumbs, HeroCallLink } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { DirectionFaq } from '../components/DirectionDetail';
import { ProcessMotion } from '../components/process/ProcessMotion';
import { ScopeDiagram } from '../components/process/ScopeDiagram';
import { StartGlyph } from '../components/process/StartGlyph';
import { company } from '../data/company';
import { deliveryModel } from '../data/deliveryModel';
import { siteRoutes } from '../data/navigation';
import {
  costFactors,
  deliveryFaq,
  participationChoices,
  processSteps,
  responsibilityMap,
} from '../lib/deliveryModelPresentation';
import { webpSrcSet } from '../lib/responsiveImages';
import { absoluteUrl, brandedTitle, createPageMetadata } from '../lib/seo';
import type { CSSProperties } from 'react';
import './delivery.css';

// /yak-pratsyuiemo v2 — what happens with the client's task, in seven zones: where to start, the four steps, how much
// RUBIKON can take on, who answers for what, what drives cost and time, a short FAQ and the conversation. Every business
// fact still comes from deliveryModel through lib/deliveryModelPresentation (processSteps, participationChoices,
// responsibilityMap); the full eight-stage model, matrix and document route stay in the repository and its tests.
// Imagery here is illustrative (labelled «Ілюстрація») and never shown as a RUBIKON project.

const PAGE_TITLE = 'Як працює RUBIKON BUILD';
const DESCRIPTION = 'З чим можна звернутися, що буде після звернення, який обсяг бере на себе RUBIKON, хто за що відповідає і коли можна говорити про кошторис і строки.';

export const metadata = createPageMetadata({
  path: siteRoutes.process,
  title: brandedTitle('Як ми працюємо: від задачі до плану робіт'),
  description: DESCRIPTION,
  socialTitle: PAGE_TITLE,
  image: '/media/about-industrial-concept.jpg',
  imageAlt: `${company.name} — від задачі до плану робіт`,
});

const HERO_IMAGE = '/media/concepts/about-shared-approach-v2.jpg';

const STARTS = [
  {
    kind: 'idea',
    title: 'Є тільки задум',
    text: 'Коротко опишіть, що потрібно побудувати або які роботи виконати. Допоможемо зрозуміти, яких вихідних даних бракує.',
  },
  {
    kind: 'drawing',
    title: 'Є креслення або проєкт',
    text: 'Переглянемо документацію й визначимо, чи її достатньо, щоб сформувати обсяг робіт і кошторис.',
  },
  {
    kind: 'scope',
    title: 'Є конкретний обсяг робіт',
    text: 'Наприклад, фундамент, монтаж каркаса чи покрівля — почнемо предметну розмову саме з цього етапу.',
  },
] as const;

const TERMS = [
  { title: 'Кошторис', text: 'Предметний розрахунок готуємо, коли визначено склад робіт і вихідних даних достатньо.' },
  { title: 'Строки', text: 'Залежать від обсягу, проєкту, умов майданчика, матеріалів та організації виконання.' },
  { title: 'Зміни', text: deliveryModel.changePolicy.principle },
] as const;

export default function DeliveryModelPage() {
  const { statements } = deliveryModel;
  const steps = processSteps();
  const choices = participationChoices();
  const map = responsibilityMap();
  const pageData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl(siteRoutes.process)}#webpage`,
    url: absoluteUrl(siteRoutes.process),
    name: PAGE_TITLE,
    description: DESCRIPTION,
    inLanguage: 'uk-UA',
    isPartOf: { '@id': `${company.siteUrl}/#website` },
    about: { '@id': `${company.siteUrl}/#organization` },
  };

  return (
    <main className="inner-page process-page" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageData) }} />
      <ProcessMotion />

      {/* 1 · Hero */}
      <section className="proc-hero">
        <div className="proc-hero-media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated WebP variants (as ResponsiveImage), but eager: this is the LCP image */}
          <img src={HERO_IMAGE} srcSet={webpSrcSet(HERO_IMAGE)} sizes="100vw" alt="" width={1440} height={1800} fetchPriority="high" decoding="async" />
        </div>
        <div className="proc-hero-shade" aria-hidden="true" />
        {/* Drawing lines over the illustration: set out once on load, then still */}
        <svg className="proc-hero-trace" data-motion viewBox="0 0 1440 900" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
          <path className="ht-grid" d="M900 0 V900 M1080 0 V900 M1260 0 V900 M720 300 H1440 M720 600 H1440" pathLength={1} />
          <path className="ht-trace" d="M760 820 L1180 250 L1440 120" pathLength={1} />
          <path className="ht-trace ht-trace-2" d="M1030 900 L1310 470" pathLength={1} />
          <path className="ht-dim" d="M1180 250 L1180 170 M1440 120 L1440 40 M1180 190 H1440" pathLength={1} />
          <circle className="ht-node" cx="1180" cy="250" r="5" />
        </svg>
        <div className="shell proc-hero-layout">
          <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Як працюємо', href: siteRoutes.process }]} />
          <p className="eyebrow light"><span /> Як працюємо</p>
          <h1>Від задачі — до <em>зрозумілого плану робіт</em></h1>
          <p className="proc-hero-lead">
            Можна прийти з ідеєю, готовим проєктом або конкретним переліком робіт. Розберемо задачу, визначимо наш обсяг і,
            коли даних достатньо, підготуємо кошторис.
          </p>
          <div className="proc-hero-actions">
            <a className="button button-primary" href="#inquiry">Обговорити задачу <span aria-hidden="true">↗</span></a>
            <HeroCallLink />
          </div>
        </div>
        <span className="proc-provenance">Ілюстрація</span>
      </section>

      {/* 2 · Where to start */}
      <section className="page-section proc-start" aria-labelledby="proc-start-title">
        <div className="shell proc-start-layout">
          <div className="proc-start-head">
            <p className="eyebrow"><span /> Перше звернення</p>
            <h2 id="proc-start-title">З чого можна почати</h2>
            <p>Готовий проєкт для першого звернення не потрібен. Почнемо з того, що у вас уже є.</p>
          </div>
          <div className="proc-start-flow" data-motion>
            <ul className="proc-start-list">
              {STARTS.map(({ kind, title, text }, index) => (
                <li key={title} style={{ '--i': index } as CSSProperties}>
                  <StartGlyph kind={kind} />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            {/* Three starting states, one route: the rows join into the four steps below */}
            <a className="proc-start-merge" href="#etapy">
              <span>Далі — один зрозумілий процес</span> <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>

      {/* 3 · Signature process */}
      <section className="page-section proc-route" id="etapy" aria-labelledby="proc-route-title">
        <div className="proc-route-lines" aria-hidden="true" />
        <div className="shell">
          <div className="proc-section-head proc-section-head-inverse">
            <p className="eyebrow light"><span /> Що буде після звернення</p>
            <h2 id="proc-route-title">Від задачі до будівництва</h2>
            <p>Чотири кроки. Кожен закінчується конкретним результатом, з яким можна йти далі.</p>
          </div>
          <ol className="proc-steps" data-motion>
            {steps.map((step, index) => (
              <li key={step.number} style={{ '--i': index } as CSSProperties}>
                <span className="proc-step-node" aria-hidden="true">{step.number}</span>
                <h3><span className="visually-hidden">Крок {step.number}. </span>{step.title}</h3>
                <p>{step.text}</p>
                <p className="proc-step-result"><b>На виході:</b> {step.result}</p>
              </li>
            ))}
          </ol>
          <aside className="proc-design-note" aria-label="Проєкт">
            <DraftingCompass aria-hidden="true" />
            <p><b>Проєкт.</b> {statements.design}</p>
          </aside>
        </div>
      </section>

      {/* 4 · How much RUBIKON can take on */}
      <section className="page-section proc-scope" id="obsiah" aria-labelledby="proc-scope-title">
        <div className="shell">
          <div className="proc-section-head">
            <p className="eyebrow"><span /> Наш обсяг</p>
            <h2 id="proc-scope-title">Від окремого етапу до комплексного обсягу</h2>
            <p>Перед початком погоджуємо склад робіт, взаємодію з іншими виконавцями та відповідальність за результат.</p>
          </div>
          <ul className="proc-scope-grid">
            {choices.map((choice) => (
              // Focusable so the keyboard gets the same emphasis as hover; the text carries the meaning.
              <li key={choice.id} data-motion tabIndex={0} aria-labelledby={`proc-scope-${choice.id}`}>
                <ScopeDiagram format={choice.id} />
                <h3 id={`proc-scope-${choice.id}`}>{choice.title}</h3>
                <p>{choice.text}</p>
                <p className="proc-scope-coordination">{choice.coordination}</p>
              </li>
            ))}
          </ul>
          <ul className="proc-scope-legend" aria-label="Позначення на схемах">
            <li className="is-scope"><i aria-hidden="true" /> Обсяг RUBIKON</li>
            <li><i aria-hidden="true" /> Роботи інших учасників</li>
            <li className="is-context"><i aria-hidden="true" /> Хто координує об’єкт</li>
          </ul>
        </div>
      </section>

      {/* 5 · Signature responsibility map */}
      <section className="page-section proc-responsibility" id="vidpovidalnist" aria-labelledby="proc-responsibility-title">
        <div className="shell">
          <div className="proc-section-head">
            <p className="eyebrow"><span /> Хто за що відповідає</p>
            <h2 id="proc-responsibility-title">Відповідальність без дрібного шрифту</h2>
          </div>
          <div className="proc-resp-figure" data-motion>
          <p className="proc-principle">{map.principle}</p>
          <ul className="proc-map">
            {map.areas.map((area, index) => (
              <li className={`proc-area proc-area-${area.id}`} key={area.id} style={{ '--i': index } as CSSProperties}>
                <h3>{area.title}</h3>
                <p className="proc-area-lead">{area.lead}</p>
                <ul>{area.items.map((item) => <li key={item.text}>{item.text}</li>)}</ul>
              </li>
            ))}
          </ul>
          </div>
          <p className="proc-map-note">{map.boundary} {map.materials}</p>
        </div>
      </section>

      {/* 6 · Cost, time, changes */}
      <section className="page-section proc-terms" id="koshtorys" aria-labelledby="proc-terms-title">
        <div className="proc-terms-bg" aria-hidden="true"><div className="proc-terms-image" data-parallax="28" /></div>
        <div className="shell">
          <div className="proc-section-head">
            <p className="eyebrow"><span /> Кошторис і строки</p>
            <h2 id="proc-terms-title">Що визначає вартість і хід робіт</h2>
          </div>
          <ul className="proc-terms-grid">
            {TERMS.map((term) => (
              <li key={term.title}>
                <h3>{term.title}</h3>
                <p>{term.text}</p>
              </li>
            ))}
          </ul>
          <div className="proc-factors">
            <p className="proc-factors-title">Найчастіше впливають</p>
            <ul>
              {costFactors().map((factor) => (
                <li key={factor.title}>
                  <b>{factor.title}</b>
                  {factor.detail && <span>{factor.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
          <p className="proc-documents">
            Які документи знадобляться, залежить від об’єкта й формату робіт. На старті визначимо, що вже є і чого бракує.
          </p>
        </div>
      </section>

      <DirectionFaq title="Що ще часто запитують" items={deliveryFaq()} collapsible />

      {/* 7 · Conversation — the four steps are shown above, so the block does not repeat them */}
      <ConversationSection
        title="Є задача — почнемо з неї"
        lead="Не потрібно спочатку обирати формат співпраці чи збирати повний пакет документів. Розкажіть, що потрібно зробити, — визначимо наступний крок."
        showJourney={false}
      />
    </main>
  );
}
