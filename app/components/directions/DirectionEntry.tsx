import type { CSSProperties } from 'react';
import type { DirectionPageConfig } from '../../types/directionPage';
import { SectionHeader } from '../SiteChrome';
import { PrefillInquiryLink } from './PrefillInquiryLink';
import { keepHeadingWords } from '../../lib/typography';
import { Arrow } from '../Arrow';

// «З чим звертаються» (roofing): the situations a call starts from, each with what happens first and a link that
// opens the form with the situation already written. The words are the page's own (process, FAQ, and the former
// «Склад робіт» block, removed in PDO-07).
export function DirectionEntry({ entry }: Readonly<{ entry: NonNullable<DirectionPageConfig['entry']> }>) {
  return (
    <section className="page-section direction-entry" aria-labelledby="direction-entry-title">
      <div className="shell">
        <SectionHeader className="page-heading" eyebrow={entry.eyebrow} title={entry.title} supporting={entry.text} titleId="direction-entry-title" />
        <ol className="direction-entry-list" data-motion>
          {entry.items.map((item, index) => (
            <li key={item.situation} style={{ '--i': index } as CSSProperties}>
              <div className="direction-entry-copy">
                <h3>{keepHeadingWords(item.situation)}</h3>
                <p>{item.text}</p>
              </div>
              <p className="direction-entry-start"><b>Почнемо з</b> {item.start}</p>
              <PrefillInquiryLink className="link-arrow direction-entry-link" text={`${item.situation}. `}>
                Обговорити <Arrow to="down" />
              </PrefillInquiryLink>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
