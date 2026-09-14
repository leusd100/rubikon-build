import { Breadcrumbs, SectionHeader } from '../components/SiteChrome';
import InquirySection from '../components/InquirySection';
import { DirectionFaq } from '../components/DirectionDetail';
import { company } from '../data/company';
import { deliveryModel } from '../data/deliveryModel';
import { siteRoutes } from '../data/navigation';
import { startStage } from '../lib/deliveryModel';
import {
  budgetGroups,
  capabilityLayers,
  deliveryFaq,
  designThread,
  documentGroups,
  entryPoints,
  formatDetails,
  responsibilityByFormat,
  responsibilityNotes,
  stageAnchor,
  stageCards,
  startInputs,
  type PerFormatRow,
} from '../lib/deliveryModelPresentation';
import { absoluteUrl, brandedTitle, createPageMetadata } from '../lib/seo';
import './delivery.css';

// /yak-pratsyuiemo — the Delivery Model shown to a client: formats, entry points, the eight
// stages, who does the work, responsibility, changes, documents and what drives budget and time.
// Server-rendered and complete without JavaScript: every business fact comes from deliveryModel
// through lib/deliveryModelPresentation; this file only composes. The interactive route map is
// the next step, built on top of this markup.

const PAGE_TITLE = 'Як працює RUBIKON BUILD';
const DESCRIPTION = 'Три формати участі, вісім етапів від запиту до здачі, хто за що відповідає, як погоджуємо зміни й від чого залежать бюджет і строки.';

export const metadata = createPageMetadata({
  path: siteRoutes.process,
  title: brandedTitle('Як ми працюємо: формати, етапи, відповідальність'),
  description: DESCRIPTION,
  socialTitle: PAGE_TITLE,
  image: '/media/about-industrial-concept.jpg',
  imageAlt: `${company.name} — модель реалізації від запиту до здачі`,
});

const CONTENTS = [
  ['formaty', 'Формати участі'],
  ['shcho-vzhe-ye', 'Що у вас уже є'],
  ['etapy', 'Вісім етапів'],
  ['proiektuvannia', 'Проєктування'],
  ['khto-vykonuie', 'Хто виконує'],
  ['vidpovidalnist', 'Відповідальність'],
  ['zminy', 'Зміни'],
  ['dokumenty', 'Документи'],
  ['biudzhet', 'Бюджет і строки'],
] as const;

function PerFormatText({ rows }: Readonly<{ rows: readonly PerFormatRow[] }>) {
  if (rows.length === 1 && rows[0]?.formats.length === 0) return <p>{rows[0].text}</p>;
  return (
    <ul className="delivery-per-format">
      {rows.map((row) => (
        <li key={row.text}>
          <span className="delivery-format-tags">{row.formats.map((label) => <i key={label}>{label}</i>)}</span>
          {row.text}
        </li>
      ))}
    </ul>
  );
}

export default function DeliveryModelPage() {
  const { statements, changePolicy } = deliveryModel;
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
    <main className="inner-page delivery-page" id="main-content">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageData) }} />
      <section className="subhero delivery-subhero">
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div className="subhero-copy">
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Як працюємо', href: siteRoutes.process }]} />
            <p className="eyebrow light"><span /> Модель реалізації</p>
            <h1>
              <span className="subhero-title-line">Як працює</span>
              <span className="subhero-title-line"><em>RUBIKON BUILD</em></span>
            </h1>
          </div>
          <div className="subhero-side">
            <p>Від першого звернення до виконання й здачі — з чіткими форматами участі, межами відповідальності та зрозумілим маршрутом.</p>
            <div className="delivery-hero-actions">
              <a className="button button-primary" href="#inquiry">Обговорити задачу <span aria-hidden="true">↗</span></a>
              <a className="text-link" href="#etapy">Переглянути етапи <span aria-hidden="true">↓</span></a>
            </div>
          </div>
        </div>
      </section>

      <nav className="delivery-contents" aria-label="Зміст сторінки">
        <div className="shell">
          <ol>
            {CONTENTS.map(([id, label], index) => (
              <li key={id}><a href={`#${id}`}><span>{String(index + 1).padStart(2, '0')}</span>{label}</a></li>
            ))}
          </ol>
        </div>
      </nav>

      <section className="page-section delivery-formats" id="formaty">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Формати участі"
            title="Три моделі відповідальності"
            supporting="Формат визначає, хто координує об’єкт, хто відповідає за стики між пакетами робіт і де закінчуються межі RUBIKON."
          />
          <div className="delivery-format-grid">
            {formatDetails().map((format) => (
              <article className="delivery-format" id={format.anchor} key={format.id} aria-labelledby={`${format.anchor}-title`}>
                <span className="delivery-index">{format.number}</span>
                <h3 id={`${format.anchor}-title`}>{format.title}</h3>
                <p className="delivery-format-summary">{format.text}</p>
                <dl>
                  <div><dt>Координує об’єкт</dt><dd>{format.coordination}</dd></div>
                  <div><dt>Стики</dt><dd>{format.interfaces}</dd></div>
                </dl>
                <a className="delivery-more" href={`#vidpovidalnist-${format.anchor}`}>Хто за що відповідає <span aria-hidden="true">↓</span></a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section delivery-entry" id="shcho-vzhe-ye">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Точка входу"
            title="Що у вас уже є"
            supporting="Не обов’язково починати з нуля — маршрут залежить від того, що вже підготовлено. Це не формат участі, а етап, з якого почнемо."
          />
          <ol className="delivery-entry-list">
            {entryPoints().map((entry) => {
              const stage = startStage(entry.id);
              return (
                <li key={entry.id}>
                  <b>{entry.label}</b>
                  <a href={`#${stageAnchor(stage.id)}`}>Старт: {stage.number} {stage.title}</a>
                  {entry.startNote && <p>{entry.startNote}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-stages-section" id="etapy">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Вісім етапів"
            title="Маршрут від запиту до здачі"
            supporting="Кожен етап закінчується конкретним результатом і умовою переходу далі. Деталі — під кожним етапом."
            inverse
          />
          <ol className="delivery-stages">
            {stageCards().map((stage) => (
              <li className="delivery-stage" id={stage.anchor} key={stage.id}>
                <h3><span className="delivery-stage-number">{stage.number}</span>{' '}{stage.title}</h3>
                <div className="delivery-stage-body">
                  <p className="delivery-stage-result"><b>Результат:</b> {stage.result}</p>
                  {(stage.designThread || stage.ledByGeneralContractorIn.length > 0) && (
                    <ul className="delivery-tags">
                      {stage.designThread && <li>Нитка проєктування</li>}
                      {stage.ledByGeneralContractorIn.map((label) => <li key={label}>{label}: етап веде генпідрядник</li>)}
                    </ul>
                  )}
                  <details className="delivery-stage-details">
                    <summary>Що відбувається на етапі</summary>
                    <div className="delivery-stage-grid">
                      <div className="delivery-stage-wide"><h4>Що відбувається</h4><p>{stage.what}</p></div>
                      <div><h4>Що робить RUBIKON</h4><PerFormatText rows={stage.rubikon} /></div>
                      <div><h4>Що потрібно від замовника</h4><PerFormatText rows={stage.client} /></div>
                      <div><h4>Хто може бути залучений</h4><PerFormatText rows={stage.involved} /></div>
                      <div><h4>Перехід далі, коли…</h4><p>{stage.gate}</p></div>
                      <div className="delivery-stage-wide">
                        <h4>Документи</h4>
                        <ul className="delivery-docs">
                          {stage.documents.map((document) => (
                            <li key={document.label}>{document.label} <span className="delivery-basis">{document.tags.join(' · ')}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div className="delivery-stage-wide delivery-why"><h4>Чому це важливо</h4><p>{stage.why}</p></div>
                    </div>
                  </details>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-section delivery-thread" id="proiektuvannia">
        <div className="shell delivery-split">
          <div>
            <p className="eyebrow"><span /> Проєктування</p>
            <h2>Нитка, а не одна точка</h2>
            <p className="delivery-lead">{designThread().statement}</p>
          </div>
          <ol className="delivery-thread-steps">
            {designThread().stages.map((stage) => (
              <li key={stage.anchor}><a href={`#${stage.anchor}`}><span>{stage.number}</span> {stage.title}</a><p>{stage.documents.join(' · ')}</p></li>
            ))}
            <li><b>Під час реалізації</b><p>{designThread().change}</p></li>
          </ol>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-who" id="khto-vykonuie">
        <div className="shell">
          <SectionHeader className="page-heading" eyebrow="Хто виконує" title="Власне ядро, гнучкі пакети й партнери" supporting={statements.team} inverse />
          <div className="delivery-layers">
            {capabilityLayers().map((layer) => (
              <article className={`delivery-layer delivery-layer-${layer.id}`} key={layer.id}>
                <h3>{layer.title}</h3>
                {layer.note && <p className="delivery-layer-note">{layer.note}</p>}
                <ul>
                  {layer.items.map((item) => (
                    <li key={item.id}>{item.href ? <a href={item.href}>{item.text}</a> : item.text}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <blockquote className="delivery-principle"><p>{statements.principle}</p></blockquote>
          <p className="delivery-boundary">{statements.boundary}</p>
        </div>
      </section>

      <section className="page-section delivery-responsibility" id="vidpovidalnist">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Відповідальність"
            title="Хто за що відповідає"
            supporting="Та сама робота може належати різним учасникам — залежно від формату участі. Дозвільні питання, нагляд і виконавчу документацію визначає договір."
          />
          <div className="delivery-responsibility-grid">
            {responsibilityByFormat().map((format) => (
              <article className="delivery-responsibility-format" id={format.anchor} key={format.id}>
                <h3>{format.label}</h3>
                <p className="delivery-responsibility-lead">{format.coordination} {format.interfaces}</p>
                {format.groups.map((group) => (
                  <div className={`delivery-party delivery-party-${group.holder}`} key={group.holder}>
                    <h4>{group.title}</h4>
                    <ul>{group.activities.map((activity) => <li key={activity}>{activity}</li>)}</ul>
                  </div>
                ))}
              </article>
            ))}
          </div>
          <div className="delivery-notes">
            <h3>Примітки</h3>
            <ul>{responsibilityNotes().map((note) => <li key={note.activity}><b>{note.activity}.</b> {note.note}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-changes" id="zminy">
        <div className="shell delivery-split">
          <div>
            <p className="eyebrow light"><span /> Зміни під час проєкту</p>
            <h2>Зміни погоджуємо до виконання</h2>
            <p className="delivery-lead">{changePolicy.principle}</p>
          </div>
          <div>
            <ol className="delivery-change-steps">
              {changePolicy.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, '0')}</span><p>{step}</p></li>)}
            </ol>
            <div className="delivery-not-promised">
              <h3>Чого не обіцяємо</h3>
              <ul>{changePolicy.notPromised.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section delivery-documents" id="dokumenty">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Документи"
            title="Які документи можуть виникнути"
            supporting="Не кожен документ потрібен на кожному об’єкті: позначка показує, від чого він залежить."
          />
          <div className="delivery-document-groups">
            {documentGroups().map((group) => (
              <article key={group.basis}>
                <h3>{group.title}</h3>
                <ul>{group.documents.map((document) => <li key={`${document.stage}-${document.label}`}>{document.label}<span>{document.stage}</span></li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-budget" id="biudzhet">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Бюджет і строки"
            title="Від чого залежать бюджет і строки"
            supporting="Вартість і строки визначаються не лише площею або тоннажем. Цін і усереднених строків не називаємо: їх фіксують кошторис і графік на етапі «Склад робіт і бюджет»."
            inverse
          />
          <div className="delivery-budget-groups">
            {budgetGroups().map((group) => (
              <article key={group.id}><h3>{group.title}</h3><ul>{group.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul></article>
            ))}
          </div>
          <div className="delivery-inputs">
            <h3>Що потрібно на старті</h3>
            <ul>{startInputs().map((input) => <li key={input}>{input}</li>)}</ul>
          </div>
        </div>
      </section>

      <section className="page-section delivery-experience" id="dosvid">
        <div className="shell delivery-experience-layout">
          <p className="eyebrow"><span /> Досвід</p>
          <p className="delivery-experience-statement">{statements.experience}</p>
          <a className="section-link" href={siteRoutes.about}>Більше про компанію <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <DirectionFaq title="Питання про модель реалізації" items={deliveryFaq()} collapsible />
      <InquirySection eyebrow="Почнемо з розмови" title="Обговоримо вашу задачу" text={statements.firstContact} />
    </main>
  );
}
