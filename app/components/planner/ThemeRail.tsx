import { Check, CircleHelp } from 'lucide-react';
import type { ThemeState } from '../../lib/planner/core/types';

export type ThemeRailItem = { title: string; note: string; state: ThemeState };

/** The consultation's themes in order — the cover before the first answer, progress after. */
export function ThemeRail({ items, active, label }: { items: readonly ThemeRailItem[]; active: number; label: string }) {
  return (
    <ol className="planner-theme-rail" aria-label={label}>
      {items.map((item, index) => (
        <li
          key={item.title}
          className={index === active ? 'is-active' : undefined}
          data-state={item.state}
          aria-current={index === active ? 'step' : undefined}
        >
          <span className="planner-theme-marker" aria-hidden="true">
            {item.state === 'confirmed' ? <Check /> : item.state === 'unknown' ? <CircleHelp /> : String(index + 1).padStart(2, '0')}
          </span>
          <b>{item.title}</b>
          <small>{item.note}</small>
          {item.state !== 'incomplete' && (
            <span className="planner-sr-only">{item.state === 'unknown' ? ' — завершено, є уточнення' : ' — завершено'}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
