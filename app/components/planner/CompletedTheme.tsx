import { Check, CircleHelp, Pencil } from 'lucide-react';
import type { ThemeState } from '../../lib/planner/core/types';

/** A finished theme, collapsed to one line of what was answered, with a way back into it. */
export function CompletedTheme({
  index,
  title,
  summary,
  state,
  onEdit,
}: {
  index: number;
  title: string;
  summary: string;
  state: ThemeState;
  onEdit: () => void;
}) {
  return (
    <div className="planner-completed" data-planner-theme={index} data-state={state}>
      <span className="planner-completed-icon" aria-hidden="true">{state === 'unknown' ? <CircleHelp /> : <Check />}</span>
      <div>
        <p>{title}<span className="planner-sr-only">{state === 'unknown' ? ' — є невизначені відповіді' : ' — підтверджено'}</span></p>
        <b>{summary}</b>
      </div>
      <button type="button" onClick={onEdit} aria-label={`Змінити: ${title}`}>
        <Pencil aria-hidden="true" /> Змінити
      </button>
    </div>
  );
}
