import { ArrowDown, Check, CircleHelp } from 'lucide-react';

export type ReadinessItemView = { label: string; value: string; ready: boolean };

/** The step between the consultation and the result: is there enough to compare, and what next. */
export function ReadinessCard({
  eyebrow,
  heading,
  body,
  items,
  ready,
  revealLabel,
  onReveal,
}: {
  eyebrow: string;
  heading: string;
  body: string;
  items: readonly ReadinessItemView[];
  ready: boolean;
  revealLabel: string;
  onReveal: () => void;
}) {
  return (
    <article className="planner-readiness" data-planner-anchor aria-labelledby="planner-readiness-title">
      <span className="planner-readiness-mark" aria-hidden="true">{ready ? <Check /> : <CircleHelp />}</span>
      <p className="planner-question-index">{eyebrow}</p>
      <h3 id="planner-readiness-title" tabIndex={-1} data-planner-focus>{heading}</h3>
      <p className="planner-readiness-body">{body}</p>
      <dl className="planner-readiness-grid">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}<i className={item.ready ? 'is-ready' : 'is-partial'} aria-hidden="true" /></dd>
          </div>
        ))}
      </dl>
      <button type="button" className="button planner-button-dark" onClick={onReveal}>
        {revealLabel} <ArrowDown aria-hidden="true" />
      </button>
    </article>
  );
}
