import type { Insight, Tension } from '../../lib/planner/core/types';

/** A conclusion the planner derived — not an answer echoed back. */
export function InsightNote({ insight }: { insight: Insight }) {
  return (
    <div className="planner-insight">
      <p>{insight.kind}</p>
      <h4>{insight.title}</h4>
      <span>{insight.body}</span>
    </div>
  );
}

/** Two confirmed answers that pull in different directions. One representation per tension. */
export function TensionNote({ tension }: { tension: Tension }) {
  return (
    <div className="planner-tension">
      <p>{tension.kind}</p>
      <h4>{tension.title}</h4>
      <span>{tension.body}</span>
    </div>
  );
}
