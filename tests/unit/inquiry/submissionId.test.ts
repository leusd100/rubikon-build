import { describe, expect, it, vi } from 'vitest';
import { createSubmissionId, nextSubmissionIdAfterSuccess } from '../../../app/lib/inquiry/submissionId';

describe('submission id lifecycle', () => {
  it('creates UUIDs when the platform API is available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'platform-id' });
    expect(createSubmissionId()).toBe('platform-id');
    vi.unstubAllGlobals();
  });

  it('keeps fallback ids unique without a pseudorandom generator', () => {
    vi.stubGlobal('crypto', undefined);
    vi.spyOn(Date, 'now').mockReturnValue(123);
    expect(createSubmissionId()).not.toBe(createSubmissionId());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts a new lifecycle with a fresh id after success', () => {
    const createId = vi.fn(() => 'next-id');
    expect(nextSubmissionIdAfterSuccess(createId)).toBe('next-id');
    expect(createId).toHaveBeenCalledOnce();
  });
});
