'use client';

import { useId, type ReactNode } from 'react';
import { choiceOptionId } from './choiceOptionId';

export type CheckOption = { value: string; title: string; description?: string; icon?: ReactNode };

/** A multi-select question as a native fieldset of native checkboxes. */
export function CheckOptionGrid({
  legend,
  options,
  selected,
  onToggle,
  variant,
  idBase,
}: {
  legend: string;
  options: readonly CheckOption[];
  selected: readonly string[];
  onToggle: (value: string) => void;
  /** `tiles` — short labels with a pictogram; `cards` — a title with a description. */
  variant: 'tiles' | 'cards';
  /**
   * A fixed id prefix for a group that is server-rendered: generated ids there can hydrate
   * differently from the server HTML. Client-only groups can leave it to useId.
   */
  idBase?: string;
}) {
  const generated = useId();
  const group = idBase ?? generated;

  return (
    <fieldset className={`planner-check-grid is-${variant}`}>
      <legend className="planner-sr-only">{legend}</legend>
      {options.map((option) => {
        const id = choiceOptionId(group, option.value);
        const checked = selected.includes(option.value);
        return (
          <label htmlFor={id} className={`planner-check-option${checked ? ' is-selected' : ''}`} key={option.value}>
            <input type="checkbox" id={id} checked={checked} onChange={() => onToggle(option.value)} />
            {option.icon && <span className="planner-check-icon" aria-hidden="true">{option.icon}</span>}
            <span className="planner-check-text">
              <b>{option.title}</b>
              {option.description && <small>{option.description}</small>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
