import { afterEach, describe, expect, it, vi } from 'vitest';
import { acknowledgeSavedLead, attemptSubmissionId } from '../../../app/lib/inquiry/submitAttempt';

const parameters = { contact_method: 'telegram', project_direction: 'Ангари та склади' };

afterEach(() => vi.unstubAllGlobals());

const KEY = '0b7c4f3e-2d1a-4c5b-9e8f-7a6b5c4d3e2f';

function browser(granted: boolean, dataLayer: unknown[] = [], hostname = 'rubikonbuild.com') {
  vi.stubGlobal('window', {
    dataLayer,
    location: { hostname },
    localStorage: { getItem: () => JSON.stringify({ analytics: granted ? 'granted' : 'denied', advertising: 'denied' }) },
  });
  return dataLayer;
}

describe('attemptSubmissionId', () => {
  it('takes the key the form holds on the first attempt of a lifecycle', () => {
    const createId = vi.fn(() => 'fresh');
    expect(attemptSubmissionId(null, 'payload', 'held', createId)).toBe('held');
    expect(createId).not.toHaveBeenCalled();
  });

  it('keeps the key for a retry of the same payload', () => {
    const createId = vi.fn(() => 'fresh');
    expect(attemptSubmissionId({ id: 'first', signature: 'payload' }, 'payload', 'held', createId)).toBe('first');
    expect(createId).not.toHaveBeenCalled();
  });

  it('gives a changed payload a new key, never the held one', () => {
    const createId = vi.fn(() => 'fresh');
    expect(attemptSubmissionId({ id: 'first', signature: 'payload' }, 'changed', 'held', createId)).toBe('fresh');
    expect(createId).toHaveBeenCalledOnce();
  });
});

describe('acknowledgeSavedLead', () => {
  it('queues generate_lead once for one lead, however many acknowledgements come', () => {
    const queue = browser(true);
    const acknowledged = new Set<number>();
    acknowledgeSavedLead(7, KEY, acknowledged, parameters);
    acknowledgeSavedLead(7, KEY, acknowledged, parameters);
    expect(queue).toHaveLength(1);
    expect(Array.from(queue[0] as ArrayLike<unknown>)).toEqual(['event', 'generate_lead', { ...parameters, lead_submission_id: KEY }]);
    expect(acknowledged).toEqual(new Set([7]));
  });

  it('marks a lead acknowledged under denied consent, so nothing fires for it later', () => {
    const queue = browser(false);
    const acknowledged = new Set<number>();
    acknowledgeSavedLead(7, KEY, acknowledged, parameters);
    expect(queue).toHaveLength(0);
    expect(acknowledged.has(7)).toBe(true);

    browser(true, queue);
    acknowledgeSavedLead(7, KEY, acknowledged, parameters);
    expect(queue).toHaveLength(0);
  });

  it('sends nothing off the production host and marks the lead, so a later host cannot count it', () => {
    const queue = browser(true, [], 'localhost');
    const acknowledged = new Set<number>();
    acknowledgeSavedLead(7, KEY, acknowledged, parameters);
    expect(queue).toHaveLength(0);
    expect(acknowledged.has(7)).toBe(true);
  });

  it('leaves a lead unmarked when consent was given but the queue rejected the event', () => {
    browser(true, Object.freeze([]) as unknown as unknown[]);
    const acknowledged = new Set<number>();
    acknowledgeSavedLead(7, KEY, acknowledged, parameters);
    expect(acknowledged.size).toBe(0);
  });

  it.each([undefined, 0, -1, Number.NaN])('ignores a response without a real lead id (%s)', (leadId) => {
    const queue = browser(true);
    const acknowledged = new Set<number>();
    acknowledgeSavedLead(leadId, KEY, acknowledged, parameters);
    expect(queue).toHaveLength(0);
    expect(acknowledged.size).toBe(0);
  });
});
