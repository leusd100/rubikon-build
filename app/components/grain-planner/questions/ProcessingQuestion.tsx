'use client';

import { handlingOptions, hasActiveProcessing, processingOptions, shouldAskHandlingInProcessing, uiLabels } from '../../../lib/planner/grain';
import { ChoiceGroup } from '../../planner/ChoiceGroup';
import { Clarifier } from '../../planner/Clarifier';
import type { GrainQuestionProps } from './types';

export function ProcessingQuestion({ answers, answer }: GrainQuestionProps) {
  const askHandling = shouldAskHandlingInProcessing(answers);
  const knownHandling = hasActiveProcessing(answers.processing) && Boolean(answers.handling);

  return (
    <>
      <ChoiceGroup legend="Чи потрібна підготовка зерна перед зберіганням?" value={answers.processing} options={processingOptions} onChange={(value) => answer('processing', value)} />
      {knownHandling && (
        <p className="planner-context">
          {answers.handling === 'unknown'
            ? <>Спосіб переміщення з кроку «Робота об’єкта» ще не визначено — він лишиться уточненням.</>
            : <>Переміщення враховано з кроку «Робота об’єкта»: <b>{uiLabels[answers.handling ?? '']}</b>. Змінити можна в тій темі.</>}
        </p>
      )}
      {askHandling && (
        <Clarifier label="Ще одне коротке уточнення" title="Як зерно рухатиметься між прийманням, підготовкою та зберіганням?">
          <p className="planner-clarifier-copy">Через підготовку спосіб переміщення став важливим для порівняння.</p>
          <ChoiceGroup legend="Як зерно рухатиметься між прийманням, підготовкою та зберіганням?" value={answers.handling} options={handlingOptions} onChange={(value) => answer('handling', value)} />
        </Clarifier>
      )}
    </>
  );
}
