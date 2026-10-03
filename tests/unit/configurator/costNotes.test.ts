import { describe, expect, it } from 'vitest';
import { costFactorNotes } from '../../../app/lib/configurator/costNotes';
import { deriveDomainModel } from '../../../app/lib/configurator/domainModel';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

const plain = (text: string | undefined) => text?.replaceAll(' ', ' ');

function notesFor(overrides: Partial<ConfiguratorState>) {
  const notes = costFactorNotes(deriveDomainModel({ ...DEFAULT_CONFIGURATOR_STATE, ...overrides }));
  return {
    dimensions: plain(notes.dimensions),
    structure: notes.structure,
    insulation: notes.insulation,
    technology: plain(notes.technology),
  };
}

describe('/angary cost factor notes (04.10)', () => {
  it('say what the configuration holds without crediting the visitor with defaults', () => {
    // «Ви вказали: холодний, профнастил» after only the width changed — a contour and a cladding nobody had chosen
    const notes = notesFor({ dimensions: { width: 30, length: 60, height: 7.5 } });
    expect(notes.dimensions).toBe('У вашій конфігурації: 30 × 60 × 7,5 м, коник 10,5 м · ухил ≈ 11°');
    expect(notes.structure).toBe('У попередній схемі: металева ферма · центральний ряд опор');
    expect(notes.insulation).toBe('У вашій конфігурації: холодний контур, профнастил');
    expect(notes.technology).toBe('Ворота: одні стандартні, 4 × 4 м');
    expect(Object.values(notes).join(' ')).not.toContain('Ви вказали');
  });

  it('name an insulated or undecided contour, and walls and roof of different systems one by one', () => {
    expect(notesFor({ envelope: 'insulated', wallSystem: 'sandwich-panel', roofSystem: 'sandwich-panel' }).insulation)
      .toBe('У вашій конфігурації: утеплений контур, сендвіч-панель');
    expect(notesFor({ envelope: 'undecided' }).insulation).toBe('У вашій конфігурації: контур ще не визначено, профнастил');
    // it read «Ви вказали: індивідуальна конфігурація, стіни: профнастил, покрівля: сендвіч-панель»
    expect(notesFor({ envelope: 'insulated', wallSystem: 'profiled-sheet', roofSystem: 'sandwich-panel' }).insulation)
      .toBe('У вашій конфігурації: стіни — профнастил, покрівля — сендвіч-панель');
    expect(notesFor({ scope: ['frame', 'walls'] }).insulation).toBe('У вашій конфігурації: холодний контур, стіни: профнастил');
  });

  it('say walls and roof are outside the request rather than «холодний, поза обсягом заявки»', () => {
    const notes = notesFor({ scope: ['foundation', 'frame'] });
    expect(notes.insulation).toBe('Стіни й покрівля поза обсягом заявки');
    // no walls, no openings in the request: no gate note
    expect(notes.technology).toBeUndefined();
  });

  it('count the gates, or say there are none', () => {
    expect(notesFor({ gates: 2, gateType: 'double' }).technology).toBe('Ворота: двоє для заїзду техніки, 5 × 5 м');
    expect(notesFor({ gates: 0 }).technology).toBe('Без воріт');
  });
});
