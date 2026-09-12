import { describe, expect, it, vi } from 'vitest';
import { submissionIdAfterAttempt } from '../../../app/lib/inquiry/submissionId';

describe('submission id lifecycle', () => {
  it('keeps the same id for every attempt before a confirmed success', () => {
    const createId = vi.fn(() => 'next-id');
    expect(submissionIdAfterAttempt('current-id', false, createId)).toBe('current-id');
    expect(createId).not.toHaveBeenCalled();
  });

  it('starts a new lifecycle with a fresh id after success', () => {
    const createId = vi.fn(() => 'next-id');
    expect(submissionIdAfterAttempt('current-id', true, createId)).toBe('next-id');
    expect(createId).toHaveBeenCalledOnce();
  });
});
