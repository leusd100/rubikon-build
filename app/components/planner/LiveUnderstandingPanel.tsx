import { Check, CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Insight, Tension, ThemeState } from '../../lib/planner/core/types';
import { InsightNote, TensionNote } from './InsightNote';

export type PanelProgressItem = { title: string; state: ThemeState; current: boolean };

/**
 * What the planner has understood so far: a one-sentence synthesis, the confirmed facts, a
 * domain diagram, one derived insight, one tension and theme progress. `panel` sits beside the
 * consultation on wide screens; `summary` is the compact version shown at readiness on narrow ones.
 */
export function LiveUnderstandingPanel({
  variant,
  label,
  note,
  synthesis,
  facts,
  emptyFacts,
  diagram,
  insight,
  tension,
  progress,
}: {
  variant: 'panel' | 'summary';
  label: string;
  note: string;
  synthesis: string;
  facts: readonly string[];
  emptyFacts: string;
  diagram?: ReactNode;
  insight?: Insight | null;
  tension?: Tension | null;
  progress?: readonly PanelProgressItem[];
}) {
  const Wrapper = variant === 'panel' ? 'aside' : 'div';

  return (
    <Wrapper className={`planner-panel is-${variant}`} aria-label={variant === 'panel' ? label : undefined}>
      <div className="planner-panel-top">
        <h3>{label}</h3>
        <span>{note}</span>
      </div>
      <p className="planner-synthesis" key={synthesis}>{synthesis}</p>
      <ul className="planner-facts" aria-live={variant === 'panel' ? 'polite' : undefined}>
        {facts.length
          ? facts.map((fact, index) => <li key={`${fact}-${index}`}><i aria-hidden="true" />{fact}</li>)
          : <li className="is-empty">{emptyFacts}</li>}
      </ul>
      {diagram}
      {insight && <InsightNote insight={insight} />}
      {tension && <TensionNote tension={tension} />}
      {progress && (
        <ol className="planner-progress">
          {progress.map((item) => (
            <li key={item.title} data-state={item.state} className={item.current ? 'is-current' : undefined}>
              <span aria-hidden="true">{item.state === 'confirmed' ? <Check /> : item.state === 'unknown' ? <CircleHelp /> : item.current ? '•' : '○'}</span>
              <b>{item.title}</b>
            </li>
          ))}
        </ol>
      )}
    </Wrapper>
  );
}
