import { Breadcrumbs, GhostWord, SectionHeader } from '../components/SiteChrome';
import InquirySection from '../components/InquirySection';
import RoleIcon from '../components/RoleIcon';
import { DirectionFaq } from '../components/DirectionDetail';
import { company } from '../data/company';
import { deliveryModel } from '../data/deliveryModel';
import { siteRoutes } from '../data/navigation';
import { startStage } from '../lib/deliveryModel';
import {
  basisLegend,
  budgetGroups,
  capabilityLayers,
  deliveryFaq,
  designThread,
  documentRoute,
  entryPoints,
  formatDetails,
  formatTokens,
  responsibilityComparison,
  stageAnchor,
  stageCards,
  startInputs,
  type BasisBadge,
  type CapabilityLayer,
  type FormatToken,
  type PerFormatRow,
  type ResponsibilityActivity,
  type RouteDocument,
} from '../lib/deliveryModelPresentation';
import { absoluteUrl, brandedTitle, createPageMetadata } from '../lib/seo';
import type { CapabilityLayerId } from '../types/deliveryModel';
import './delivery.css';

// /yak-pratsyuiemo — the Delivery Model shown to a client: formats, entry points, the eight
// stages, who does the work, responsibility, changes, documents and what drives budget and time.
// Server-rendered and complete without JavaScript: every business fact comes from deliveryModel
// through lib/deliveryModelPresentation; this file only composes. It reads in layers — headings,
// numbers and results to scan, a sentence to understand, native <details> for the rest — and
// folding never removes a fact from the HTML. The interactive route map is a later step, built on
// top of this markup.

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

// Plain labels: the only numbers on this page are the formats' and the stages', which are real sequences.
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

/** Ukrainian plural for a count: 1 документ, 2–4 документи, 5+ документів. */
function plural(count: number, [one, few, many]: readonly [string, string, string]): string {
  const tail = count % 10;
  const tens = count % 100;
  if (tail === 1 && tens !== 11) return `${count} ${one}`;
  if (tail >= 2 && tail <= 4 && (tens < 12 || tens > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

/** Format tokens 01 / 02 / 03: the numbers are seen, the full names are what a screen reader reads. */
function FormatTokens({ formats }: Readonly<{ formats: readonly FormatToken[] }>) {
  return (
    <span className="delivery-tokens">
      <span className="visually-hidden">{formats.map((format) => format.label).join(', ')}: </span>
      {formats.map((format) => (
        <span className="delivery-token" aria-hidden="true" title={format.label} key={format.id}>{format.number}</span>
      ))}
    </span>
  );
}

/** A per-format text: one paragraph when every format shares it, otherwise one tokened row per wording. */
function PerFormatText({ rows }: Readonly<{ rows: readonly PerFormatRow[] }>) {
  if (rows.length === 1 && rows[0]?.formats.length === 0) return <p>{rows[0].text}</p>;
  return (
    <ul className="delivery-per-format">
      {rows.map((row) => (
        <li key={row.text}><FormatTokens formats={row.formats} /><span>{row.text}</span></li>
      ))}
    </ul>
  );
}

function BasisBadges({ badges }: Readonly<{ badges: readonly BasisBadge[] }>) {
  return (
    <span className="delivery-badges">
      {badges.map((badge) => (
        <span className={`delivery-badge delivery-badge-${badge.basis}`} key={badge.basis}>
          <span aria-hidden="true">{badge.tag}</span>
          <span className="visually-hidden">{badge.title}</span>
        </span>
      ))}
    </span>
  );
}

/** An activity of the responsibility matrix, with the number of its note when it has one. */
function Activity({ item }: Readonly<{ item: ResponsibilityActivity }>) {
  return (
    <>
      <span className="delivery-activity">{item.activity}</span>
      {item.note ? (
        <sup className="delivery-note-ref">
          <span aria-hidden="true">{item.note}</span>
          <span className="visually-hidden">, примітка {item.note}</span>
        </sup>
      ) : null}
    </>
  );
}

function DocumentList({ documents }: Readonly<{ documents: readonly RouteDocument[] }>) {
  return (
    <ul className="delivery-doc-list">
      {documents.map((document) => (
        <li key={`${document.stage.number}-${document.label}`}>
          <span className="delivery-doc-label">{document.label}</span>
          <span className="delivery-doc-meta">
            <a href={`#${document.stage.anchor}`} title={document.stage.title}>етап {document.stage.number}</a>
            <BasisBadges badges={document.badges} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** One layer of who does the work: its title, the flexible packages' note, and its items, linked to their competency pages. */
function CapabilityLayerCard({ layer }: Readonly<{ layer: CapabilityLayer }>) {
  return (
    <article className={`delivery-layer delivery-layer-${layer.id}`}>
      <h3>{layer.title}</h3>
      {layer.note && <p className="delivery-layer-note">{layer.note}</p>}
      <ul>
        {layer.items.map((item) => (
          <li key={item.id}>{item.href ? <a href={item.href}>{item.text}</a> : item.text}</li>
        ))}
      </ul>
    </article>
  );
}

export default function DeliveryModelPage() {
  const { statements, changePolicy } = deliveryModel;
  const tokens = formatTokens();
  const responsibility = responsibilityComparison();
  const phases = documentRoute();
  const thread = designThread();
  const layers = Object.fromEntries(capabilityLayers().map((layer) => [layer.id, layer])) as Record<CapabilityLayerId, CapabilityLayer>;
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
            {CONTENTS.map(([id, label]) => <li key={id}><a href={`#${id}`}>{label}</a></li>)}
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
                <div className="delivery-format-head">
                  <span className="delivery-index">{format.number}</span>
                  <h3 id={`${format.anchor}-title`}>{format.title}</h3>
                </div>
                <p className="delivery-format-summary">{format.text}</p>
                <dl>
                  <div><dt>Координує об’єкт</dt><dd>{format.coordination}</dd></div>
                  <div><dt>Стики</dt><dd>{format.interfaces}</dd></div>
                </dl>
                <a className="delivery-more" href="#vidpovidalnist">Хто за що відповідає <span aria-hidden="true">↓</span></a>
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
                  <a href={`#${stageAnchor(stage.id)}`}>
                    <span aria-hidden="true">→ </span>
                    <span className="visually-hidden">Старт з етапу </span>
                    {stage.number} {stage.title}
                  </a>
                  {entry.startNote && <p>{entry.startNote}</p>}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-stages-section ghost-section" id="etapy">
        <GhostWord word="PROCESS" tone="dark" align="start" />
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Вісім етапів"
            title="Маршрут від запиту до здачі"
            supporting="Кожен етап закінчується конкретним результатом і умовою переходу далі. Деталі — під кожним етапом."
            inverse
          />
          <p className="delivery-token-legend">
            <span>Номери форматів у деталях:</span>
            {tokens.map((token) => (
              <a href={`#${token.anchor}`} key={token.id}><span className="delivery-token" aria-hidden="true">{token.number}</span> {token.label}</a>
            ))}
          </p>
          <ol className="delivery-stages">
            {stageCards().map((stage) => (
              <li className="delivery-stage" id={stage.anchor} key={stage.id}>
                <h3><span className="delivery-stage-number">{stage.number}</span>{' '}{stage.title}</h3>
                <div className="delivery-stage-body">
                  <p className="delivery-stage-result"><b><RoleIcon role="result" />Результат:</b> {stage.result}</p>
                  {(stage.designThread || stage.ledByGeneralContractorIn.length > 0) && (
                    <ul className="delivery-tags">
                      {stage.designThread && <li>Нитка проєктування</li>}
                      {stage.ledByGeneralContractorIn.map((label) => <li key={label}>{label}: етап веде генпідрядник</li>)}
                    </ul>
                  )}
                  <details className="delivery-stage-details">
                    <summary>Деталі етапу</summary>
                    <div className="delivery-stage-inner">
                      <div className="delivery-stage-lead">
                        <div><h4>Що відбувається</h4><p>{stage.what}</p></div>
                        <div className="delivery-stage-gate"><h4>Перехід далі, коли…</h4><p>{stage.gate}</p></div>
                      </div>
                      <div className="delivery-stage-roles">
                        <div><h4><RoleIcon role="rubikon" />RUBIKON</h4><PerFormatText rows={stage.rubikon} /></div>
                        <div><h4><RoleIcon role="client" />Замовник</h4><PerFormatText rows={stage.client} /></div>
                        <div><h4><RoleIcon role="partner" />Учасники</h4><PerFormatText rows={stage.involved} /></div>
                      </div>
                      <div className="delivery-stage-docs">
                        <h4><RoleIcon role="documents" />Документи</h4>
                        <ul>
                          {stage.documents.map((document) => (
                            <li key={document.label}><span>{document.label}</span><BasisBadges badges={document.badges} /></li>
                          ))}
                        </ul>
                      </div>
                      <div className="delivery-why"><h4><RoleIcon role="why" />Чому це важливо</h4><p>{stage.why}</p></div>
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
            <p className="delivery-lead">{thread.statement}</p>
          </div>
          <div className="delivery-thread-body">
            <ol className="delivery-thread-route" aria-hidden="true">
              {thread.route.map((point) => (
                <li className={point.mark ? `delivery-thread-point-${point.mark}` : undefined} key={point.number}><span>{point.number}</span></li>
              ))}
            </ol>
            <ol className="delivery-thread-steps">
              {thread.stages.map((stage) => (
                <li key={stage.anchor}><a href={`#${stage.anchor}`}><span>{stage.number}</span> {stage.title}</a><p>{stage.documents.join(' · ')}</p></li>
              ))}
              <li><a href={`#${thread.changeStage.anchor}`}><span>{thread.changeStage.number}</span> Під час реалізації</a><p>{thread.change}</p></li>
            </ol>
          </div>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-who" id="khto-vykonuie">
        <div className="shell">
          <SectionHeader className="page-heading" eyebrow="Хто виконує" title="Власне ядро, гнучкі пакети й партнери" supporting={statements.team} inverse />
          {/* Nested layers, read inside out: the core within the flexible packages, both within the partners. */}
          <div className="delivery-layers">
            <div className="delivery-layers-middle">
              <CapabilityLayerCard layer={layers.core} />
              <CapabilityLayerCard layer={layers.flexible} />
            </div>
            <CapabilityLayerCard layer={layers.partner} />
          </div>
          <p className="delivery-boundary">{statements.boundary}</p>
        </div>
      </section>

      <div className="delivery-principle-band">
        <div className="shell">
          <blockquote className="delivery-principle"><p>{statements.principle}</p></blockquote>
        </div>
      </div>

      <section className="page-section delivery-responsibility ghost-section" id="vidpovidalnist">
        <GhostWord word="RESPONSIBILITY" />
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Відповідальність"
            icon={<RoleIcon role="scope" />}
            title="Хто за що відповідає"
            supporting="Та сама робота може належати різним учасникам — залежно від формату участі. Дозвільні питання, нагляд і виконавчу документацію визначає договір."
          />
          <div className="delivery-shared">
            <h3>Однаково в усіх форматах</h3>
            <div className="delivery-shared-groups">
              {responsibility.shared.map((group) => (
                <div className="delivery-shared-group" key={group.title}>
                  <h4>{group.title}</h4>
                  <ul>{group.activities.map((item) => <li key={item.activity}><Activity item={item} /></li>)}</ul>
                </div>
              ))}
            </div>
          </div>
          <div className="delivery-compare">
            <h3>Залежить від формату</h3>
            <div className="delivery-compare-desktop">
              <table className="delivery-matrix">
                <caption className="visually-hidden">Хто відповідає за роботи, що різняться між форматами участі</caption>
                <thead>
                  <tr>
                    <th scope="col">Робота</th>
                    {tokens.map((token) => (
                      <th scope="col" key={token.id}><span className="delivery-token" aria-hidden="true">{token.number}</span> {token.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {responsibility.compared.map((row) => (
                    <tr key={row.activity}>
                      <th scope="row"><Activity item={row} /></th>
                      {row.cells.map((cell) => (
                        <td key={cell.format.id}>
                          <ul className="delivery-holders">
                            {cell.holders.map((label) => <li className={`delivery-holder-${label.holder}`} key={label.holder}>{label.title}</li>)}
                          </ul>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="delivery-compare-mobile">
              {responsibility.byFormat.map((format) => (
                <details className="delivery-format-panel" id={format.panel} key={format.id}>
                  <summary>
                    <span className="delivery-token" aria-hidden="true">{format.number}</span>
                    <span>{format.label}</span>
                    <small>{plural(responsibility.compared.length, ['робота', 'роботи', 'робіт'])}</small>
                  </summary>
                  <ul className="delivery-panel-rows">
                    {format.rows.map((row) => (
                      <li key={row.activity}>
                        <p className="delivery-panel-activity"><Activity item={row} /></p>
                        <ul className="delivery-holders">
                          {row.holders.map((label) => <li className={`delivery-holder-${label.holder}`} key={label.holder}>{label.title}</li>)}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </div>
          <details className="delivery-notes">
            <summary>Примітки до матриці · {responsibility.notes.length}</summary>
            <ol>
              {responsibility.notes.map((note) => (
                <li key={note.number}><span className="delivery-note-number">{note.number}</span><p><b>{note.activity}.</b> {note.note}</p></li>
              ))}
            </ol>
          </details>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-changes" id="zminy">
        <div className="shell delivery-changes-layout">
          <div className="delivery-changes-head">
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
          <dl className="delivery-basis-legend">
            {basisLegend().map((badge) => (
              <div key={badge.basis}>
                <dt><BasisBadges badges={[badge]} /></dt>
                <dd>{badge.title}</dd>
              </div>
            ))}
          </dl>
          <div className="delivery-docs-desktop">
            {phases.map((phase) => (
              <article className="delivery-doc-phase" key={phase.id} aria-labelledby={`${phase.id}-title`}>
                <h3 id={`${phase.id}-title`}><span>{phase.range}</span> {phase.title}</h3>
                <DocumentList documents={phase.documents} />
              </article>
            ))}
          </div>
          <div className="delivery-docs-mobile">
            {phases.map((phase) => (
              <details className="delivery-doc-phase" key={phase.id}>
                <summary>
                  <span className="delivery-doc-range">{phase.range}</span>
                  <span>{phase.title}</span>
                  <small>{plural(phase.documents.length, ['документ', 'документи', 'документів'])}</small>
                </summary>
                <DocumentList documents={phase.documents} />
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section page-section-dark delivery-budget" id="biudzhet">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Бюджет і строки"
            icon={<RoleIcon role="schedule" />}
            title="Від чого залежать бюджет і строки"
            supporting="Вартість і строки визначаються не лише площею або тоннажем. Цін і усереднених строків не називаємо: їх фіксують кошторис і графік на етапі «Склад робіт і бюджет»."
            inverse
          />
          <div className="delivery-budget-rows">
            {budgetGroups().map((group) => (
              <div className="delivery-budget-row" key={group.id}>
                <h3>{group.title}</h3>
                <ul className="delivery-chips">{group.factors.map((factor) => <li key={factor}>{factor}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section delivery-experience ghost-section" id="dosvid">
        <GhostWord word="EXPERIENCE" />
        <div className="shell delivery-experience-layout">
          <p className="eyebrow"><span /> Досвід</p>
          <p className="delivery-experience-statement">{statements.experience}</p>
          <a className="section-link" href={siteRoutes.about}>Більше про компанію <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <DirectionFaq title="Питання про модель реалізації" items={deliveryFaq()} collapsible />
      <InquirySection
        eyebrow="Почнемо з розмови"
        title="Обговоримо вашу задачу"
        text={statements.firstContact}
        checklist={{ title: 'Що допоможе на першій розмові', items: startInputs() }}
      />
    </main>
  );
}
