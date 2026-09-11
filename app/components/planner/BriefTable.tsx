import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

export type BriefRowView = { label: string; value: string; onEdit?: () => void };
export type BriefAsideRow = { label: string; value: string };

/** The preliminary brief: the task in rows the client can correct, and the decision map beside it. */
export function BriefTable({
  eyebrow,
  heading,
  note,
  rows,
  asideTitle,
  aside,
  action,
}: {
  eyebrow: string;
  heading: string;
  note: string;
  rows: readonly BriefRowView[];
  asideTitle: string;
  aside: readonly BriefAsideRow[];
  action?: ReactNode;
}) {
  return (
    <div className="planner-brief" data-planner-brief aria-labelledby="planner-brief-title">
      <div className="planner-brief-head">
        <div>
          <p className="eyebrow"><span /> {eyebrow}</p>
          <h3 id="planner-brief-title">{heading}</h3>
        </div>
        <p>{note}</p>
      </div>
      <div className="planner-brief-grid">
        <dl className="planner-brief-rows">
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                <span>{row.value}</span>
                {row.onEdit && (
                  <button type="button" onClick={row.onEdit} aria-label={`Змінити: ${row.label}`}>
                    <Pencil aria-hidden="true" /> змінити
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <aside className="planner-brief-aside" aria-label={asideTitle}>
          <p>{asideTitle}</p>
          <dl>
            {aside.map((row) => (
              <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
            ))}
          </dl>
        </aside>
      </div>
      {action && <div className="planner-brief-action">{action}</div>}
    </div>
  );
}
