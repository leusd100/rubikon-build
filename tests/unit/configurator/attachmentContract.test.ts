import { describe, expect, it } from 'vitest';
import {
  INITIAL_HANGAR_ATTACHMENT,
  sameBusinessConfiguration,
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
});
