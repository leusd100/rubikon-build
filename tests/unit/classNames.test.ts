import { describe, expect, it } from 'vitest';
import { classNames } from '../../app/lib/classNames';

describe('classNames', () => {
  it('joins the names it is given', () => {
    expect(classNames('sheet', 'sheet-wide')).toBe('sheet sheet-wide');
  });

  it('skips empty, false, null and undefined names, leaving no stray space', () => {
    expect(classNames('sheet', '', undefined, null, false, 'sheet-wide')).toBe('sheet sheet-wide');
    expect(classNames('sheet', undefined)).toBe('sheet');
  });
});
