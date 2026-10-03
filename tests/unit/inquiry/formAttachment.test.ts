import { describe, expect, it } from 'vitest';
import { dimensionsFieldView, isSentAttachment, sentAttachmentKey } from '../../../app/components/inquiry/formAttachment';
import type { InquiryAttachment } from '../../../app/lib/inquiry/attachment';

// How the inquiry form treats what is attached (sweep 03.10, 04.10): a brief sent with a saved lead counts as sent until
// it changes, and the visitor's own «Орієнтовні розміри» are never replaced by a brief's sizes without a word.

const SIZES = '30 × 60 × 8 м';

function brief(overrides: Partial<InquiryAttachment> = {}): InquiryAttachment {
  return {
    kind: 'hangar-configuration',
    version: 'hangar-configurator@1.3.0',
    title: 'До заявки додано вашу конфігурацію',
    headline: `${SIZES} · Холодний`,
    sections: [],
    text: `Вибрана конфігурація:\nГабарити: ${SIZES}`,
    editHref: '#configurator',
    dimensionsField: { mode: 'fixed', value: SIZES },
    ...overrides,
  };
}

describe('sent brief', () => {
  it('is the brief a saved lead carried, while it is unchanged', () => {
    const sent = sentAttachmentKey(brief());
    expect(isSentAttachment(brief(), sent)).toBe(true);
    // a new object with the same content is the same brief
    expect(isSentAttachment({ ...brief(), sections: [{ id: 'x', heading: 'x', rows: [] }] }, sent)).toBe(true);
  });

  it('is a new brief once the configuration changes its text, its version or its kind', () => {
    const sent = sentAttachmentKey(brief());
    expect(isSentAttachment(brief({ text: 'Вибрана конфігурація:\nГабарити: 30 × 72 × 8 м' }), sent)).toBe(false);
    expect(isSentAttachment(brief({ version: 'hangar-configurator@1.4.0' }), sent)).toBe(false);
    expect(isSentAttachment(brief({ kind: 'grain-brief' }), sent)).toBe(false);
  });

  it('is nothing without an attachment or before any lead was saved', () => {
    expect(isSentAttachment(null, sentAttachmentKey(brief()))).toBe(false);
    expect(isSentAttachment(brief(), null)).toBe(false);
  });
});

describe('«Орієнтовні розміри» beside an attached brief', () => {
  it('is the plain field with nothing attached, or with a brief that leaves the sizes to the form', () => {
    const manual = { input: true, inputNamed: true, fixedValue: null, note: null };
    expect(dimensionsFieldView(null, '', false, false)).toEqual(manual);
    expect(dimensionsFieldView({ mode: 'manual' }, '18 × 36 × 6 м', true, false)).toEqual(manual);
  });

  it('gives way to a brief with sizes of its own while the visitor has typed nothing', () => {
    expect(dimensionsFieldView({ mode: 'fixed', value: SIZES }, '', false, false))
      .toEqual({ input: false, inputNamed: false, fixedValue: SIZES, note: null });
  });

  it('keeps what the visitor typed, sends it, and shows the brief\'s sizes beside it', () => {
    expect(dimensionsFieldView({ mode: 'fixed', value: SIZES }, '18 × 36 × 6 м', true, false))
      .toEqual({ input: true, inputNamed: true, fixedValue: null, note: `У конфігурації, доданій до заявки: ${SIZES}.` });
  });

  it('stays on screen when the visitor empties it, and the brief\'s sizes fill the lead again', () => {
    expect(dimensionsFieldView({ mode: 'fixed', value: SIZES }, '  ', true, false))
      .toEqual({ input: true, inputNamed: false, fixedValue: SIZES, note: `У конфігурації, доданій до заявки: ${SIZES}.` });
  });

  it('does not send a sent brief\'s sizes again: the field is the visitor\'s', () => {
    expect(dimensionsFieldView({ mode: 'fixed', value: SIZES }, '', false, true))
      .toEqual({ input: true, inputNamed: true, fixedValue: null, note: null });
  });

  it('beside a brief without sizes (the grain brief) shows only what the visitor already typed', () => {
    expect(dimensionsFieldView({ mode: 'omit' }, '', false, false)).toEqual({ input: false, inputNamed: false, fixedValue: null, note: null });
    expect(dimensionsFieldView({ mode: 'omit' }, '18 × 36 × 6 м', true, false)).toEqual({ input: true, inputNamed: true, fixedValue: null, note: null });
    expect(dimensionsFieldView({ mode: 'omit' }, '', false, true)).toEqual({ input: false, inputNamed: false, fixedValue: null, note: null });
  });
});
