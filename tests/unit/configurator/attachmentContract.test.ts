import { describe, expect, it } from 'vitest';
import {
  INITIAL_HANGAR_ATTACHMENT,
  sameBusinessConfiguration,
  sameDrawnHangar,
  transitionHangarAttachment,
} from '../../../app/lib/configurator/attachmentContract';
import { DEFAULT_CONFIGURATOR_STATE } from '../../../app/lib/configurator/types';

describe('hangar lead attachment contract', () => {
  it('starts untouched and ignores presentation or educational interactions', () => {
    expect(INITIAL_HANGAR_ATTACHMENT.status).toBe('untouched');
    expect(transitionHangarAttachment(INITIAL_HANGAR_ATTACHMENT, { type: 'presentation-only' }))
      .toBe(INITIAL_HANGAR_ATTACHMENT);
  });

  it('attaches after a meaningful business edit and stays attached after values are reverted', () => {
    const changed = transitionHangarAttachment(INITIAL_HANGAR_ATTACHMENT, { type: 'business-edit' });
    const reverted = transitionHangarAttachment(changed, { type: 'business-edit' });

    expect(changed).toEqual({ status: 'attached', reason: 'business-edit' });
    expect(reverted).toEqual({ status: 'attached', reason: 'business-edit' });
  });

  it('attaches explicitly even when the configuration is untouched', () => {
    expect(transitionHangarAttachment(INITIAL_HANGAR_ATTACHMENT, { type: 'explicit-attach' }))
      .toEqual({ status: 'attached', reason: 'explicit-action' });
  });

  it('detaches explicitly, ignores presentation state, and reattaches on the next business edit', () => {
    const attached = transitionHangarAttachment(INITIAL_HANGAR_ATTACHMENT, { type: 'explicit-attach' });
    const detached = transitionHangarAttachment(attached, { type: 'explicit-detach' });
    const presentationOnly = transitionHangarAttachment(detached, { type: 'presentation-only' });
    const edited = transitionHangarAttachment(presentationOnly, { type: 'business-edit' });

    expect(detached).toEqual({ status: 'detached', reason: 'explicit-detach' });
    expect(presentationOnly).toBe(detached);
    expect(edited).toEqual({ status: 'attached', reason: 'business-edit' });
  });

  it('recognises an unchanged business commit without relying on object identity', () => {
    expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, {
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions },
      scope: [...DEFAULT_CONFIGURATOR_STATE.scope],
    })).toBe(true);

    expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, {
      ...DEFAULT_CONFIGURATOR_STATE,
      dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30 },
    })).toBe(false);
  });

  it('counts every «Об’єкт» answer as a business edit, and the unanswered defaults as untouched (03.10)', () => {
    expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, {
      ...DEFAULT_CONFIGURATOR_STATE,
      objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile },
    })).toBe(true);
    for (const answer of [
      { purpose: 'storage' },
      { project: 'ready' },
      { region: 'м. Київ' },
      { lifting: 'none' },
    ] as const) {
      expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, {
        ...DEFAULT_CONFIGURATOR_STATE,
        objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, ...answer },
      }), JSON.stringify(answer)).toBe(false);
    }
  });

  it('compares the ridge as the visitor answered it: the span rule, or a value of their own (04.10)', () => {
    // an unedited ridge's stored value is not part of the configuration: the sizes no longer rewrite it
    expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, { ...DEFAULT_CONFIGURATOR_STATE, ridgeHeightM: 13 })).toBe(true);
    expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, { ...DEFAULT_CONFIGURATOR_STATE, ridgeHeightM: 12, ridgeEdited: true })).toBe(false);
    // an edited 10,6 m does not follow the width as the span rule's does: another answer, though it draws the same today
    // (typing the span rule's own value is the span rule again — withRidge, domainModel.test.ts)
    expect(sameBusinessConfiguration(DEFAULT_CONFIGURATOR_STATE, { ...DEFAULT_CONFIGURATOR_STATE, ridgeEdited: true })).toBe(false);
    // two ridges held to the same end of a low wall's range come back differently once the wall is raised
    const low = { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, height: 4 } };
    expect(sameBusinessConfiguration({ ...low, ridgeHeightM: 11.5, ridgeEdited: true }, { ...low, ridgeHeightM: 12, ridgeEdited: true })).toBe(false);
  });

  it('draws the same hangar when only the «Об’єкт» answers differ, and a different one when the building does', () => {
    const answered = { ...DEFAULT_CONFIGURATOR_STATE, objectProfile: { ...DEFAULT_CONFIGURATOR_STATE.objectProfile, purpose: 'storage' as const } };
    const wider = { ...DEFAULT_CONFIGURATOR_STATE, dimensions: { ...DEFAULT_CONFIGURATOR_STATE.dimensions, width: 30 } };

    expect(sameBusinessConfiguration(answered, DEFAULT_CONFIGURATOR_STATE)).toBe(false);
    expect(sameDrawnHangar(answered, DEFAULT_CONFIGURATOR_STATE)).toBe(true);
    expect(sameDrawnHangar(wider, DEFAULT_CONFIGURATOR_STATE)).toBe(false);
  });
});
