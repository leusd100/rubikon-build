/**
 * The data behind the conceptual process diagram in the live-understanding panel.
 *
 * Extracted from the prototype's ProcessDiagram (app/planner.tsx, `819f163`): every label and
 * condition is unchanged, but geometry (node widths, coordinates, viewBox) stays in the component
 * that draws it. This module says only *what* the diagram shows.
 */
import { formatCapacityInfo, parseCapacity, type Answers } from './answers';

const diagramOperation: Record<string, string> = { seasonal: 'сезонно', regular: 'регулярно', high: 'інтенсивно' };

export type GrainDiagramNode = { title: string; sub?: string; active: boolean };

export type GrainDiagramModel = {
  /** «ДІЛЯНКА · КОМПАКТНА» */
  siteCaption: string;
  /** Receiving, then each confirmed preparation step (or one unknown one). */
  row: GrainDiagramNode[];
  /** «ЗБЕРІГАННЯ ≈8 000 т» */
  storageLabel: string;
  /** Storage zones А…Д; empty means the component draws the unknown mark instead. */
  zoneLetters: string[];
  shipping: GrainDiagramNode;
  phases: { kind: 'second' | 'unknown'; label: string }[];
};

export function grainDiagramModel(answers: Answers): GrainDiagramModel {
  const capacityLabel = formatCapacityInfo(parseCapacity(answers.capacity));
  const process = answers.processing;
  const zones = answers.separation === 'required' ? Math.min(5, Math.max(2, answers.crops.length)) : answers.separation === 'shared' ? 1 : 0;
  const steps = process === 'both' ? ['ОЧИЩЕННЯ', 'СУШІННЯ'] : process === 'cleaning' ? ['ОЧИЩЕННЯ'] : process === 'drying' ? ['СУШІННЯ'] : [];
  const row = [
    { title: 'ПРИЙМАННЯ', sub: answers.operation ? (diagramOperation[answers.operation] ?? '?') : '?', active: false },
    ...steps.map((step) => ({ title: step, sub: 'підтверджено', active: true })),
    ...(process === 'unknown' ? [{ title: 'ПІДГОТОВКА', sub: '?', active: false }] : []),
  ];
  const siteContext = answers.sitePressure === 'compact' ? 'КОМПАКТНА' : answers.sitePressure === 'space' ? 'Є ЗАПАС ПЛОЩІ' : '?';
  const zoneLetters = ['А', 'Б', 'В', 'Г', 'Д'];
  const diagramCapacity = capacityLabel.startsWith('≈') ? capacityLabel.replace('≈ ', '≈') : '?';

  return {
    siteCaption: `ДІЛЯНКА · ${siteContext}`,
    row,
    storageLabel: `ЗБЕРІГАННЯ ${diagramCapacity}`,
    zoneLetters: answers.crops.length && zones > 0 ? zoneLetters.slice(0, zones) : [],
    shipping: { title: 'ВІДВАНТ.', active: false },
    // Independent conditions, as in the prototype: the UI never selects both, but the model does
    // not assume that.
    phases: [
      ...(answers.development.includes('physical') ? [{ kind: 'second' as const, label: '+ ДРУГА ЧЕРГА' }] : []),
      ...(answers.development.includes('unknown') ? [{ kind: 'unknown' as const, label: 'ДРУГА ЧЕРГА ?' }] : []),
    ],
  };
}
