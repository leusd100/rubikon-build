'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';

export type PlannerTab = { id: string; label: string };

/**
 * WAI-ARIA tabs with automatic activation: ←/→ move and select, Home/End jump to the ends, and
 * only the selected tab is in the tab order. Only the active panel renders its content.
 */
export function PlannerTabs({
  idBase,
  label,
  tabs,
  active,
  onChange,
  children,
}: {
  idBase: string;
  label: string;
  tabs: readonly PlannerTab[];
  active: string;
  onChange: (id: string) => void;
  children: (id: string) => ReactNode;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const next = event.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : event.key === 'Home' ? 0
          : event.key === 'End' ? last
            : null;
    if (next === null) return;
    event.preventDefault();
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div className="planner-tabs">
      <div role="tablist" aria-label={label} className="planner-tablist">
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(element) => { refs.current[index] = element; }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${idBase}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${idBase}-panel-${tab.id}`}
          aria-labelledby={`${idBase}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
        >
          {tab.id === active ? children(tab.id) : null}
        </div>
      ))}
    </div>
  );
}
