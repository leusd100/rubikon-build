import { describe, expect, it } from 'vitest';
import { sameBusinessConfiguration } from '../../../app/lib/configurator/attachmentContract';
import { deriveDomainModel, sizeStatuses } from '../../../app/lib/configurator/domainModel';
import { readConfiguration } from '../../../app/lib/configurator/draft';
import { createHangarAttachment } from '../../../app/lib/configurator/hangarAttachment';
import {
  createHangarInquiryBrief,
  createHangarInquiryBriefSections,
  formatHangarInquiryBrief,
} from '../../../app/lib/configurator/inquiryBrief';
import { INQUIRY_ATTACHMENT_TEXT_LIMIT } from '../../../app/lib/inquiry/attachment';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../../app/lib/configurator/types';

// Phase 4 (12.10; R-UX-06 §06 п. 4, §14 п. 9): each size says where it comes from. The sizes were one group, so changing
// the width alone sent the example's length and wall height, and a ridge nobody set, as «Вибрана конфігурація».

const plain = (text: string) => text.replaceAll(' ', ' ');
const rowsOf = (state: ConfiguratorState) => {
  const sections = createHangarInquiryBriefSections(createHangarInquiryBrief(deriveDomainModel(state)));
  const pairs = (rows: { label: string; value: string }[]) => rows.map((row) => `${row.label}: ${plain(row.value)}`);
  return { selected: pairs(sections.selected), defaults: pairs(sections.defaults), preliminary: pairs(sections.preliminary) };
};

/** As the controls set a size: its value, the group answered, the size itself answered */
function setSize(state: ConfiguratorState, key: 'width' | 'length' | 'height', value: number): ConfiguratorState {
  return {
    ...state,
    dimensions: { ...state.dimensions, [key]: value },
    confirmed: state.confirmed.includes('dimensions') ? state.confirmed : [...state.confirmed, 'dimensions'],
    sizesAnswered: state.sizesAnswered.includes(key) ? state.sizesAnswered : [...state.sizesAnswered, key],
  };
}

const WIDTH_ONLY = setSize(DEFAULT_CONFIGURATOR_STATE, 'width', 30);

describe('each size by where it comes from', () => {
  it('the width set alone: the length and the wall height stay the example’s, the ridge follows the width', () => {
    expect(sizeStatuses(WIDTH_ONLY)).toEqual({ width: 'own', length: 'example', height: 'example', ridge: 'derived' });
  });

  it('the length set alone leaves the ridge the example’s: the slope and the wall height did not move', () => {
    expect(sizeStatuses(setSize(DEFAULT_CONFIGURATOR_STATE, 'length', 72)).ridge).toBe('example');
  });

  it('a size typed again at the example’s value is the visitor’s answer', () => {
    expect(sizeStatuses(setSize(DEFAULT_CONFIGURATOR_STATE, 'width', 24)).width).toBe('own');
  });

  it('a ridge the visitor set is theirs', () => {
    expect(sizeStatuses({ ...DEFAULT_CONFIGURATOR_STATE, ridgeEdited: true }).ridge).toBe('own');
  });

  it('a size that differs from the example is the visitor’s even without the record (a state from elsewhere)', () => {
    expect(sizeStatuses({ ...DEFAULT_CONFIGURATOR_STATE, dimensions: { width: 24, length: 60, height: 9 } }).height).toBe('own');
  });
});

describe('the lead’s rows for the sizes', () => {
  it('the width set alone: «Ширина» is chosen, the rest is the example’s, the ridge is preliminary', () => {
    const rows = rowsOf(WIDTH_ONLY);
    expect(rows.selected).toEqual(['Ширина: 30 м']);
    expect(rows.defaults.slice(0, 2)).toEqual(['Довжина: 60 м', 'Висота стін: 8 м']);
    // pitch(30 m) = 11.2° → 8 + 15 · tan 11.2° = 10.97 → 11 m
    expect(rows.preliminary[0]).toBe('Висота в конику: 11 м · ухил ≈ 11° — підібраний за шириною');
    expect([...rows.selected, ...rows.defaults].some((row) => row.startsWith('Габарити'))).toBe(false);
  });

  it('all three set: one «Габарити» row, as before, and the ridge nobody set is preliminary', () => {
    const state = setSize(setSize(WIDTH_ONLY, 'length', 40), 'height', 6);
    const rows = rowsOf(state);
    expect(rows.selected).toEqual(['Габарити: 30 × 40 × 6 м']);
    expect(rows.defaults.some((row) => row.startsWith('Висота в конику'))).toBe(false);
    expect(rows.preliminary[0]).toMatch(/^Висота в конику: .* — підібраний за шириною$/);
  });

  it('nothing set: the example’s «Габарити» and ridge, as before', () => {
    const rows = rowsOf(DEFAULT_CONFIGURATOR_STATE);
    expect(rows.selected).toEqual([]);
    expect(rows.defaults.slice(0, 2)).toEqual(['Габарити: 24 × 60 × 8 м', 'Висота в конику: 10,6 м · ухил ≈ 12°']);
  });

  it('the ridge set alone is chosen, the sizes stay the example’s', () => {
    const rows = rowsOf({ ...DEFAULT_CONFIGURATOR_STATE, ridgeHeightM: 12, ridgeEdited: true, confirmed: ['dimensions'] });
    expect(rows.selected).toEqual(['Висота в конику: 12 м · ухил ≈ 18°']);
    expect(rows.defaults[0]).toBe('Габарити: 24 × 60 × 8 м');
  });

  it('«Точних розмірів ще немає» with the width set: the width is the visitor’s orientation, the rest the example’s', () => {
    const rows = rowsOf({ ...WIDTH_ONLY, sizesUnknown: true });
    expect(rows.selected).toEqual(['Габарити: Ще уточнюються', 'Ширина: орієнтир клієнта 30 м']);
    expect(rows.defaults.slice(0, 2)).toEqual(['Довжина: 60 м', 'Висота стін: 8 м']);
  });

  it('«Точних розмірів ще немає» with all three set keeps its one row', () => {
    const state = { ...setSize(setSize(WIDTH_ONLY, 'length', 40), 'height', 6), sizesUnknown: true };
    expect(rowsOf(state).selected[0]).toBe('Габарити: Ще уточнюються · орієнтир клієнта 30 × 40 × 6 м');
  });

  it('every row label is unique within its part: the card keys its rows by label', () => {
    for (const state of [WIDTH_ONLY, { ...WIDTH_ONLY, sizesUnknown: true }, DEFAULT_CONFIGURATOR_STATE]) {
      const sections = createHangarInquiryBriefSections(createHangarInquiryBrief(deriveDomainModel(state)));
      for (const rows of Object.values(sections)) {
        const labels = rows.map((row) => row.label);
        expect(new Set(labels).size).toBe(labels.length);
      }
    }
  });
});

describe('the attachment', () => {
  it('the card’s line still reads the drawn sizes, and the lead’s «Габарити» field is not claimed for a partial answer', () => {
    const attachment = createHangarAttachment(WIDTH_ONLY);
    expect(plain(attachment.headline)).toBe('30 × 60 × 8 м');
    expect(attachment.dimensionsField).toEqual({ mode: 'manual' });
  });

  it('all three sizes the visitor’s: the lead’s «Габарити» field is theirs', () => {
    const attachment = createHangarAttachment(setSize(setSize(WIDTH_ONLY, 'length', 40), 'height', 6));
    expect(attachment.dimensionsField).toEqual({ mode: 'fixed', value: '30 × 40 × 6 м' });
  });

  it('the longest brief still fits the lead’s text limit', () => {
    const longest: ConfiguratorState = {
      ...setSize(setSize(DEFAULT_CONFIGURATOR_STATE, 'width', 13), 'height', 14.5),
      sizesUnknown: true,
      ridgeEdited: false,
      envelope: 'insulated',
      wallSystem: 'sandwich-panel',
      roofSystem: 'profiled-sheet',
      gates: 2,
      gateType: 'double',
      doors: 1,
      scopeMode: 'partial',
      scope: ['foundation', 'frame', 'walls', 'roof'],
      internalSupports: 'not-allowed',
      confirmed: ['dimensions', 'envelope', 'cladding', 'openings', 'scope'],
      objectProfile: { purpose: 'coldStore', project: 'inProgress', region: 'Дніпропетровська область', lifting: 'craneOrHoist', temperature: 'frozen' },
    };
    const text = formatHangarInquiryBrief(createHangarInquiryBrief(deriveDomainModel(longest)));
    expect(text.length).toBeLessThanOrEqual(INQUIRY_ATTACHMENT_TEXT_LIMIT);
  });
});

describe('the record of the sizes set', () => {
  it('is part of the business configuration: a size typed again at its value is a new answer', () => {
    expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, { ...DEFAULT_CONFIGURATOR_STATE, sizesAnswered: ['width'] })).toBe(false);
  });

  it('is read back from a draft', () => {
    expect(readConfiguration({ ...WIDTH_ONLY }).sizesAnswered).toEqual(['width']);
  });

  it('a draft from before it: the changed sizes are the visitor’s', () => {
    expect(readConfiguration({ ...WIDTH_ONLY, sizesAnswered: undefined }).sizesAnswered).toEqual(['width']);
  });

  it('a draft from before it with the sizes answered at the example’s values keeps all three answered', () => {
    expect(readConfiguration({ ...DEFAULT_CONFIGURATOR_STATE, sizesAnswered: undefined, confirmed: ['dimensions'] }).sizesAnswered)
      .toEqual(['width', 'length', 'height']);
  });

  it('a draft from before it where only the ridge was set keeps the three sizes the example’s', () => {
    expect(readConfiguration({ ...DEFAULT_CONFIGURATOR_STATE, sizesAnswered: undefined, confirmed: ['dimensions'], ridgeEdited: true, ridgeHeightM: 12 }).sizesAnswered)
      .toEqual([]);
  });
});
