import { ChevronDown, RotateCcw } from 'lucide-react';

/** «Результат оновлено» after an edit, with the consequences one click away. */
export function ChangeBanner({
  id,
  title,
  subtitle,
  toggleLabel,
  notes,
  open,
  onToggle,
}: {
  id: string;
  title: string;
  subtitle: string;
  toggleLabel: string;
  notes: readonly string[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="planner-change" role="status">
      <div className="planner-change-head">
        <RotateCcw aria-hidden="true" />
        <p><b>{title}</b><small>{subtitle}</small></p>
      </div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle}>
        {toggleLabel} <ChevronDown aria-hidden="true" />
      </button>
      <ul id={id} hidden={!open}>
        {notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </div>
  );
}
