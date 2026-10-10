import { describe, expect, it } from 'vitest';
import { costFactorNotes } from '../../../app/lib/configurator/costNotes';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

const plain = (text: string | undefined) => text?.replaceAll('\u00A0', ' ');

function notesFor(overrides: Partial<ConfiguratorState>) {
  const notes = costFactorNotes(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides }));
  if (!notes) return undefined;
  return {
    dimensions: plain(notes.dimensions),
    structure: notes.structure,
    insulation: notes.insulation,
    technology: plain(notes.technology),
  };
}

// «ферма», «колон» (10.10, audit F37)
const STRUCTURE = 'У попередній схемі: ферма · центральний ряд колон';

// 08.10, after the audit: a note only for what the visitor answered. The example's values say nothing about the cost.
describe('/angary cost factor notes (04.10; answered only 08.10)', () => {
  it('say nothing while the drawing is the untouched example', () => {
    expect(notesFor({})).toBeUndefined();
  });

  it('name the sizes the visitor set, and nothing they did not touch', () => {
    // «Ви вказали: холодний, профнастил» after only the width changed — a contour and a cladding nobody had chosen
    expect(notesFor({ dimensions: { width: 30, length: 60, height: 7.5 } })).toEqual({
      dimensions: 'У вашій конфігурації: 30 × 60 × 7,5 м, коник 10,5 м · ухил ≈ 11°',
      structure: STRUCTURE,
      insulation: undefined,
      technology: undefined,
    });
  });

  it('call sizes not known yet an orientation', () => {
    expect(notesFor({ sizesUnknown: true })?.dimensions).toBe('Орієнтовно: 24 × 60 × 8 м — розміри уточнюємо');
  });

  it('name the insulation and cladding once answered, in the stamp’s words', () => {
    expect(notesFor({ envelope: 'insulated', wallSystem: 'sandwich-panel', roofSystem: 'sandwich-panel' })?.insulation)
      .toBe('У вашій конфігурації: утеплений, сендвіч-панель');
    expect(notesFor({ envelope: 'undecided' })?.insulation).toBe('У вашій конфігурації: уточнимо, профнастил');
    // the example's own answer, chosen again, is an answer (07.10): «без утеплення», never the retired «холодний контур»
    expect(notesFor({ confirmed: ['envelope'] })?.insulation).toBe('У вашій конфігурації: без утеплення, профнастил');
    // walls and roof of different systems one by one, in lower case mid-sentence
    expect(notesFor({ envelope: 'insulated', wallSystem: 'profiled-sheet', roofSystem: 'sandwich-panel' })?.insulation)
      .toBe('У вашій конфігурації: утеплений, стіни: профнастил, покрівля: сендвіч-панель');
    expect(notesFor({ scopeMode: 'partial', scope: ['frame', 'walls'], envelope: 'insulated' })?.insulation)
      .toBe('У вашій конфігурації: утеплений, стіни: профнастил');
  });

  it('say walls and roof are outside the request rather than «холодний, поза обсягом заявки»', () => {
    const notes = notesFor({ scopeMode: 'partial', scope: ['foundation', 'frame'] });
    expect(notes?.insulation).toBe('Стіни й покрівля поза обсягом робіт');
    // no walls, no openings in the request: no gate note
    expect(notes?.technology).toBeUndefined();
  });

  it('count the gates the visitor asked for, or say there are none', () => {
    expect(notesFor({ gates: 2, gateType: 'double' })?.technology).toBe('Ворота: двоє для заїзду техніки, 5 × 5 м');
    expect(notesFor({ gates: 0 })?.technology).toBe('Без воріт');
    // held by the width: what was asked and what the scheme draws, as the stamp says it (09.10)
    expect(notesFor({ gates: 2, gateType: 'double', dimensions: { width: 12, length: 60, height: 8 } })?.technology)
      .toBe('Ворота: двоє для заїзду техніки, 5 × 5 м — за ширини 12 м у схемі вміщуються лише одні');
  });
});
