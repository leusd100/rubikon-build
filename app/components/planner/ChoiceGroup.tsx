'use client';

import { useId } from 'react';
import { choiceOptionId } from './choiceOptionId';

/** `[value, title, description]` — the shape every planner domain already uses for its options. */
export type ChoiceOption = readonly string[];

/**
 * A single-choice question as a native fieldset of native radios: arrow keys, Space and screen
 * reader group semantics come from the platform. The legend repeats the visible question for
 * assistive technology; the visible heading lives in QuestionFrame or Clarifier.
 */
export function ChoiceGroup({
  legend,
  value,
  options,
  onChange,
  columns = 1,
}: {
  legend: string;
  value: string | null;
  options: readonly ChoiceOption[];
  onChange: (value: string) => void;
  columns?: 1 | 2;
}) {
  const group = useId();

  return (
    <fieldset className={`planner-choice-group${columns === 2 ? ' is-two-columns' : ''}`}>
      <legend className="planner-sr-only">{legend}</legend>
      {options.map(([itemValue, title, description]) => {
        const id = choiceOptionId(group, itemValue);
        const checked = value === itemValue;
        return (
          <label htmlFor={id} className={`planner-choice-row${checked ? ' is-selected' : ''}`} key={itemValue}>
            <input type="radio" id={id} name={group} value={itemValue} checked={checked} onChange={() => onChange(itemValue)} />
            <span>
              <b>{title}</b>
              {description && <small>{description}</small>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
