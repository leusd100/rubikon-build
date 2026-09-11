'use client';

import { Bean, Check, CircleHelp, Flower2, Sprout, Vegan, Wheat } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cropOptions, parseCapacity, separationOptions } from '../../../lib/planner/grain';
import { CheckOptionGrid } from '../../planner/CheckOptionGrid';
import { ChoiceGroup } from '../../planner/ChoiceGroup';
import { Clarifier } from '../../planner/Clarifier';
import type { GrainQuestionProps } from './types';

const cropIcons: Record<string, ReactNode> = {
  'Пшениця': <Wheat />,
  'Кукурудза': <Vegan />,
  'Соняшник': <Flower2 />,
  'Ячмінь': <Sprout />,
  'Соя': <Bean />,
  'Ще не визначили': <CircleHelp />,
};

export function StorageQuestion({ answers, answer }: GrainQuestionProps) {
  const ids = useId();
  const capacityId = `${ids}-capacity`;
  const hintId = `${ids}-hint`;
  const errorId = `${ids}-error`;
  const unknownCapacity = answers.capacity === 'unknown';
  const invalid = parseCapacity(answers.capacity).kind === 'invalid';

  // Verbatim toggle rules from the prototype: «Ще не визначили» excludes the crops and vice versa.
  function toggleCrop(crop: string) {
    let next: string[];
    if (crop === 'Ще не визначили') next = answers.crops.includes(crop) ? [] : [crop];
    else next = answers.crops.includes(crop) ? answers.crops.filter((item) => item !== crop) : [...answers.crops.filter((item) => item !== 'Ще не визначили'), crop];
    answer('crops', next);
  }

  return (
    <>
      <CheckOptionGrid
        legend="Що потрібно зберігати?"
        variant="tiles"
        options={cropOptions.map((crop) => ({ value: crop, title: crop, icon: cropIcons[crop] }))}
        selected={answers.crops}
        onToggle={toggleCrop}
      />
      <div className="planner-capacity">
        <label htmlFor={capacityId}>Скільки має поміщатися одночасно? <span className="planner-sr-only">У тоннах.</span></label>
        <p id={hintId}>Вкажіть одне орієнтовне значення або діапазон.</p>
        <div className="planner-capacity-input">
          <input
            id={capacityId}
            type="text"
            inputMode="text"
            autoComplete="off"
            value={unknownCapacity ? '' : answers.capacity}
            placeholder="8 000–10 000"
            aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
            aria-invalid={invalid}
            onChange={(event) => answer('capacity', event.target.value)}
          />
          <span aria-hidden="true">тонн</span>
        </div>
        <button type="button" className="planner-toggle" aria-pressed={unknownCapacity} onClick={() => answer('capacity', unknownCapacity ? '' : 'unknown')}>
          {unknownCapacity ? <Check aria-hidden="true" /> : <CircleHelp aria-hidden="true" />} Ще не визначили
        </button>
        {invalid && <p id={errorId} className="planner-field-error">Введіть додатне ціле значення або діапазон, наприклад 8 000–10 000.</p>}
      </div>
      {answers.crops.length > 0 && (
        <Clarifier label="Окреме рішення про партії" title="Чи потрібно зберігати партії окремо?">
          <p className="planner-clarifier-copy">Навіть одна культура може мати окремі партії за якістю, власником або періодом приймання.</p>
          <ChoiceGroup legend="Чи потрібно зберігати партії окремо?" value={answers.separation} options={separationOptions} onChange={(value) => answer('separation', value)} />
        </Clarifier>
      )}
    </>
  );
}
