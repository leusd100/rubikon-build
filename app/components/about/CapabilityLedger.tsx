import type { CSSProperties } from 'react';
import { capabilityLedger } from '../../lib/deliveryModelPresentation';

// /pro-nas «Що робимо самі, а що організовуємо» (UX pass 2026-10): in place of the five-direction list, which repeated
// /napryamky, the company's character and its limits — what its own team does, what it organises for a project and what
// stays with specialist contractors or the client. Every line is the Delivery Model's (capabilityLedger); a work that
// has its own page links to it.
export function CapabilityLedger() {
  return (
    <div className="about-ledger" data-motion>
      {capabilityLedger().map((column, index) => (
        <section className={`about-ledger-col is-${column.id}`} aria-labelledby={`about-ledger-${column.id}`} key={column.id} style={{ '--i': index } as CSSProperties}>
          <h3 id={`about-ledger-${column.id}`}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            {column.title}
          </h3>
          {column.note && <p className="about-ledger-note">{column.note}</p>}
          <ul>
            {column.items.map((item) => (
              <li key={item.id}>
                <b>{item.href ? <a href={item.href}>{item.label} <span aria-hidden="true">↗</span></a> : item.label}</b>
                {item.statement && <span>{item.statement}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
