import { describe, expect, it, vi } from 'vitest';
import { createSubmissionId, nextSubmissionIdAfterSuccess } from '../../../app/lib/inquiry/submissionId';

describe('submission id lifecycle', () => {
  it('creates UUIDs when the platform API is available', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'platform-id' });
    expect(createSubmissionId()).toBe('platform-id');
    vi.unstubAllGlobals();
  });

  it('builds a version-4 UUID from secure random bytes when randomUUID is missing (plain http)', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff) });
    expect(createSubmissionId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    vi.unstubAllGlobals();
  });

  it('gives two keys from real random bytes the UUID v4 shape and different values', () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => real.getRandomValues(bytes) });
    const first = createSubmissionId();
    vi.unstubAllGlobals();
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => real.getRandomValues(bytes) });
    const second = createSubmissionId();
    vi.unstubAllGlobals();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(second).not.toBe(first);
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
