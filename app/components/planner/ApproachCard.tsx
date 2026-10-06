import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** One approach in the comparison. Same weight for every card: nothing here ranks them. */
export function ApproachCard({
  category,
  label,
  title,
  summary,
  visual,
  reason,
  actionLabel,
  onAction,
}: {
  /** The card's kind over its drawing; the grain overview leaves it out (it repeated the title) */
  category?: string;
  label?: string;
  title: string;
  summary: string;
  visual: ReactNode;
  reason?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className="planner-approach">
      {(category || label) && (
        <div className="planner-approach-top">
          <span>{category}</span>
          {label && <b>{label}</b>}
        </div>
      )}
      {visual}
      <h3>{title}</h3>
      <p>{summary}</p>
      {reason && <p className="planner-approach-reason">{reason}</p>}
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>{actionLabel} <ArrowRight aria-hidden="true" /></button>
      )}
    </article>
  );
}
