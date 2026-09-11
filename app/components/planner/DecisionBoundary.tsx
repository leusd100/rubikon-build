import { CircleHelp } from 'lucide-react';

export type BoundaryList = { label: string; items: readonly string[] };

/**
 * Three kinds of «not yet»: what the client has not decided, what the first conversation will
 * clarify, and what only design settles. Kept visually distinct so none reads as another.
 */
export function DecisionBoundary({
  eyebrow,
  heading,
  lead,
  undecided,
  undecidedEmpty,
  firstCall,
  gates,
}: {
  eyebrow: string;
  heading: string;
  lead: string;
  undecided: BoundaryList;
  undecidedEmpty: string;
  firstCall: BoundaryList;
  gates: BoundaryList;
}) {
  return (
    <div className="planner-boundary" aria-labelledby="planner-boundary-title">
      <div className="planner-boundary-intro">
        <p className="eyebrow"><span /> {eyebrow}</p>
        <h3 id="planner-boundary-title">{heading}</h3>
        <p>{lead}</p>
      </div>
      <div className="planner-boundary-columns">
        <div>
          <h4>{undecided.label}</h4>
          {undecided.items.length
            ? <ul>{undecided.items.map((item) => <li key={item}><CircleHelp aria-hidden="true" />{item}</li>)}</ul>
            : <p>{undecidedEmpty}</p>}
          <h4>{firstCall.label}</h4>
          <ul>{firstCall.items.map((item) => <li key={item}><CircleHelp aria-hidden="true" />{item}</li>)}</ul>
        </div>
        <div className="planner-gates">
          <h4>{gates.label}</h4>
          <ol>{gates.items.map((item, index) => <li key={item}><i aria-hidden="true">{String(index + 1).padStart(2, '0')}</i>{item}</li>)}</ol>
        </div>
      </div>
    </div>
  );
}
