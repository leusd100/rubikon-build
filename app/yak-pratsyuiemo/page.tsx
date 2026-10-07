import { ChangeSheets } from '../components/process/ChangeSheets';
import { CostFactorsFigure } from '../components/process/CostFactorsFigure';
import { Breadcrumbs, HeroCallButton, HeroCallLink, SectionHeader } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { DirectionFaq } from '../components/DirectionDetail';
import { FormatSwitchSync } from '../components/process/FormatSwitchSync';
import { ResponsibilityMatrix } from '../components/process/ResponsibilityMatrix';
import { ProcessMotion } from '../components/process/ProcessMotion';
import { FormatsScope, type FormatTerms } from '../components/directions/FormatsScope';
import { ProcessDrawing } from '../components/directions/ProcessDrawing';
import { StartGlyph } from '../components/process/StartGlyph';
import { company } from '../data/company';
import { deliveryModel } from '../data/deliveryModel';
import { processHeroImage } from '../data/processHeroImage';
import { siteRoutes } from '../data/navigation';
import {
  changeSteps,
  costFactors,
  deliveryFaq,
  formatCards,
  participationChoices,
  processSteps,
  responsibilityByFormat,
  responsibilityMap,
} from '../lib/deliveryModelPresentation';
import { absoluteUrl, brandedTitle, createPageMetadata } from '../lib/seo';
import type { CSSProperties } from 'react';
import type { DeliveryFormatId } from '../types/deliveryModel';
import type { ProcessSplit } from '../types/directionPage';
import './delivery.css';
import '../components/process/resp-matrix.css';
import '../components/directions/formats-scope.css';
import '../components/directions/process-split.css';

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


/** The change loop's way back (step 2 of changePolicy: the impact on works, cost and time). */
const CHANGE_BACK = 'Вплив на кошторис і строки — до виконання';

/** After the factors: the estimate and the schedule they turn into (ChangeSheets' captions) and the change policy. */
const TERMS = [
  { title: 'Рахуємо кошторис', text: 'Підготуємо кошторис, коли погодимо перелік робіт і матимемо дані для розрахунку.' },
  { title: 'Плануємо строки', text: 'На графік впливають обсяг робіт, готовність проєкту й майданчика, постачання матеріалів і роботи інших підрядників.' },
  { title: 'Погоджуємо зміни', text: deliveryModel.changePolicy.principle },
] as const;

/**
 * «Від задачі до будівництва» as «Ви · Ми»: what the client does at each of processSteps(), what they have after it (a
 * short caption; the model's full result is read to screen readers) and its small drawing. Wording as on the /angary
 * route. Who prepares the project is said once, under the route, in the Delivery Model's own words (statements.design).
 */
const ROUTE_SIDES: readonly ProcessSplit[] = [
  { you: 'Розповідаєте, що потрібно, де об’єкт і що вже підготовлено.', result: 'Задача й список даних', drawing: 'checklist' },
  { you: 'Надаєте креслення або параметри об’єкта.', result: 'Основа для пропозиції', drawing: 'review' },
  { you: 'Погоджуєте пропозицію й підписуєте договір.', result: 'Пропозиція, кошторис і договір', drawing: 'contract' },
  { you: 'Приймаєте роботи й підписуєте акти.', result: 'Прийняті роботи й акти', drawing: 'handover' },
];

export default function DeliveryModelPage() {
  const { statements } = deliveryModel;
  const steps = processSteps();
  // What tells the formats apart, for the scope drawing: the other party of the contract and who coordinates
  const formatTerms = Object.fromEntries(participationChoices().map(({ id, contractWith, coordinator, rubikonCoordinates }) => [id, { contractWith, coordinator, rubikonCoordinates }])) as Record<DeliveryFormatId, FormatTerms>;
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
    <main className="inner-page process-page" id="main-content" data-field="" style={{ '--field-name': '"RUBIKON BUILD · Як працюємо"' } as CSSProperties}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageData) }} />
      <ProcessMotion />
      <FormatSwitchSync />

      {/* 1 · Hero */}
      <section className="proc-hero">
        <div className="proc-hero-media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element -- pre-generated WebP variants up to 1536w (as the direction heroes), eager: this is the LCP image */}
          <img
            src={processHeroImage.fallbackSrc}
            srcSet={processHeroImage.srcSet}
            sizes="100vw"
            alt=""
            width={processHeroImage.width}
            height={processHeroImage.height}
            fetchPriority="high"
            decoding="async"
          />
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
            <HeroCallButton />
            <a className="button button-primary" href="#inquiry">Обговорити задачу <span aria-hidden="true">↓</span></a>
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
          <SectionHeader
            inverse
            eyebrow="Що буде після звернення"
            title="Від задачі до будівництва"
            titleId="proc-route-title"
            supporting="Після кожного кроку зрозуміло, що вже вирішено і що потрібно для наступного."
          />
          {/* «Ви · Ми» (owner 06.10, as on the direction pages): over the rail what you do, under it what we do — the
              Delivery Model's step text word for word — and on it what you have after the step, drawn small. The old
              «Хто готує проєкт» note is step 02's «Ви» now; the full result sentence stays for screen readers. */}
          <p className="process-key" aria-hidden="true"><span>Ви</span><span>RUBIKON</span></p>
          <ol className="process-split proc-split" data-motion>
            {steps.map((step, index) => (
              <li key={step.number} style={{ '--i': index } as CSSProperties}>
                <h3><b>{step.number}</b>{step.title}</h3>
                <p className="ps-you"><small>Ви</small>{ROUTE_SIDES[index].you}</p>
                <div className="ps-node">
                  <ProcessDrawing kind={ROUTE_SIDES[index].drawing} />
                  {index === 0 && <span className="ps-spark" aria-hidden="true" />}
                </div>
                <p className="ps-result"><span className="sr-only">Результат: {step.result}</span><span aria-hidden="true">{ROUTE_SIDES[index].result}</span></p>
                <p className="ps-we"><small>Ми</small>{step.text}</p>
              </li>
            ))}
          </ol>
          {/* Who prepares the project — once, in the model's words: RUBIKON builds to the client's or their designer's project */}
          <p className="proc-design-line"><b>Хто готує проєкт.</b> {statements.design}</p>
        </div>
      </section>

      {/* 4 · How much RUBIKON can take on */}
      <section className="page-section proc-scope" id="obsiah" aria-labelledby="proc-scope-title">
        <div className="shell">
          <SectionHeader
            eyebrow="Наш обсяг"
            title="Який обсяг робіт можемо взяти на себе"
            titleId="proc-scope-title"
            supporting="До старту визначаємо наші роботи, хто координує інших виконавців і за який результат відповідаємо."
          />
          {/* One drawing, redrawn for the format in focus, in place of three cards (owner, 05.10: the block was
              overloaded). Its buttons and the map's switcher below are one choice of format. */}
          <FormatsScope formats={formatCards()} terms={formatTerms} mirror="resp-format" prefill />
          <p id="format-prefill-status" className="visually-hidden" aria-live="polite" />
          <ul className="proc-scope-legend" aria-label="Позначення на схемі">
            <li className="is-scope"><i aria-hidden="true" /> Обсяг RUBIKON</li>
            <li><i aria-hidden="true" /> Роботи інших учасників</li>
            <li className="is-context"><i aria-hidden="true" /> Хто координує об’єкт</li>
          </ul>
        </div>
      </section>

      {/* 5 · Signature responsibility map */}
      <section className="page-section proc-responsibility" id="vidpovidalnist" aria-labelledby="proc-responsibility-title">
        <div className="shell">
          <SectionHeader
            eyebrow="Хто за що відповідає"
            title="Відповідальність без дрібного шрифту"
            titleId="proc-responsibility-title"
            supporting="Оберіть формат — таблиця покаже, що робимо ми, що лишається на вас і що виконують профільні спеціалісти."
          />
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
          <ResponsibilityMatrix formats={resp.formats} items={resp.items} boundary={map.boundary} />
        </div>
      </section>

      {/* 6 · Cost, time, changes */}
      <section className="page-section proc-terms" id="koshtorys" aria-labelledby="proc-terms-title">
        <div className="proc-terms-bg" aria-hidden="true"><div className="proc-terms-image" /></div>
        <div className="shell">
          <SectionHeader
            eyebrow="Кошторис і строки"
            title="Від чого залежать кошторис і строки"
            titleId="proc-terms-title"
            supporting="Нижче — що враховуємо в розрахунку, як із цього виходять кошторис і графік і що буде, якщо щось зміниться."
          />
          {/* The seven factors beside one drawing of a hangar on its site, each numbered where it acts */}
          <CostFactorsFigure factors={costFactors().map((factor) => ({ key: factor.ids[0], title: factor.title, detail: factor.detail }))} />
          <p className="proc-factors-title proc-terms-flow-title">Як із цього виходять кошторис і графік</p>
          {/* The estimate and the schedule as sheets, and the change procedure acting on them (owner 07.10, variant A) */}
          <ChangeSheets
            rows={costFactors().map((factor) => factor.title)}
            estimate={TERMS[0]}
            schedule={TERMS[1]}
            principle={TERMS[2].text}
            steps={changeSteps()}
            back={CHANGE_BACK}
          />
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
