'use client';

import { useId, useState } from 'react';
import { JOURNEY_TITLES, type JourneyTexts } from '../data/conversation';

/**
 * «Що буде після звернення». Desktop and tablet: a strip of four cells under the form, drawn like the title block of a
 * drawing sheet, every text visible. Phone: the four titles, with the explanations behind one «Докладніше» — the texts
 * stay in the server HTML either way. Without JavaScript nothing is collapsed (conversation.css keys the collapse on
 * <html data-theme>, which only the head script sets).
 */
export function ConversationJourney({ journey }: Readonly<{ journey: JourneyTexts }>) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId();

  return (
    <div className="conversation-journey-wrap" data-expanded={expanded ? 'true' : undefined}>
      <p className="conversation-journey-title">Що буде після звернення</p>
      <ol className="conversation-journey" id={listId}>
        {JOURNEY_TITLES.map((stepTitle, index) => (
          <li key={stepTitle}>
            <span className="conversation-journey-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h3>{stepTitle}</h3>
              <p>{journey[index]}</p>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="conversation-journey-toggle"
        aria-controls={listId}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? 'Згорнути' : 'Докладніше про кожен крок'}
      </button>
    </div>
  );
}
