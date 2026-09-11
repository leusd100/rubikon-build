'use client';

import { siteOptions, sitePressureOptions } from '../../../lib/planner/grain';
import { ChoiceGroup } from '../../planner/ChoiceGroup';
import { Clarifier } from '../../planner/Clarifier';
import type { GrainQuestionProps } from './types';

export function SiteQuestion({ answers, answer }: GrainQuestionProps) {
  const siteKnown = Boolean(answers.site);
  const existingContext = Boolean(answers.site && !['greenfield', 'unknown'].includes(answers.site));
  const pressureTitle = existingContext ? 'Наскільки жорстко рішення обмежене наявним простором?' : 'Чи є суттєве обмеження по площі?';

  return (
    <>
      <ChoiceGroup legend="Що вже є на майданчику?" value={answers.site} options={siteOptions} columns={2} onChange={(value) => answer('site', value)} />
      {siteKnown && (
        <Clarifier label="Контекст майданчика" title={pressureTitle}>
          <ChoiceGroup legend={pressureTitle} value={answers.sitePressure} options={sitePressureOptions(existingContext)} onChange={(value) => answer('sitePressure', value)} />
        </Clarifier>
      )}
    </>
  );
}
