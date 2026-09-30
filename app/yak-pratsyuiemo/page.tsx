import { DraftingCompass } from 'lucide-react';
import { Breadcrumbs, HeroCallLink } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { DirectionFaq } from '../components/DirectionDetail';
import { FormatPrefillLink } from '../components/process/FormatPrefillLink';
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
  responsibilityByFormat,
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
    title: 'Є ідея об’єкта',
    text: 'Опишіть, що плануєте побудувати. Підкажемо, які дані варто підготувати для наступного кроку.',
  },
  {
    kind: 'drawing',
    title: 'Є креслення або проєкт',
    text: 'Переглянемо креслення, визначимо можливий обсяг наших робіт і скажемо, чи вистачає даних для кошторису.',
  },
  {
    kind: 'scope',
    title: 'Потрібен окремий етап робіт',
    text: 'Наприклад, фундамент, металевий каркас або покрівля. Обговоримо саме цей етап і його межі.',
  },
] as const;

const ZONES = [
  { id: 'rubikon', title: 'RUBIKON', lead: 'Роботи, зазначені в нашому договорі, та їхній результат.' },
  { id: 'client', title: 'Замовник', lead: 'Що забезпечує замовник.' },
  { id: 'specialists', title: 'Профільні спеціалісти', lead: 'Окремі спеціалізовані роботи. Хто їх залучає й координує, фіксуємо в договорі.' },
] as const;

/** After the factors: the order in which they turn into numbers, a schedule and — if needed — an agreed change. */
const TERMS = [
  { title: 'Рахуємо кошторис', text: 'Підготуємо кошторис, коли погодимо перелік робіт і матимемо дані для розрахунку.' },
  { title: 'Плануємо строки', text: 'На графік впливають обсяг робіт, готовність проєкту й майданчика, постачання матеріалів і роботи інших підрядників.' },
  { title: 'Погоджуємо зміни', text: deliveryModel.changePolicy.principle },
] as const;

export default function DeliveryModelPage() {
  const { statements } = deliveryModel;
  const steps = processSteps();
  const choices = participationChoices();
  const map = responsibilityMap();
  const resp = responsibilityByFormat();
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
            Розкажіть про задум, покажіть готовий проєкт або назвіть роботи, які потрібно виконати. Ми уточнимо задачу,
            погодимо свій обсяг і скажемо, які дані потрібні для кошторису.
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
            <p>Для першої розмови достатньо того, що ви знаєте про об’єкт зараз.</p>
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
            <p>Після кожного кроку зрозуміло, що вже вирішено і що потрібно для наступного.</p>
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
          {/* Belongs to step 02 (checking the project): aligned under it on the horizontal route, named on the vertical one */}
          <aside className="proc-design-note" aria-labelledby="proc-design-note-title">
            <DraftingCompass aria-hidden="true" />
            <div>
              <p className="proc-design-note-title" id="proc-design-note-title"><span>До кроку 02</span> Хто готує проєкт</p>
              <p>{statements.design}</p>
            </div>
          </aside>
        </div>
      </section>

      {/* 4 · How much RUBIKON can take on */}
      <section className="page-section proc-scope" id="obsiah" aria-labelledby="proc-scope-title">
        <div className="shell">
          <div className="proc-section-head">
            <p className="eyebrow"><span /> Наш обсяг</p>
            <h2 id="proc-scope-title">Який обсяг робіт можемо взяти на себе</h2>
            <p>До старту визначаємо наші роботи, хто координує інших виконавців і за який результат відповідаємо.</p>
          </div>
          <ul className="proc-scope-grid">
            {choices.map((choice) => (
              <li key={choice.id} data-motion>
                <ScopeDiagram format={choice.id} />
                <div className="proc-scope-title">
                  <p className="proc-scope-kicker">{choice.title}</p>
                  <h3 id={`proc-scope-${choice.id}`}>{choice.headline}</h3>
                </div>
                {/* What actually tells the formats apart: the other party of the contract and who coordinates the object */}
                <dl className="proc-scope-terms">
                  <div>
                    <dt>Договір</dt>
                    <dd className="proc-contract">
                      <span className="proc-party">{choice.contractWith}</span>
                      <span className="proc-contract-link" aria-hidden="true" />
                      <span className="visually-hidden"> і </span>
                      <span className="proc-party is-rubikon">RUBIKON</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Координує об’єкт</dt>
                    <dd className={choice.rubikonCoordinates ? 'is-rubikon' : undefined}>{choice.coordinator}</dd>
                  </div>
                </dl>
                <p>{choice.text}</p>
                <FormatPrefillLink label={choice.title} />
              </li>
            ))}
          </ul>
          <p id="format-prefill-status" className="visually-hidden" aria-live="polite" />
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
            <p>Оберіть формат участі — схема покаже, що виконує RUBIKON, що забезпечує інша сторона договору і хто веде спеціалізовані роботи.</p>
          </div>
          {/* Format switcher: plain radios; CSS (:has) shows the chosen format, so it works without JavaScript */}
          <fieldset className="proc-resp-switch">
            <legend>Формат участі</legend>
            <div>
              {resp.formats.map((format) => (
                <label key={format.id}>
                  <input type="radio" name="resp-format" value={format.id} defaultChecked={format.id === 'comprehensive'} />
                  <span>{format.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="proc-resp-figure" data-motion>
            {resp.formats.map((format) => <p className="proc-principle" data-format={format.id} key={format.id}>{format.principle}</p>)}
            <ul className="proc-map">
              {ZONES.map((zone, index) => (
                <li className={`proc-area proc-area-${zone.id}`} key={zone.id} style={{ '--i': index } as CSSProperties}>
                  <h3>
                    {zone.id === 'client'
                      ? resp.formats.map((format) => <span data-format={format.id} key={format.id}>{format.clientTitle}</span>)
                      : zone.title}
                  </h3>
                  <p className="proc-area-lead">
                    {zone.id === 'client'
                      ? resp.formats.map((format) => <span data-format={format.id} key={format.id}>Що забезпечує {format.clientTitle.toLowerCase()}.</span>)
                      : zone.lead}
                  </p>
                  <ul>
                    {resp.items.filter((item) => item.zones[zone.id].length > 0).map((item) => (
                      <li key={item.text} data-formats={item.zones[zone.id].join(' ')}>{item.text}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
          {resp.formats.filter((format) => format.outOfScope.length > 0).map((format) => (
            <p className="proc-out-of-scope" data-format={format.id} key={format.id}>
              <b>Поза обсягом RUBIKON у цьому форматі:</b> {format.outOfScope.join('; ').toLowerCase()}.
            </p>
          ))}
          <p className="proc-map-note">{map.boundary}</p>
        </div>
      </section>

      {/* 6 · Cost, time, changes */}
      <section className="page-section proc-terms" id="koshtorys" aria-labelledby="proc-terms-title">
        <div className="proc-terms-bg" aria-hidden="true"><div className="proc-terms-image" data-parallax="28" /></div>
        <div className="shell">
          <div className="proc-section-head">
            <p className="eyebrow"><span /> Кошторис і строки</p>
            <h2 id="proc-terms-title">Від чого залежать кошторис і строки</h2>
          </div>
          <div className="proc-factors">
            <p className="proc-factors-title">Що враховуємо в розрахунку</p>
            <ul>
              {costFactors().map((factor) => (
                <li key={factor.title}>
                  <b>{factor.title}</b>
                  {factor.detail && <span>{factor.detail}</span>}
                </li>
              ))}
            </ul>
          </div>
          <p className="proc-factors-title proc-terms-flow-title">Як із цього виходять кошторис і графік</p>
          <ol className="proc-terms-grid" data-motion>
            {TERMS.map((term, index) => (
              <li key={term.title} style={{ '--i': index } as CSSProperties}>
                <span className="proc-terms-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <h3>{term.title}</h3>
                <p>{term.text}</p>
              </li>
            ))}
          </ol>
          <p className="proc-documents">
            На першій розмові скажемо, які документи вже можна використати і що потрібно підготувати додатково.
          </p>
        </div>
      </section>

      <DirectionFaq title="Що ще часто запитують" items={deliveryFaq()} collapsible />

      {/* 7 · Conversation — the four steps are shown above, so the block does not repeat them */}
      <ConversationSection
        title="Є задача — почнемо з неї"
        lead="Коротко опишіть задачу. Ми уточнимо, що вже готово, і підкажемо найближчий крок — розмову, перегляд проєкту чи огляд майданчика."
        showJourney={false}
      />
    </main>
  );
}
