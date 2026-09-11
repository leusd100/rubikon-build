import { Pencil } from 'lucide-react';

/** The client's scenario at a glance above the result, with the way back to edit it. */
export function ScenarioStrip({
  label,
  headline,
  facts,
  editLabel,
  onEdit,
}: {
  label: string;
  headline: string;
  facts: readonly string[];
  editLabel: string;
  onEdit: () => void;
}) {
  return (
    <div className="planner-scenario">
      <div>
        <p>{label}</p>
        <b>{headline}</b>
      </div>
      <ul>{facts.map((fact, index) => <li key={`${fact}-${index}`}>{fact}</li>)}</ul>
      <button type="button" className="button planner-button-outline" onClick={onEdit}>
        <Pencil aria-hidden="true" /> {editLabel}
      </button>
    </div>
  );
}
