'use client';

import { handlingOptions, operationOptions } from '../../../lib/planner/grain';
import { ChoiceGroup } from '../../planner/ChoiceGroup';
import { Clarifier } from '../../planner/Clarifier';
import type { GrainQuestionProps } from './types';

export function OperationQuestion({ answers, answer }: GrainQuestionProps) {
  const showHandling = answers.operation === 'high' || Boolean(answers.handling);

  return (
    <>
      <ChoiceGroup legend="Як зерно переважно проходитиме через об’єкт?" value={answers.operation} options={operationOptions} onChange={(value) => answer('operation', value)} />
      {showHandling && (
        <Clarifier label="Поточний стан / перша черга" title="Як плануєте переміщувати зерно всередині комплексу?">
          <ChoiceGroup legend="Як плануєте переміщувати зерно всередині комплексу?" value={answers.handling} options={handlingOptions} onChange={(value) => answer('handling', value)} />
        </Clarifier>
      )}
    </>
  );
}
