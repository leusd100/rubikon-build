import { describe, expect, it } from 'vitest';
import {
  GENERIC_ATTACHMENT_TELEGRAM_LABEL,
  INITIAL_ATTACHMENT_STATUS,
  INQUIRY_ATTACHMENT_DATA_LIMIT,
  INQUIRY_ATTACHMENT_KINDS,
  INQUIRY_ATTACHMENT_LABELS,
  isInquiryAttachmentKind,
  parseLeadAttachment,
  toInquiryAttachmentPayload,
  transitionAttachment,
  type AttachmentEvent,
  type AttachmentStatus,
  type InquiryAttachment,
} from '../../../app/lib/inquiry/attachment';

const untouched: AttachmentStatus = { status: 'untouched', reason: null };
const byEdit: AttachmentStatus = { status: 'attached', reason: 'business-edit' };
const byAction: AttachmentStatus = { status: 'attached', reason: 'explicit-action' };
const byReveal: AttachmentStatus = { status: 'attached', reason: 'result-reveal' };
const detached: AttachmentStatus = { status: 'detached', reason: 'explicit-detach' };
const statuses = { untouched, byEdit, byAction, byReveal, detached };

const events: Record<AttachmentEvent['type'], AttachmentEvent> = {
  'business-edit': { type: 'business-edit' },
  'explicit-attach': { type: 'explicit-attach' },
  'explicit-detach': { type: 'explicit-detach' },
  'presentation-only': { type: 'presentation-only' },
  'result-reveal': { type: 'result-reveal' },
  reset: { type: 'reset' },
};

// Every status × every event. `'same'` means the very same object comes back.
const table: Record<keyof typeof statuses, Record<AttachmentEvent['type'], AttachmentStatus | 'same'>> = {
  untouched: { 'business-edit': byEdit, 'explicit-attach': byAction, 'explicit-detach': detached, 'presentation-only': 'same', 'result-reveal': byReveal, reset: untouched },
  byEdit: { 'business-edit': byEdit, 'explicit-attach': byAction, 'explicit-detach': detached, 'presentation-only': 'same', 'result-reveal': 'same', reset: untouched },
  byAction: { 'business-edit': byEdit, 'explicit-attach': byAction, 'explicit-detach': detached, 'presentation-only': 'same', 'result-reveal': 'same', reset: untouched },
  byReveal: { 'business-edit': byEdit, 'explicit-attach': byAction, 'explicit-detach': detached, 'presentation-only': 'same', 'result-reveal': 'same', reset: untouched },
  detached: { 'business-edit': byEdit, 'explicit-attach': byAction, 'explicit-detach': detached, 'presentation-only': 'same', 'result-reveal': 'same', reset: untouched },
};

/** The configurator's transition as it was before the shared contract (attachmentContract.ts @ f28dc47). */
function hangarTransitionBeforePhase3(current: AttachmentStatus, event: AttachmentEvent): AttachmentStatus {
  switch (event.type) {
    case 'business-edit': return { status: 'attached', reason: 'business-edit' };
    case 'explicit-attach': return { status: 'attached', reason: 'explicit-action' };
    case 'explicit-detach': return { status: 'detached', reason: 'explicit-detach' };
    default: return current;
  }
}

describe('transitionAttachment', () => {
  for (const [statusName, row] of Object.entries(table)) {
    for (const [eventType, expected] of Object.entries(row)) {
      it(`${statusName} + ${eventType}`, () => {
        const current = statuses[statusName as keyof typeof statuses];
        const next = transitionAttachment(current, events[eventType as AttachmentEvent['type']]);
        if (expected === 'same') expect(next).toBe(current);
        else expect(next).toEqual(expected);
      });
    }
  }

  it('gives the four hangar events exactly the pre-Phase-3 configurator transitions', () => {
    const hangarEvents = ['business-edit', 'explicit-attach', 'explicit-detach', 'presentation-only'] as const;
    for (const current of [untouched, byEdit, byAction, detached]) {
      for (const type of hangarEvents) {
        const next = transitionAttachment(current, events[type]);
        const before = hangarTransitionBeforePhase3(current, events[type]);
        expect(next).toEqual(before);
        if (type === 'presentation-only') expect(next).toBe(current);
      }
    }
  });

  it('starts untouched, and a reset always returns there', () => {
    expect(INITIAL_ATTACHMENT_STATUS).toEqual(untouched);
    expect(transitionAttachment(detached, events.reset)).toBe(INITIAL_ATTACHMENT_STATUS);
  });
});

describe('labels and payload', () => {
  it('has a form, Telegram, edit and review label for every kind', () => {
    for (const kind of INQUIRY_ATTACHMENT_KINDS) {
      const labels = INQUIRY_ATTACHMENT_LABELS[kind];
      expect(Object.values(labels).every((label) => label.length > 0)).toBe(true);
    }
    expect(INQUIRY_ATTACHMENT_LABELS['hangar-configuration'].telegram).toBe('Конфігурація ангара');
    expect(INQUIRY_ATTACHMENT_LABELS['grain-brief'].telegram).toBe('Опис задачі — зерносховище');
    expect(INQUIRY_ATTACHMENT_LABELS['grain-brief'].form).toBe('До заявки додано ваш опис задачі');
  });

  it('recognises only the known kinds', () => {
    expect(isInquiryAttachmentKind('grain-brief')).toBe(true);
    expect(isInquiryAttachmentKind('hangar-configuration')).toBe(true);
    expect(isInquiryAttachmentKind('roof-brief')).toBe(false);
    expect(isInquiryAttachmentKind(1)).toBe(false);
  });

  it('sends kind, version and data — and no data key when there is none', () => {
    const base: InquiryAttachment = {
      kind: 'hangar-configuration',
      version: 'hangar-configurator@1.0.0',
      title: 'До заявки додано вашу конфігурацію',
      headline: '24 × 60 × 8 м · Холодний',
      sections: [],
      text: 'Вибрана конфігурація:',
      editHref: '#configurator',
      dimensionsField: { mode: 'fixed', value: '24 × 60 × 8 м' },
    };
    expect(toInquiryAttachmentPayload(base)).toEqual({ kind: 'hangar-configuration', version: 'hangar-configurator@1.0.0' });
    expect('data' in toInquiryAttachmentPayload(base)).toBe(false);
    const data = { schema: 'x', version: 1 };
    expect(toInquiryAttachmentPayload({ ...base, data })).toEqual({ kind: 'hangar-configuration', version: 'hangar-configurator@1.0.0', data });
  });
});

describe('parseLeadAttachment', () => {
  const validators = { 'grain-brief': (data: unknown) => typeof data === 'object' && data !== null && (data as { ok?: unknown }).ok === true };

  it('has nothing to parse without text', () => {
    expect(parseLeadAttachment({ kind: 'grain-brief', data: { ok: true } }, '', validators)).toBeNull();
    expect(parseLeadAttachment(undefined, '', validators)).toBeNull();
  });

  it('reads text without a kind as a legacy hangar configuration', () => {
    for (const raw of [undefined, null, {}, { kind: '' }, { kind: null }, 'garbage']) {
      expect(parseLeadAttachment(raw, 'Габарити: 24 × 60 × 8 м', validators)).toEqual({
        kind: 'hangar-configuration',
        version: '',
        telegramLabel: 'Конфігурація ангара',
      });
    }
  });

  it('keeps the text of an unknown kind under the generic label and drops its metadata', () => {
    expect(parseLeadAttachment({ kind: 'roof-brief', version: 'roof@1' }, 'text', validators)).toEqual({
      kind: null,
      version: '',
      telegramLabel: GENERIC_ATTACHMENT_TELEGRAM_LABEL,
    });
    expect(parseLeadAttachment({ kind: 42, data: { ok: true } }, 'text', validators)).toEqual({
      kind: null,
      version: '',
      telegramLabel: GENERIC_ATTACHMENT_TELEGRAM_LABEL,
      dataDropped: 'unknown-kind',
    });
  });

  it('keeps valid data, clips the version and labels by kind', () => {
    expect(parseLeadAttachment({ kind: 'grain-brief', version: `  ${'v'.repeat(80)}  `, data: { ok: true } }, 'text', validators)).toEqual({
      kind: 'grain-brief',
      version: 'v'.repeat(60),
      data: { ok: true },
      telegramLabel: 'Опис задачі — зерносховище',
    });
  });

  it('drops invalid data, data of a kind without a schema, and data over the limit — never the attachment', () => {
    expect(parseLeadAttachment({ kind: 'grain-brief', version: 'g@1', data: { ok: false } }, 'text', validators))
      .toMatchObject({ kind: 'grain-brief', version: 'g@1', dataDropped: 'invalid' });
    expect(parseLeadAttachment({ kind: 'hangar-configuration', data: { ok: true } }, 'text', validators))
      .toMatchObject({ kind: 'hangar-configuration', dataDropped: 'invalid' });

    const tooLarge = { ok: true, padding: 'x'.repeat(INQUIRY_ATTACHMENT_DATA_LIMIT) };
    const parsed = parseLeadAttachment({ kind: 'grain-brief', data: tooLarge }, 'text', validators);
    expect(parsed).toMatchObject({ kind: 'grain-brief', dataDropped: 'too-large' });
    expect(parsed).not.toHaveProperty('data');
  });

  it('treats data at exactly the limit as within it', () => {
    const padding = 'x'.repeat(INQUIRY_ATTACHMENT_DATA_LIMIT - JSON.stringify({ ok: true, padding: '' }).length);
    const atLimit = { ok: true, padding };
    expect(JSON.stringify(atLimit)).toHaveLength(INQUIRY_ATTACHMENT_DATA_LIMIT);
    expect(parseLeadAttachment({ kind: 'grain-brief', data: atLimit }, 'text', validators)).toHaveProperty('data', atLimit);
  });

  it('gracefully drops pathologically deep data when serialization overflows', () => {
    const root: Record<string, unknown> = { ok: true };
    let cursor = root;
    for (let index = 0; index < 50_000; index += 1) {
      const child: Record<string, unknown> = {};
      cursor.child = child;
      cursor = child;
    }

    expect(() => parseLeadAttachment({ kind: 'grain-brief', data: root }, 'text', validators)).not.toThrow();
    expect(parseLeadAttachment({ kind: 'grain-brief', data: root }, 'text', validators))
      .toMatchObject({ kind: 'grain-brief', dataDropped: 'invalid' });
  });
});
