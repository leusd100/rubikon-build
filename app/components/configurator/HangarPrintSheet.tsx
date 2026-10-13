'use client';

import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { company } from '../../data/company';
import { NBSP, deriveSummary, formatMeters } from '../../lib/configurator/deriveSummary';
import { anythingChosen, sizesProvenance, type HangarDomainModel } from '../../lib/configurator/domainModel';
import { createHangarInquiryBrief, createHangarInquiryBriefOutline } from '../../lib/configurator/inquiryBrief';
import { SIZE_KEYS, SIZE_LABELS } from '../../lib/configurator/types';
import { DISCLAIMER } from './disclaimer';
import { HangarGeneralView } from './HangarGeneralView';
import { sheetObjectLabel } from './sheetLabels';
import './print-sheet.css';

/** The page the sheet names: where it was made, for whoever holds the paper */
const SHEET_SOURCE = `${company.siteUrl.replace(/^https:\/\//, '')}/angary`;

/**
 * «Друкувати аркуш A4» (Phase 4, 12.10; R-UX-06 §14 п. 14, §15): the configuration on one A4 sheet through the browser's
 * own print — to show a partner or an accountant, or keep with the papers. The drawing as the page draws it, the rows
 * exactly as the lead carries them (createHangarInquiryBriefOutline: what the visitor chose, what is still the example's,
 * what the configurator works out), the date and the configurator's one disclaimer. Nothing the configurator does not
 * know: no price, no dates, no engineering figures.
 *
 * Rendered only while printing, at the end of <body>, laid out off screen at the paper's width so the drawing lays itself
 * out for the box it prints in: print-sheet.css hides everything else while the root carries `data-print="hangar-sheet"`,
 * so the browser's own Ctrl+P still prints the page as it is.
 */
/** `onDone` gets `false` once the print is over: a state setter, so the print runs once */
export function HangarPrintSheet({ domain, onDone }: Readonly<{ domain: HangarDomainModel; onDone: (printing: false) => void }>) {
  const [made] = useState(() => new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()));

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.print = 'hangar-sheet';
    const done = () => {
      delete root.dataset.print;
      onDone(false);
    };
    window.addEventListener('afterprint', done, { once: true });
    // two frames later: the sheet has laid out off screen, and its drawing has measured the box it prints in
    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => window.print());
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', done);
      delete root.dataset.print;
    };
  }, [onDone]);

  const summary = deriveSummary(domain);
  const outline = createHangarInquiryBriefOutline(createHangarInquiryBrief(domain));
  const own = anythingChosen(domain);
  const object = sheetObjectLabel(sizesProvenance(domain), domain.dimensions, own);
  // as the stamp says it: the example's sizes beside the visitor's step back, and are named
  const exampleSizes = SIZE_KEYS.filter((key) => domain.sizes[key] === 'example');
  const mixed = own && sizesProvenance(domain) === 'own' && exampleSizes.length > 0 && exampleSizes.length < SIZE_KEYS.length;
  const values = { width: domain.dimensions.widthM, length: domain.dimensions.lengthM, height: domain.dimensions.eaveHeightM };

  return createPortal(
    <div className="hc-print-root">
      <article className="hc-print" aria-label="Попередній аркуш конфігурації">
        <header className="hc-print-head">
          <p className="hc-print-brand"><strong>{company.name}</strong><span>Ангари та склади</span></p>
          <div className="hc-print-title">
            <h1>Попередній аркуш конфігурації</h1>
            <p>Складено {made} на {SHEET_SOURCE}</p>
          </div>
        </header>
        <section className="hc-print-object">
          <p className="hc-print-kind">{own ? 'Ваша конфігурація' : 'Приклад конфігурації'}</p>
          <p className="hc-print-dimensions" translate="no">
            {SIZE_KEYS.map((key, index) => (
              <Fragment key={key}>
                {index > 0 && `${NBSP}×${NBSP}`}
                <span data-status={mixed && domain.sizes[key] === 'example' ? 'example' : undefined}>{formatMeters(values[key])}</span>
              </Fragment>
            ))}
            {`${NBSP}м`}
          </p>
          <p className="hc-print-area" translate="no">коник {summary.ridgeHeightLabel} · площа забудови {summary.areaLabel}</p>
          {mixed && <p className="hc-print-note">з прикладу: {exampleSizes.map((key) => SIZE_LABELS[key].toLowerCase()).join(', ')}</p>}
        </section>
        <figure className="hc-print-drawing">
          <HangarGeneralView domain={domain} />
          <figcaption>Загальний вигляд · попередня схема · {object}</figcaption>
        </figure>
        <div className="hc-print-facts">
          {outline.map((section) => (
            <section key={section.id} className="hc-print-part" data-part={section.id}>
              <h2>{section.heading}</h2>
              <dl>
                {section.rows.map((row) => (
                  <div key={row.label}><dt>{row.label}</dt><dd translate="no">{row.value}</dd></div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <p className="hc-print-disclaimer">{DISCLAIMER}</p>
        <p className="hc-print-disclaimer">Ціни, строків і проєктних рішень цей аркуш не містить.</p>
        {/* a div: the site's <footer> style is its dark band */}
        <div className="hc-print-foot">
          <span>{company.name}</span>
          <span>{company.phone.display}</span>
          <span>{company.email}</span>
          <span>{SHEET_SOURCE}</span>
        </div>
      </article>
    </div>,
    document.body,
  );
}
