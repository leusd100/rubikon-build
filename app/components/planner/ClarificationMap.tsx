import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

export type ClarificationCard = { title: string; why: string; how: string };

/** The clarification route: what to find out before a comparison, why, and how. */
export function ClarificationMap({
  heading,
  cards,
  density,
  whyLabel,
  howLabel,
  editLabel,
  onEdit,
}: {
  heading: ReactNode;
  cards: readonly ClarificationCard[];
  density: 'full' | 'compact';
  whyLabel: string;
  howLabel: string;
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="planner-clarification">
      {heading}
      <ol className="planner-clarification-grid">
        {cards.map((card, index) => (
          <li key={card.title}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <h3>{card.title}</h3>
            <p><b>{whyLabel}</b>{card.why}</p>
            {density === 'full' && <p><b>{howLabel}</b>{card.how}</p>}
          </li>
        ))}
      </ol>
      <button type="button" className="button planner-button-outline" onClick={onEdit}>
        <Pencil aria-hidden="true" /> {editLabel}
      </button>
    </div>
  );
}
