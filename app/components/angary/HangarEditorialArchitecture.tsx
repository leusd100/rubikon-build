'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Phone } from 'lucide-react';
import { CostFactorsFigure, type CostFactorItem } from '../process/CostFactorsFigure';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';
import { useInquiryAttachment } from '../inquiry/InquiryAttachmentProvider';
import { revealAttachedBrief } from '../inquiry/revealAttachedBrief';
import { company, companyContactLinks } from '../../data/company';
import { sameDrawnHangar } from '../../lib/configurator/attachmentContract';
import { costFactorNotes } from '../../lib/configurator/costNotes';
import { deriveDomainModel } from '../../lib/configurator/domainModel';
import { deriveSummary } from '../../lib/configurator/deriveSummary';
import { DEFAULT_CONFIGURATOR_STATE } from '../../lib/configurator/types';
import { FrameTour } from './FrameTour';
import { ProcessDrawing } from '../directions/ProcessDrawing';
import type { ProcessSplit } from '../../types/directionPage';

// /angary below the configurator (UX review 2026-10, report «/angary по блоках»): the visitor's frame from roof to
// footing, a real hangar built that way, what drives the cost, and the route from the brief to handed-over works with
// who answers for it. The three static frame schemes, the separate people section and the five-step route that skipped
// the estimate are gone. Owner, 03.10: the frame comes first, straight after the configuration it draws, and the real
// hangar follows it; the cost after both.
//
// Every statement comes from the page (server) as plain strings: the Delivery Model's own words, never copied here.

export type AngaryEditorialContent = {
  cost: { title: string; text: string; factors: readonly CostFactorItem[]; customerScope: string };
  /** leadCta: the Delivery Model's contactRoles.constructionLead.cta, the title block's way to the form */
  route: {
    /** The Delivery Model's steps: what we do */
    steps: readonly { title: string; text: string }[];
    /** Per model step: what you do, what you get after it, its drawing on the rail */
    sides: readonly ProcessSplit[];
    boundary: string;
    leadCta: string;
  };
  people: readonly { name: string; role: string }[];
};

const pad = (value: number) => String(value).padStart(2, '0');

export function HangarEditorialArchitecture({
  content,
  realObject,
}: Readonly<{
  content: AngaryEditorialContent;
  /** The real hangar row (HangarRealObject), rendered on the server; absent while there is no approved record */
  realObject?: ReactNode;
}>) {
  const inquiry = useHangarInquiryContext();
  const inquiryAttachment = useInquiryAttachment();
  const state = inquiry?.state ?? DEFAULT_CONFIGURATOR_STATE;
  const summary = deriveSummary(deriveDomainModel(state));
  // What the visitor's own configuration already says about a factor — only once they have set something
  const own = !sameDrawnHangar(state, DEFAULT_CONFIGURATOR_STATE);
  const notes = own ? costFactorNotes(deriveDomainModel(state)) : undefined;
  const attached = Boolean(inquiry?.isAttached);
  // Sent with a saved lead and unchanged since (04.10): 01 says so and no longer asks to send it
  const sent = attached && Boolean(inquiryAttachment?.sent);
  // The brief's own headline, as the form's card shows it: without the contour when walls and roof are out of scope,
  // the object answers when only they were given (04.10)
  const briefHeadline = inquiryAttachment?.attachment?.headline ?? summary.headlineLabel;
  let briefState = 'idle';
  if (attached) briefState = 'attached';
  else if (inquiry?.attachment.status === 'detached') briefState = 'detached';

  return (
    <>
      <section className="page-section direction-editorial-section dn-section angary-structure" id="structure" aria-labelledby="angary-structure-title">
        <FrameTour titleId="angary-structure-title" />
      </section>

      {realObject}

      <section className="page-section angary-cost" id="vartist" aria-labelledby="angary-cost-title">
        <div className="shell">
          <header className="angary-section-heading">
            <p className="eyebrow"><span /> Вартість</p>
            <h2 id="angary-cost-title">{content.cost.title}</h2>
            <p>{content.cost.text}</p>
          </header>
          <CostFactorsFigure factors={content.cost.factors} title={null} tour={false} notes={notes} sheet />
          <div className="angary-cost-foot">
            <p>{content.cost.customerScope}</p>
            <div className="angary-cost-actions">
              <a className="button button-primary" href="#inquiry" data-open-inquiry>
                Обговорити вартість вашого ангара <span aria-hidden="true">↓</span>
              </a>
              <a className="angary-text-link" href="/yak-pratsyuiemo#koshtorys">
                Як формуємо кошторис і графік <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section angary-process" id="process" aria-labelledby="angary-process-title">
        <div className="shell">
          <header className="angary-section-heading is-inverse">
            <p className="eyebrow light"><span /> Від брифу до об’єкта</p>
            <h2 id="angary-process-title">Зрозумілий шлях від першого брифу</h2>
          </header>
          {/* «Ви · Ми» (owner, 06.10, as on the other direction pages): over the rail what you do, under it what we do — the
              Delivery Model's steps word for word — and on it what you get, drawn small. 01 is the visitor's own brief: its
              «Ви» follows the brief's state, its action goes up to the configurator or down to the attached brief. */}
          <p className="process-key" aria-hidden="true"><span>Ви</span><span>RUBIKON</span></p>
          <ol className="process-split angary-route" data-motion data-brief={briefState} style={{ '--steps': content.route.steps.length + 1 } as CSSProperties}>
            <li className="angary-route-brief" style={{ '--i': 0 } as CSSProperties}>
              <h3><b>01</b>Ваш бриф</h3>
              <div className="ps-you">
                <small>Ви</small>
                {attached
                  ? <>{sent ? 'Надіслано з вашим запитом' : 'Додано до заявки'}: <b>{briefHeadline}</b></>
                  : 'Складаєте базову конфігурацію вище або описуєте задачу словами.'}
                {/* Owner, 03.10: the brief's node acts on its own state — up to the configurator while nothing is attached,
                    down to the attached brief in the form once something is */}
                {attached && !sent && (
                  <a className="angary-route-brief-action" href="#inquiry" onClick={revealAttachedBrief}>
                    Надіслати бриф <span aria-hidden="true">↓</span>
                  </a>
                )}
                {!attached && (
                  <a className="angary-route-brief-action" href="#configurator">
                    Сформувати бриф <span aria-hidden="true">↑</span>
                  </a>
                )}
              </div>
              <div className="ps-node">
                <ProcessDrawing kind="hangar-brief" />
                <span className="ps-spark" aria-hidden="true" />
              </div>
              <p className="ps-result"><span className="sr-only">Результат: </span>{attached ? 'Бриф у заявці' : 'Бриф до заявки'}</p>
              <p className="ps-we"><small>Ми</small>Читаємо бриф і готуємо питання до розмови.</p>
            </li>
            {content.route.steps.map((step, index) => (
              <li key={step.title} style={{ '--i': index + 1 } as CSSProperties}>
                <h3><b>{pad(index + 2)}</b>{step.title}</h3>
                <p className="ps-you"><small>Ви</small>{content.route.sides[index]?.you}</p>
                <div className="ps-node">{content.route.sides[index] && <ProcessDrawing kind={content.route.sides[index].drawing} />}</div>
                <p className="ps-result"><span className="sr-only">Результат: </span>{content.route.sides[index]?.result}</p>
                <p className="ps-we"><small>Ми</small>{step.text}</p>
              </li>
            ))}
          </ol>
          <a className="angary-route-more" href="/yak-pratsyuiemo#etapy">
            Усі етапи, документи й відповідальність <span aria-hidden="true">→</span>
          </a>

          {/* Who answers for it — the route's title block («штамп»), in place of a separate section. Owner, 03.10: it hands
              over to them — the form under the Delivery Model's own words for the construction lead, or a call */}
          {/* a group, so its title names it — a plain div cannot take a name (04.10) */}
          <div className="angary-stamp" id="responsibility" role="group" aria-labelledby="angary-stamp-title">
            <p className="angary-stamp-title" id="angary-stamp-title">За погоджений обсяг відповідаємо особисто</p>
            <dl>
              {content.people.map((person) => (
                <div key={person.name}><dt>{person.role}</dt><dd>{person.name}</dd></div>
              ))}
              <div className="is-wide"><dt>Межі обсягу</dt><dd>{content.route.boundary}</dd></div>
            </dl>
            <div className="angary-stamp-actions">
              <a className="button button-primary angary-stamp-cta" href="#inquiry" data-open-inquiry>
                {content.route.leadCta} <span aria-hidden="true">↓</span>
              </a>
              <a className="angary-stamp-phone" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
                <Phone aria-hidden="true" /> {company.phone.display}
              </a>
              <a className="angary-stamp-link" href="/pro-nas">Про компанію <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
