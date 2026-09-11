'use client';

import { developmentOptions, handlingOptions, requiresFutureHandling } from '../../../lib/planner/grain';
import { CheckOptionGrid } from '../../planner/CheckOptionGrid';
import { ChoiceGroup } from '../../planner/ChoiceGroup';
import { Clarifier } from '../../planner/Clarifier';
import type { GrainQuestionProps } from './types';

export function DevelopmentQuestion({ answers, answer }: GrainQuestionProps) {
  // Verbatim toggle rules from the prototype: «none» and «unknown» are exclusive of everything else.
  function toggle(value: string) {
    let next = [...answers.development];
    if (['none', 'unknown'].includes(value)) next = next.includes(value) ? [] : [value];
    else next = next.includes(value) ? next.filter((item) => item !== value) : [...next.filter((item) => !['none', 'unknown'].includes(item)), value];
    answer('development', next);
  }
  const showFutureHandling = requiresFutureHandling(answers) || Boolean(answers.futureHandling);

  return (
    <>
      <CheckOptionGrid
        legend="Що може знадобитися після запуску першої черги?"
        variant="cards"
        options={developmentOptions.map(([value, title, description]) => ({ value, title, description }))}
        selected={answers.development}
        onToggle={toggle}
      />
      {showFutureHandling && (
        <Clarifier label="Майбутня фаза" title="Як у майбутньому планується переміщувати зерно?">
          <p className="planner-clarifier-copy">Це окрема відповідь про майбутнє; вона не замінює механізацію першої черги.</p>
          <ChoiceGroup legend="Як у майбутньому планується переміщувати зерно?" value={answers.futureHandling} options={handlingOptions} onChange={(value) => answer('futureHandling', value)} />
        </Clarifier>
      )}
      {answers.sitePressure === 'compact' && answers.development.includes('physical') && (
        <div className="planner-inline-tension">
          <p>Виявлено важливий компроміс</p>
          <b>Компактний майданчик <i aria-hidden="true">↔</i><span className="planner-sr-only">і</span> фізичне розширення</b>
          <span>Потребу в розширенні підтверджено, але наявність реального резерву території ще потрібно перевірити.</span>
        </div>
      )}
    </>
  );
}
